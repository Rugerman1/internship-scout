import Anthropic from "@anthropic-ai/sdk";
import firmsJson from "../../config/firms.json";
import type { Env, Firm, Posting } from "../types";
import { fetchGreenhouse } from "../sources/greenhouse";
import { fetchLever } from "../sources/lever";
import { fetchUsaJobs } from "../sources/usajobs";
import { isCivilInternship } from "./filter";
import { dedupe } from "./dedupe";
import * as db from "../db";
import { scorePosting, SCORING_MODEL } from "../scoring/score";
import { sendAlert } from "../notify";

const firms = firmsJson as Firm[];

// Scoring is capped per run so one big day can't run up the API bill or hit
// Cloudflare's per-run request limit. Anything left over is scored tomorrow.
const MAX_SCORED_PER_RUN = 25;

export interface RunSummary {
  fetched: number;
  kept: number;
  newPostings: number;
  scored: number;
  alerted: number;
  errors: string[];
}

// Step 1: pull every source. One failing source doesn't stop the others.
export async function fetchAll(env: Env): Promise<{ postings: Posting[]; errors: string[] }> {
  const jobs: Promise<Posting[]>[] = firms.map((f) =>
    f.board === "greenhouse" ? fetchGreenhouse(f) : fetchLever(f),
  );
  if (env.USAJOBS_API_KEY && env.USAJOBS_EMAIL) jobs.push(fetchUsaJobs(env.USAJOBS_API_KEY, env.USAJOBS_EMAIL));

  const settled = await Promise.allSettled(jobs);
  const postings: Posting[] = [];
  const errors: string[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") postings.push(...s.value);
    else errors.push(String(s.reason?.message ?? s.reason));
  }
  return { postings, errors };
}

// The whole daily job: fetch -> filter -> dedupe -> store -> score -> alert.
export async function runPipeline(env: Env): Promise<RunSummary> {
  const { postings, errors } = await fetchAll(env);
  const kept = dedupe(postings.filter(isCivilInternship));
  const newPostings = await db.upsertPostings(env.DB, kept);

  let scored = 0;
  const resume = await db.getResume(env.DB);
  if (!resume) errors.push("No resume uploaded yet, so nothing was scored.");
  else {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    for (const row of await db.unscored(env.DB, MAX_SCORED_PER_RUN)) {
      try {
        const s = await scorePosting(client, resume, db.rowToPosting(row));
        await db.saveScore(env.DB, row.id, s, SCORING_MODEL);
        scored++;
      } catch (e) {
        errors.push(`Scoring #${row.id}: ${(e as Error).message}`);
      }
    }
  }

  // One notification per run listing every new strong match.
  const minScore = Number(env.ALERT_MIN_SCORE ?? 7);
  const matches = await db.pendingAlerts(env.DB, minScore);
  let alerted = 0;
  if (matches.length > 0) {
    const top = matches.slice(0, 5).map((m) => `${m.score}/10 ${m.title} at ${m.company}`);
    const sent = await sendAlert(env.NTFY_TOPIC, {
      title: `${matches.length} new internship match${matches.length === 1 ? "" : "es"}`,
      body: top.join("\n"),
      url: matches.length === 1 ? matches[0]!.url : undefined,
    });
    if (sent) {
      await db.markAlerted(env.DB, matches.map((m) => m.id));
      alerted = matches.length;
    }
  }

  const summary = { fetched: postings.length, kept: kept.length, newPostings, scored, alerted, errors };
  await env.DB.prepare(
    "INSERT INTO runs (fetched, kept, new_postings, scored, alerted, errors) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(summary.fetched, summary.kept, newPostings, scored, alerted, JSON.stringify(errors))
    .run();
  return summary;
}
