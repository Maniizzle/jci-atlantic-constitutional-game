-- One-time update for databases created before the crossword leaderboard (9 Nov 2026).
-- The old scores table only allowed 'swipe' and 'adventure'. This rebuilds it without that
-- rule and keeps every existing score. Run once in D1 > jci-games > Console.

CREATE TABLE scores_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game        TEXT    NOT NULL,
  mode        TEXT    NOT NULL DEFAULT 'quick',
  name        TEXT    NOT NULL CHECK (length(name) BETWEEN 2 AND 24),
  score       INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  device      TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO scores_new (id, game, mode, name, score, total, duration_ms, device, created_at)
  SELECT id, game, mode, name, score, total, duration_ms, device, created_at FROM scores;
DROP TABLE scores;
ALTER TABLE scores_new RENAME TO scores;
CREATE INDEX IF NOT EXISTS idx_board  ON scores (game, mode, score DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_device ON scores (device, created_at);
