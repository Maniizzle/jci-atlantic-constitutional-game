// GET /api/leaderboard?game=swipe&mode=quick&period=week -> top players (best score each)
import { json, fail, deviceFrom, needDb, GAMES, LIMITS, board, publicRow } from "../../lib/api.js";

export async function onRequestGet({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  const q = new URL(request.url).searchParams;
  const game = q.get("game") || "swipe";
  const g = GAMES[game];
  if (!g) return fail(400, "game");
  const mode = q.get("mode") || Object.keys(g.modes)[0];
  if (!g.modes[mode]) return fail(400, "mode");
  const period = q.get("period") === "all" ? "all" : "week";
  const device = deviceFrom(request);

  const rows = await board(env.DB, game, mode, period);
  const top = rows.slice(0, LIMITS.boardSize).map((r) => publicRow(r, device));
  const meRow = rows.find((r) => r.device === device);
  return json({
    ok: true, game, mode, period,
    lowerIsBetter: g.lowerIsBetter,
    players: rows.length,
    top,
    me: meRow && meRow.rank > LIMITS.boardSize ? publicRow(meRow, device) : null,
  });
}
