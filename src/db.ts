import type { Posting } from "./types";
import { dedupeKey } from "./pipeline/dedupe";
import { ResumeSchema, type Resume } from "./scoring/resume";

// Small helpers around D1 so SQL lives in one file.

export interface PostingRow {
  id: number;
  source: Posting["source"];
  source_id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  description: string;
  posted_at: string | null;
  closes_at: string | null;
  first_seen: string;
  score: number | null;
  score_reasons: string | null;
  score_red_flags: string | null;
  stage: string;
  notes: string;
  alerted_at: string | null;
}

export const STAGES = ["found", "applied", "interview", "offer", "rejected", "skipped"] as const;
export type Stage = (typeof STAGES)[number];

export function rowToPosting(r: PostingRow): Posting {
  return {
    source: r.source,
    sourceId: r.source_id,
    company: r.company,
    title: r.title,
    location: r.location,
    url: r.url,
    description: r.description,
    postedAt: r.posted_at,
    closesAt: r.closes_at,
  };
}

// Insert new postings; for ones we already have, just bump last_seen.
// Returns how many were new.
export async function upsertPostings(db: D1Database, postings: Posting[]): Promise<number> {
  if (postings.length === 0) return 0;
  const before = await db.prepare("SELECT COUNT(*) AS n FROM postings").first<{ n: number }>();
  const stmt = db.prepare(
    `INSERT INTO postings (dedupe_key, source, source_id, company, title, location, url, description, posted_at, closes_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(dedupe_key) DO UPDATE SET last_seen = datetime('now')`,
  );
  await db.batch(
    postings.map((p) =>
      stmt.bind(dedupeKey(p), p.source, p.sourceId, p.company, p.title, p.location, p.url, p.description, p.postedAt, p.closesAt),
    ),
  );
  const after = await db.prepare("SELECT COUNT(*) AS n FROM postings").first<{ n: number }>();
  return (after?.n ?? 0) - (before?.n ?? 0);
}

export async function unscored(db: D1Database, limit: number): Promise<PostingRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM postings WHERE score IS NULL ORDER BY first_seen DESC LIMIT ?")
    .bind(limit)
    .all<PostingRow>();
  return results;
}

export async function saveScore(
  db: D1Database,
  id: number,
  s: { score: number; reasons: string[]; red_flags: string[] },
  model: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE postings SET score = ?, score_reasons = ?, score_red_flags = ?, score_model = ?, scored_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(s.score, JSON.stringify(s.reasons), JSON.stringify(s.red_flags), model, id)
    .run();
}

export async function pendingAlerts(db: D1Database, minScore: number): Promise<PostingRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM postings WHERE score >= ? AND alerted_at IS NULL AND stage = 'found' ORDER BY score DESC")
    .bind(minScore)
    .all<PostingRow>();
  return results;
}

export async function markAlerted(db: D1Database, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const stmt = db.prepare("UPDATE postings SET alerted_at = datetime('now') WHERE id = ?");
  await db.batch(ids.map((id) => stmt.bind(id)));
}

export async function listPostings(db: D1Database): Promise<PostingRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, source, source_id, company, title, location, url, '' AS description, posted_at, closes_at,
              first_seen, score, score_reasons, score_red_flags, stage, notes, alerted_at
       FROM postings ORDER BY (score IS NULL), score DESC, first_seen DESC LIMIT 500`,
    )
    .all<PostingRow>();
  return results;
}

export async function getPosting(db: D1Database, id: number): Promise<PostingRow | null> {
  return db.prepare("SELECT * FROM postings WHERE id = ?").bind(id).first<PostingRow>();
}

export async function setStage(db: D1Database, id: number, stage: Stage, notes?: string): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE postings SET stage = ?, notes = COALESCE(?, notes), stage_updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(stage, notes ?? null, id)
    .run();
  return res.meta.changes > 0;
}

export async function getResume(db: D1Database): Promise<Resume | null> {
  const row = await db.prepare("SELECT json FROM resume WHERE id = 1").first<{ json: string }>();
  return row ? ResumeSchema.parse(JSON.parse(row.json)) : null;
}

export async function putResume(db: D1Database, resume: Resume): Promise<void> {
  await db
    .prepare(
      `INSERT INTO resume (id, json) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = datetime('now')`,
    )
    .bind(JSON.stringify(resume))
    .run();
}
