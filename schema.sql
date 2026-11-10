-- JCI Atlantic Constitution Games: D1 schema (fresh database).
-- Run once in the Cloudflare dashboard: D1 > jci-games > Console.
-- Existing database? Run the files in migrations/ instead, in order.

-- One row per player (device). name_key is the cleaned, lowercased name;
-- UNIQUE means the database itself refuses a name another device owns.
CREATE TABLE IF NOT EXISTS players (
  device     TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every game played, official or practice. The server holds the answers and marks each move.
-- slot is set only on official rounds (see slotFor in src/lib.js).
CREATE TABLE IF NOT EXISTS rounds (
  id         TEXT PRIMARY KEY,
  device     TEXT NOT NULL,
  game       TEXT NOT NULL,
  mode       TEXT NOT NULL,
  month      TEXT NOT NULL,
  slot       TEXT,
  total      INTEGER NOT NULL,
  state      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  last_at    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rounds_device ON rounds (device, created_at);
CREATE INDEX IF NOT EXISTS idx_rounds_slot   ON rounds (device, slot);

-- Official results only, written by the server when an official round ends.
-- swipe:     score = correct answers, one per mode per month (slot swipe:quick:2026-11)
-- adventure: score = slip-ups (lower is better), first run ever
-- crossword: score = points on one puzzle (mode = puzzle id), first finish only
CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game        TEXT    NOT NULL,
  mode        TEXT    NOT NULL DEFAULT 'quick',
  name        TEXT    NOT NULL CHECK (length(name) BETWEEN 2 AND 24),
  score       INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  device      TEXT    NOT NULL,
  month       TEXT,
  slot        TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_board  ON scores (game, mode, month, score DESC);
CREATE INDEX IF NOT EXISTS idx_device ON scores (device, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot ON scores (device, slot);
