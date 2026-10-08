// Checks the scorer against your own judgment.
//
// 1. Download a sample of real postings from your deployed tracker:
//      curl -u any:YOUR_APP_PASSWORD https://<your-worker>/api/eval-sample > eval/labeled.json
// 2. Open eval/labeled.json and replace each "my_score": null with the score
//    YOU would give (1-10), using the same rubric as src/scoring/rubric.ts.
// 3. Run: ANTHROPIC_API_KEY=... npm run eval
//
// It scores every posting twice and reports how close the model is to you
// and how much it disagrees with itself between runs.
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { ResumeSchema } from "../src/scoring/resume";
import { scorePosting, SCORING_MODEL } from "../src/scoring/score";
import { RUBRIC_VERSION } from "../src/scoring/rubric";
import type { Posting } from "../src/types";

type Labeled = Posting & { my_score: number | null };

const resumePath = process.argv[2] ?? "config/resume.json";
const resume = ResumeSchema.parse(JSON.parse(await readFile(resumePath, "utf8")));
const items = (JSON.parse(await readFile("eval/labeled.json", "utf8")) as Labeled[]).filter(
  (i) => typeof i.my_score === "number",
);
if (items.length === 0) throw new Error("No labeled postings: fill in my_score in eval/labeled.json first.");

const client = new Anthropic();
const rows: { title: string; mine: number; a: number; b: number }[] = [];
for (const item of items) {
  const [a, b] = await Promise.all([scorePosting(client, resume, item), scorePosting(client, resume, item)]);
  rows.push({ title: `${item.title} @ ${item.company}`, mine: item.my_score!, a: a.score, b: b.score });
  process.stdout.write(".");
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const mae = avg(rows.map((r) => Math.abs((r.a + r.b) / 2 - r.mine)));
const within1 = rows.filter((r) => Math.abs(r.a - r.mine) <= 1).length / rows.length;
const drift = avg(rows.map((r) => Math.abs(r.a - r.b)));
// Does the model agree with you on which postings deserve an alert (>= 7)?
const alertAgree = rows.filter((r) => (r.a >= 7) === (r.mine >= 7)).length / rows.length;

console.log(`\n\nModel ${SCORING_MODEL}, rubric ${RUBRIC_VERSION}, ${rows.length} postings`);
console.log(`Average distance from your score:  ${mae.toFixed(2)} points`);
console.log(`Within 1 point of you:             ${(within1 * 100).toFixed(0)}%`);
console.log(`Same alert decision as you:        ${(alertAgree * 100).toFixed(0)}%`);
console.log(`Run-to-run drift:                  ${drift.toFixed(2)} points`);
console.log("\nBiggest disagreements:");
for (const r of [...rows].sort((x, y) => Math.abs(y.a - y.mine) - Math.abs(x.a - x.mine)).slice(0, 5)) {
  console.log(`  you ${r.mine}, model ${r.a}/${r.b}  ${r.title}`);
}
