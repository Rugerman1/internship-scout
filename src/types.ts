// One job posting after normalization. Every source (Greenhouse, Lever,
// USAJOBS) is converted into this shape so the rest of the app only has to
// understand one format.
export interface Posting {
  source: "greenhouse" | "lever" | "usajobs";
  sourceId: string; // the posting's id inside its source
  company: string;
  title: string;
  location: string;
  url: string;
  description: string; // plain text, HTML stripped
  postedAt: string | null; // ISO date
  closesAt: string | null; // ISO date, when the source gives one
}

// A target employer from config/firms.json.
export interface Firm {
  name: string;
  board: "greenhouse" | "lever";
  slug: string; // the board token, e.g. boards.greenhouse.io/<slug>
  region?: string;
  notes?: string;
}

// Bindings Cloudflare passes to the Worker (see wrangler.toml).
export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  USAJOBS_API_KEY?: string;
  USAJOBS_EMAIL?: string; // USAJOBS asks for your email as the User-Agent
  NTFY_TOPIC?: string; // optional: phone alerts through the ntfy app
  APP_PASSWORD: string; // protects the tracker page
  ALERT_MIN_SCORE?: string; // default 7
}
