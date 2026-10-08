import type { Firm, Posting } from "../types";
import { htmlToText } from "./html";

// Greenhouse's public job board API. No key needed.
// Docs: https://developers.greenhouse.io/job-board.html
interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
}

export function greenhouseUrl(slug: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
}

export function parseGreenhouse(firm: Firm, body: { jobs?: GreenhouseJob[] }): Posting[] {
  return (body.jobs ?? []).map((j) => ({
    source: "greenhouse",
    sourceId: String(j.id),
    company: firm.name,
    title: j.title.trim(),
    location: j.location?.name?.trim() ?? "",
    url: j.absolute_url,
    description: htmlToText(j.content ?? ""),
    postedAt: j.updated_at ?? null,
    closesAt: null,
  }));
}

export async function fetchGreenhouse(firm: Firm): Promise<Posting[]> {
  const res = await fetch(greenhouseUrl(firm.slug));
  if (!res.ok) throw new Error(`Greenhouse ${firm.slug}: HTTP ${res.status}`);
  return parseGreenhouse(firm, await res.json());
}
