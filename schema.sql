-- JCI Atlantic Constitution Games: D1 schema.
-- Run once in the Cloudflare dashboard: D1 > jci-games > Console.

-- One row per player (device). name_key is the cleaned, lowercased name;
-- UNIQUE means the database itself refuses a name another device owns.
CREATE TABLE IF NOT EXISTS players (
  device     TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per finished game.
-- swipe:     score = correct answers, total = cards played (10 or 32)
-- adventure: score = slip-ups (lower is better), total = scenes (12)
-- crossword: score = points on one puzzle (mode = puzzle id), first finish only
CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game        TEXT    NOT NULL,                 -- swipe | adventure | crossword (checked by the server)
  mode        TEXT    NOT NULL DEFAULT 'quick',
  name        TEXT    NOT NULL CHECK (length(name) BETWEEN 2 AND 24),
  score       INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  device      TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_board  ON scores (game, mode, score DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_device ON scores (device, created_at);
