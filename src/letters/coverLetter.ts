import Anthropic from "@anthropic-ai/sdk";
import type { Posting } from "../types";
import type { Resume } from "../scoring/resume";
import { postingPrompt } from "../scoring/score";

export const LETTER_MODEL = "claude-sonnet-5-5";

const INSTRUCTIONS = `Write a cover letter draft for the student below, for the posting below.

Hard rules:
- Use only facts that appear in the resume JSON. Never invent experience, skills, coursework, numbers, or dates.
- If the posting asks for something the resume doesn't show, don't claim it. You may say the student is eager to learn it.
- Mention the company and role by name and connect 2-3 specific resume facts to specific parts of the posting.
- 250-350 words, plain professional tone, no clichés like "I am writing to express my interest".
- Output only the letter text, starting with "Dear Hiring Team," and ending with the student's name.`;

export async function draftCoverLetter(
  client: Anthropic,
  resume: Resume,
  posting: Posting,
): Promise<string> {
  const response = await client.beta.messages.create({
    model: LETTER_MODEL,
    max_tokens: 16000,
    // If a safety check ever declines the request, the API retries it on a
    // suitable fallback model instead of returning nothing.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: `Resume (JSON):\n${JSON.stringify(resume, null, 2)}\n\nPosting:\n${postingPrompt(posting)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The letter request was declined");
  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
  if (!text) throw new Error(`No letter text returned (stop_reason: ${response.stop_reason})`);
  return text;
}
