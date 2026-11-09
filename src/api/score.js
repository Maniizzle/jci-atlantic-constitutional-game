// POST /api/score {game, mode, score, total, duration_ms} -> save one finished game
import { json, fail, deviceFrom, sameOrigin, readJson, needDb, GAMES, LIMITS, board } from "../lib.js";

const MAX_MS = 3 * 60 * 60 * 1000;
const int = (v) => (Number.isInteger(v) ? v : NaN);

export async function onRequestPost({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  if (!sameOrigin(request)) return fail(403, "origin");
  const device = deviceFrom(request);
  if (!device) return fail(400, "device");
  const b = await readJson(request);
  if (!b) return fail(400, "body");

  // Validate against the game's rules
  const g = GAMES[b.game];
  if (!g) return fail(400, "game");
  const total = g.modes[b.mode];
  if (!total) return fail(400, "mode");
  const score = int(b.score), ms = int(b.duration_ms);
  if (int(b.total) !== total || !g.check(score, total)) return fail(400, "score");
  if (!(ms >= g.minMs(b.mode, total) && ms <= MAX_MS)) return fail(400, "duration");

  // The name comes from the server's own record, never from the request
  const player = await env.DB.prepare("SELECT name FROM players WHERE device = ?1").bind(device).first();
  if (!player) return fail(403, "no-name");

  const recent = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM scores WHERE device = ?1 AND created_at >= datetime('now','-1 hour')")
    .bind(device)
    .first();
  if (recent.n >= LIMITS.scoresPerHour) return fail(429, "slow-down");

  if (g.firstOnly) {
    const before = await env.DB
      .prepare("SELECT id FROM scores WHERE device = ?1 AND game = ?2 AND mode = ?3 LIMIT 1")
      .bind(device, b.game, b.mode)
      .first();
    if (before) return fail(409, "already-played");
  }

  await env.DB
    .prepare("INSERT INTO scores (game, mode, name, score, total, duration_ms, device) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
    .bind(b.game, b.mode, player.name, score, total, ms, device)
    .run();

  const [week, all] = await Promise.all([board(env.DB, b.game, b.mode, "week"), board(env.DB, b.game, b.mode, "all")]);
  // (for the crossword, board() ranks total points across all puzzles)
  const mine = (rows) => rows.find((r) => r.device === device) || null;
  const w = mine(week), a = mine(all);
  return json({
    ok: true,
    week: w && { rank: w.rank, of: week.length, best: w.score },
    all: a && { rank: a.rank, of: all.length, best: a.score },
  });
}
