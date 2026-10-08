import type { Posting } from "../types";

// The same internship often appears on more than one board, or gets
// re-posted with a new id. Two postings are treated as duplicates when the
// company, title and location match after normalizing.

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\binternship\b/g, "intern")
    .replace(/\bco-op\b/g, "coop")
    .replace(/\b(20\d\d)\b/g, "") // "Summer 2027 Intern" == "Summer Intern"
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normCompany(s: string): string {
  return norm(s).replace(/\b(inc|llc|corp|corporation|co|company|pc|pllc|group)\b/g, "").trim();
}

// Only the first place listed, at city level ("Columbia, SC, USA" -> "columbia sc").
function normLocation(s: string): string {
  const first = s.split(/;|\bor\b|\|/)[0] ?? "";
  return norm(first).replace(/\b(usa|us|united states)\b/g, "").trim();
}

export function dedupeKey(p: Posting): string {
  return [normCompany(p.company), norm(p.title), normLocation(p.location)].join("|");
}

export function dedupe(postings: Posting[]): Posting[] {
  const seen = new Map<string, Posting>();
  for (const p of postings) {
    const key = dedupeKey(p);
    const prev = seen.get(key);
    // Keep the copy with the longer description; it gives the scorer more to go on.
    if (!prev || p.description.length > prev.description.length) seen.set(key, p);
  }
  return [...seen.values()];
}
