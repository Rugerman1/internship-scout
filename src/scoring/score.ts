import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Posting } from "../types";
import type { Resume } from "./resume";
import { RUBRIC } from "./rubric";

export const SCORING_MODEL = "claude-haiku-5-5";

// The shape Claude must answer in. Structured outputs guarantee the reply
// is valid JSON in exactly this shape, so there's no fragile text parsing.
export const ScoreSchema = z.object({
  score: z.number().int(),
  eligible: z.boolean(),
  reasons: z.array(z.string()),
  red_flags: z.array(z.string()),
});
export type Score = z.infer<typeof ScoreSchema>;

// Descriptions can be very long; the useful part (duties + requirements) is
// near the top. 6,000 characters is about 1,500 tokens.
const MAX_DESCRIPTION_CHARS = 6000;

export function postingPrompt(p: Posting): string {
  return [
    `Company: ${p.company}`,
    `Title: ${p.title}`,
    `Location: ${p.location || "not listed"}`,
    p.closesAt ? `Application closes: ${p.closesAt}` : "",
    "",
    "Description:",
    p.description.slice(0, MAX_DESCRIPTION_CHARS),
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export async function scorePosting(
  client: Anthropic,
  resume: Resume,
  posting: Posting,
): Promise<Score> {
  const response = await client.messages.parse({
    model: SCORING_MODEL,
    max_tokens: 4000,
    // The rubric and resume are identical for every posting, so they sit in
    // the system prompt where they can be cached between calls.
    system: [
      {
        type: "text",
        text: `${RUBRIC}\n\nStudent resume (JSON):\n${JSON.stringify(resume, null, 2)}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: postingPrompt(posting) }],
    output_config: { effort: "medium", format: zodOutputFormat(ScoreSchema) },
  });

  if (response.stop_reason === "refusal") throw new Error("Scorer declined this posting");
  const out = response.parsed_output;
  if (!out) throw new Error(`Scorer returned no parseable output (stop_reason: ${response.stop_reason})`);
  // The schema can't enforce 1-10, so clamp here.
  return { ...out, score: Math.min(10, Math.max(1, Math.round(out.score))) };
}
