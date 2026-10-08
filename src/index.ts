import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "./types";
import * as db from "./db";
import { runPipeline } from "./pipeline/run";
import { ResumeSchema } from "./scoring/resume";
import { draftCoverLetter, LETTER_MODEL } from "./letters/coverLetter";
import { PAGE } from "./ui/page";

// Entry point. Cloudflare calls `scheduled` on the cron in wrangler.toml and
// `fetch` for every web request to the tracker.
export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runPipeline(env).then((s) => console.log("run", JSON.stringify(s))));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    if (!authorized(req, env)) {
      return new Response("Password required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Internship Scout"' },
      });
    }
    try {
      return await route(req, env);
    } catch (e) {
      console.error(e);
      return json({ error: (e as Error).message }, 500);
    }
  },
};

// The tracker holds your applications, so it sits behind a password.
// Your browser shows its own login box; any username works.
function authorized(req: Request, env: Env): boolean {
  if (!env.APP_PASSWORD) return false;
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  const [, password] = atob(header.slice(6)).split(":");
  return password === env.APP_PASSWORD;
}

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === "GET" && path === "/") {
    return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (method === "GET" && path === "/api/postings") {
    return json(await db.listPostings(env.DB));
  }
  if (method === "PUT" && path === "/api/resume") {
    const parsed = ResumeSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.issues }, 400);
    await db.putResume(env.DB, parsed.data);
    return json({ ok: true });
  }
  if (method === "GET" && path === "/api/eval-sample") {
    // 30 random postings with full text, for labeling in eval/labeled.json.
    const { results } = await env.DB.prepare(
      `SELECT source, source_id AS sourceId, company, title, location, url, description,
              posted_at AS postedAt, closes_at AS closesAt, NULL AS my_score
       FROM postings ORDER BY RANDOM() LIMIT 30`,
    ).all();
    return json(results);
  }
  if (method === "POST" && path === "/api/run") {
    return json(await runPipeline(env));
  }

  const m = path.match(/^\/api\/postings\/(\d+)\/(stage|letter)$/);
  if (m && method === "POST") {
    const id = Number(m[1]);
    if (m[2] === "stage") {
      const body = (await req.json()) as { stage?: string; notes?: string };
      if (!db.STAGES.includes(body.stage as db.Stage)) return json({ error: "Unknown stage" }, 400);
      const ok = await db.setStage(env.DB, id, body.stage as db.Stage, body.notes);
      return ok ? json({ ok: true }) : json({ error: "Not found" }, 404);
    }
    // Cover letter: only when you ask for one, never automatically.
    const [row, resume] = await Promise.all([db.getPosting(env.DB, id), db.getResume(env.DB)]);
    if (!row) return json({ error: "Not found" }, 404);
    if (!resume) return json({ error: "Upload your resume first" }, 400);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const letter = await draftCoverLetter(client, resume, db.rowToPosting(row));
    await env.DB.prepare("INSERT INTO letters (posting_id, body, model) VALUES (?, ?, ?)")
      .bind(id, letter, LETTER_MODEL)
      .run();
    return json({ letter });
  }

  return json({ error: "Not found" }, 404);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
