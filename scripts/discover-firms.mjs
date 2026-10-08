// Finds which job board each candidate firm uses.
// Run on your own computer: npm run discover
// For every slug in config/firm-candidates.json it asks Greenhouse and Lever
// whether a board exists, then writes the hits to config/firms.json.
import { readFile, writeFile } from "node:fs/promises";

const { candidates } = JSON.parse(await readFile("config/firm-candidates.json", "utf8"));

const BOARDS = {
  greenhouse: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`,
  lever: (s) => `https://api.lever.co/v0/postings/${s}?mode=json&limit=1`,
};

async function probe(board, slug) {
  try {
    const res = await fetch(BOARDS[board](slug));
    if (!res.ok) return null;
    const body = await res.json();
    const count = Array.isArray(body) ? body.length : (body.jobs?.length ?? 0);
    return { count };
  } catch {
    return null;
  }
}

const found = [];
for (const c of candidates) {
  let hit = null;
  for (const slug of c.slugs) {
    for (const board of Object.keys(BOARDS)) {
      const r = await probe(board, slug);
      if (r) { hit = { name: c.name, board, slug, region: c.region }; break; }
    }
    if (hit) break;
  }
  console.log(hit ? `✓ ${c.name}: ${hit.board}/${hit.slug}` : `✗ ${c.name}: no Greenhouse or Lever board (check their careers page)`);
  if (hit) found.push(hit);
}

await writeFile("config/firms.json", JSON.stringify(found, null, 2) + "\n");
console.log(`\nWrote ${found.length} of ${candidates.length} firms to config/firms.json`);
