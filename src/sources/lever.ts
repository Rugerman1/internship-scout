import type { Firm, Posting } from "../types";

// Lever's public postings API. No key needed.
// Docs: https://github.com/lever/postings-api
interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number; // milliseconds since 1970
  categories?: { location?: string; commitment?: string; team?: string };
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text: string; content: string }[];
}

export function leverUrl(slug: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
}

export function parseLever(firm: Firm, body: LeverPosting[]): Posting[] {
  return body.map((p) => ({
    source: "lever",
    sourceId: p.id,
    company: firm.name,
    title: p.text.trim(),
    location: p.categories?.location?.trim() ?? "",
    url: p.hostedUrl,
    description: [
      p.categories?.commitment ? `Commitment: ${p.categories.commitment}` : "",
      p.descriptionPlain ?? "",
      ...(p.lists ?? []).map((l) => `${l.text}\n${l.content.replace(/<[^>]+>/g, " ")}`),
      p.additionalPlain ?? "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim(),
    postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    closesAt: null,
  }));
}

export async function fetchLever(firm: Firm): Promise<Posting[]> {
  const res = await fetch(leverUrl(firm.slug));
  if (!res.ok) throw new Error(`Lever ${firm.slug}: HTTP ${res.status}`);
  return parseLever(firm, await res.json());
}
