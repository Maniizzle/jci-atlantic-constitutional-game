// GET /api/leaderboard?game=swipe&mode=quick&period=month|all -> top players
import { json, fail, deviceFrom, needDb, LIMITS, board, boardInfo, publicRow, monthKey } from "../lib.js";

const MODES = { swipe: ["quick", "full"], adventure: ["story"], crossword: ["total"] };

export async function onRequestGet({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  const q = new URL(request.url).searchParams;
  const game = q.get("game") || "swipe";
  const info = boardInfo(game);
  if (!info) return fail(400, "game");
  const mode = info.byMode ? q.get("mode") || MODES[game][0] : MODES[game][0];
  if (!MODES[game].includes(mode)) return fail(400, "mode");
  const period = q.get("period") === "all" ? "all" : "month";
  const device = deviceFrom(request);

  const rows = await board(env.DB, game, mode, period);
  const top = rows.slice(0, LIMITS.boardSize).map((r) => publicRow(r, device));
  const meRow = rows.find((r) => r.device === device);
  return json({
    ok: true, game, mode, period, month: monthKey(),
    lowerIsBetter: info.lowerIsBetter,
    summed: info.agg(period) === "sum",
    players: rows.length,
    top,
    me: meRow && meRow.rank > LIMITS.boardSize ? publicRow(meRow, device) : null,
  });
}
