-- Update for databases set up before server-marked rounds (10 Nov 2026).
-- Run once in D1 > jci-games > Console. Works whether or not 001 was run before.
--
-- Existing scores are kept and converted to the official-round rules:
--   swipe:     each player's first round of each type in each month (Lagos time)
--   adventure: each player's first run
--   crossword: each player's first finish of each puzzle
-- Later replays in the same slot are removed. Player names are untouched.

CREATE TABLE scores_new (
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

INSERT INTO scores_new (id, game, mode, name, score, total, duration_ms, device, created_at, month, slot)
SELECT id, game, mode, name, score, total, duration_ms, device, created_at,
       strftime('%Y-%m', created_at, '+1 hour'),
       CASE game
         WHEN 'swipe'     THEN 'swipe:' || mode || ':' || strftime('%Y-%m', created_at, '+1 hour')
         WHEN 'adventure' THEN 'adventure:story'
         ELSE 'crossword:' || mode
       END
FROM scores;

-- Keep only the first score in each slot (lowest id = earliest)
DELETE FROM scores_new
WHERE id NOT IN (SELECT MIN(id) FROM scores_new GROUP BY device, slot);

DROP TABLE scores;
ALTER TABLE scores_new RENAME TO scores;
CREATE INDEX IF NOT EXISTS idx_board  ON scores (game, mode, month, score DESC);
CREATE INDEX IF NOT EXISTS idx_device ON scores (device, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot ON scores (device, slot);

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
