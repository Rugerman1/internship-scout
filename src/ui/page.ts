// The tracker page: one HTML file with a little JavaScript, no build step.
export const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Internship Scout</title>
<style>
  :root { --bg:#f6f5f2; --card:#fff; --ink:#1d1d1b; --muted:#6b6a65; --line:#e3e1dc;
          --accent:#f56600; --good:#1f7a4d; --mid:#a86b00; --low:#9a3b3b; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#161614; --card:#20201e; --ink:#eeede9; --muted:#a3a19a; --line:#34332f; }
  }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.45 system-ui, -apple-system, Segoe UI, sans-serif; background:var(--bg); color:var(--ink); }
  header { padding:20px 16px 8px; max-width:960px; margin:0 auto; display:flex; gap:12px; align-items:baseline; flex-wrap:wrap; }
  h1 { font-size:22px; margin:0; } h1 span { color:var(--accent); }
  .sub { color:var(--muted); font-size:13px; }
  nav { max-width:960px; margin:0 auto; padding:8px 16px; display:flex; gap:6px; flex-wrap:wrap; }
  nav button { border:1px solid var(--line); background:var(--card); color:var(--ink); padding:6px 12px; border-radius:999px; cursor:pointer; font:inherit; font-size:13px; }
  nav button.on { background:var(--ink); color:var(--bg); border-color:var(--ink); }
  main { max-width:960px; margin:0 auto; padding:8px 16px 40px; display:grid; gap:10px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; display:grid; grid-template-columns:52px 1fr; gap:14px; }
  .score { width:52px; height:52px; border-radius:10px; display:grid; place-items:center; font-weight:700; font-size:20px; color:#fff; }
  .s-hi { background:var(--good); } .s-mid { background:var(--mid); } .s-lo { background:var(--low); } .s-none { background:var(--line); color:var(--muted); font-size:13px; }
  .title { font-weight:600; } .title a { color:inherit; }
  .meta { color:var(--muted); font-size:13px; margin:2px 0 6px; }
  ul { margin:4px 0; padding-left:18px; } li { margin:1px 0; }
  .flag { color:var(--low); }
  .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px; }
  select, .btn { font:inherit; font-size:13px; padding:5px 10px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--ink); cursor:pointer; }
  .empty { color:var(--muted); text-align:center; padding:40px 0; }
  dialog { max-width:640px; width:calc(100% - 32px); border:1px solid var(--line); border-radius:12px; background:var(--card); color:var(--ink); }
  dialog pre { white-space:pre-wrap; font:inherit; }
  @media (max-width:520px) { .card { grid-template-columns:40px 1fr; gap:10px; padding:12px; } .score { width:40px; height:40px; font-size:16px; } }
</style>
</head>
<body>
<header><h1>Internship <span>Scout</span></h1><div class="sub" id="summary"></div></header>
<nav id="tabs"></nav>
<main id="list"><div class="empty">Loading…</div></main>
<dialog id="letter"><pre id="letterText"></pre>
  <div class="row"><button class="btn" id="copy">Copy</button><button class="btn" onclick="this.closest('dialog').close()">Close</button></div>
</dialog>
<script>
const STAGES = ["found","applied","interview","offer","rejected","skipped"];
let postings = [], tab = "found";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const band = (s) => s == null ? "s-none" : s >= 7 ? "s-hi" : s >= 5 ? "s-mid" : "s-lo";

async function load() {
  postings = await (await fetch("/api/postings")).json();
  render();
}

function render() {
  const counts = Object.fromEntries(STAGES.map((s) => [s, postings.filter((p) => p.stage === s).length]));
  document.getElementById("summary").textContent =
    postings.length + " internships tracked · " + postings.filter((p) => p.score >= 7).length + " strong matches";
  document.getElementById("tabs").innerHTML = STAGES.map((s) =>
    '<button class="' + (s === tab ? "on" : "") + '" data-tab="' + s + '">' + s[0].toUpperCase() + s.slice(1) + " (" + counts[s] + ")</button>").join("");
  const shown = postings.filter((p) => p.stage === tab);
  document.getElementById("list").innerHTML = shown.length ? shown.map(card).join("") : '<div class="empty">Nothing here yet.</div>';
}

function card(p) {
  const reasons = JSON.parse(p.score_reasons || "[]"), flags = JSON.parse(p.score_red_flags || "[]");
  return '<div class="card"><div class="score ' + band(p.score) + '">' + (p.score ?? "new") + '</div><div>' +
    '<div class="title"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a></div>' +
    '<div class="meta">' + esc(p.company) + " · " + esc(p.location || "Location not listed") + " · via " + esc(p.source) +
      (p.closes_at ? " · closes " + esc(p.closes_at.slice(0, 10)) : "") + '</div>' +
    (reasons.length ? "<ul>" + reasons.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" : "") +
    (flags.length ? '<ul class="flag">' + flags.map((r) => "<li>⚠ " + esc(r) + "</li>").join("") + "</ul>" : "") +
    '<div class="row"><select data-stage="' + p.id + '">' +
      STAGES.map((s) => "<option" + (s === p.stage ? " selected" : "") + ">" + s + "</option>").join("") +
    '</select><button class="btn" data-letter="' + p.id + '">Draft cover letter</button></div></div></div>';
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); }
  if (t.dataset.letter) {
    t.disabled = true; t.textContent = "Writing…";
    const r = await (await fetch("/api/postings/" + t.dataset.letter + "/letter", { method: "POST" })).json();
    t.disabled = false; t.textContent = "Draft cover letter";
    document.getElementById("letterText").textContent = r.letter || r.error;
    document.getElementById("letter").showModal();
  }
  if (t.id === "copy") navigator.clipboard.writeText(document.getElementById("letterText").textContent);
});

document.addEventListener("change", async (e) => {
  const id = e.target.dataset.stage;
  if (!id) return;
  await fetch("/api/postings/" + id + "/stage", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage: e.target.value }) });
  postings.find((p) => p.id == id).stage = e.target.value;
  render();
});

load();
</script>
</body>
</html>`;
