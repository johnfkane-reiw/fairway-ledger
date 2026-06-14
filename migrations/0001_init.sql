-- Fairway Ledger schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS golfers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tees (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  name      TEXT NOT NULL,
  rating    REAL NOT NULL,
  slope     INTEGER NOT NULL,
  par       INTEGER NOT NULL,
  holes     TEXT      -- JSON array of {par, si}, or NULL for total-only tees
);
CREATE INDEX IF NOT EXISTS idx_tees_course ON tees(course_id);

CREATE TABLE IF NOT EXISTS scores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  golfer_id      INTEGER NOT NULL,
  course_id      INTEGER NOT NULL,
  tee_id         INTEGER NOT NULL,
  date           TEXT NOT NULL,        -- YYYY-MM-DD
  pcc            INTEGER DEFAULT 0,
  adjusted_gross INTEGER,              -- when entered as a total
  hole_scores    TEXT,                 -- JSON array of per-hole gross, or NULL
  posted_by      TEXT,                 -- Cloudflare Access email, when enabled
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scores_golfer ON scores(golfer_id);

CREATE TABLE IF NOT EXISTS leagues (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id INTEGER NOT NULL,
  golfer_id INTEGER NOT NULL,
  PRIMARY KEY (league_id, golfer_id)
);
