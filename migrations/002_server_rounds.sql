-- Update for databases set up before server-marked rounds (10 Nov 2026).
-- Run once in D1 > jci-games > Console, after 001_allow_crossword.sql.
--
-- Scores saved under the old rules came from the browser and could include replays,
-- so they are cleared here. Player names are kept.

DELETE FROM scores;
ALTER TABLE scores ADD COLUMN month TEXT;
ALTER TABLE scores ADD COLUMN slot TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot ON scores (device, slot);
DROP INDEX IF EXISTS idx_board;
CREATE INDEX IF NOT EXISTS idx_board ON scores (game, mode, month, score DESC);

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
