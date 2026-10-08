-- Every posting we have seen, one row per unique internship.
CREATE TABLE postings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  posted_at TEXT,
  closes_at TEXT,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),

  -- Filled in by the scorer.
  score INTEGER,
  score_reasons TEXT,     -- JSON array of strings
  score_red_flags TEXT,   -- JSON array of strings
  score_model TEXT,
  scored_at TEXT,
  alerted_at TEXT,

  -- Application tracker.
  stage TEXT NOT NULL DEFAULT 'found'
    CHECK (stage IN ('found', 'applied', 'interview', 'offer', 'rejected', 'skipped')),
  stage_updated_at TEXT,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX postings_score ON postings(score DESC);
CREATE INDEX postings_stage ON postings(stage);

-- Single-row table holding your resume as JSON.
CREATE TABLE resume (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cover letter drafts. Kept so you can come back to them.
CREATE TABLE letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  posting_id INTEGER NOT NULL REFERENCES postings(id),
  body TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per daily run, so you can see what each run did.
CREATE TABLE runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  fetched INTEGER NOT NULL DEFAULT 0,
  kept INTEGER NOT NULL DEFAULT 0,
  new_postings INTEGER NOT NULL DEFAULT 0,
  scored INTEGER NOT NULL DEFAULT 0,
  alerted INTEGER NOT NULL DEFAULT 0,
  errors TEXT NOT NULL DEFAULT '[]'
);
