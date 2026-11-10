// Shared helpers for the API in src/api. The database is the D1 binding named DB (see wrangler.jsonc).

export const LIMITS = {
  roundsPerHour: 60,      // rounds a device may start per hour (official + practice)
  boardSize: 20,
};

// Months run on Lagos time (UTC+1): "2026-11".
export function monthKey(t = Date.now()) {
  return new Date(t + 3600e3).toISOString().slice(0, 7);
}

// Which leaderboard slot an official round fills. One score per device per slot.
//   swipe:     first round of each mode each month
//   adventure: first run ever
//   crossword: first finish of each puzzle
export function slotFor(game, mode, month) {
  if (game === "swipe") return `swipe:${mode}:${month}`;
  if (game === "adventure") return "adventure:story";
  return `crossword:${mode}`;
}

// Names we never show on the board.
// Whole words only, so real names like "Odebunmi" or "Dickson" are fine.
const BLOCKED_WORDS = ["shit", "bitch", "dick", "pussy", "whore", "slut", "ashawo", "olosho", "oloshi",
  "mumu", "ode", "werey", "idiot", "stupid", "admin", "moderator", "president"];
// Anywhere inside the name.
const BLOCKED_PARTS = ["fuck", "cunt", "nigger", "nigga", "jciofficial"];

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export function fail(status, error, extra = {}) {
  return json({ ok: false, error, ...extra }, status);
}

// The device id is a random value made on the player's phone. It works like a password
// for that player's name, so it travels in a header (not the URL) and is never sent back out.
export function deviceFrom(request) {
  const d = (request.headers.get("x-device") || "").trim().toLowerCase();
  return /^[a-z0-9-]{20,40}$/.test(d) ? d : null;
}

export function cleanName(raw) {
  return String(raw ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

export function nameKey(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]/gu, "");
}

// Returns an error code, or null when the name is acceptable.
export function nameProblem(name) {
  if (name.length < 2 || name.length > 24) return "length";
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} .'’\-]*$/u.test(name)) return "characters";
  const key = nameKey(name);
  if (key.length < 2) return "length";
  const words = name.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  if (words.some((w) => BLOCKED_WORDS.includes(w)) || BLOCKED_PARTS.some((p) => key.includes(p))) return "blocked";
  return null;
}

// Only accept writes from pages on this same site.
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // some browsers omit it on same-origin requests
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function readJson(request, max = 2000) {
  const text = await request.text();
  if (text.length > max) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export function needDb(env) {
  return env && env.DB ? null : fail(503, "not-configured");
}

// How each board ranks. "single": one official score per player in the period.
// "sum": official scores added up (each month's Swipe round, or every crossword puzzle).
const BOARDS = {
  swipe:     { byMode: true,  lowerIsBetter: false, agg: (period) => (period === "month" ? "single" : "sum") },
  adventure: { byMode: false, lowerIsBetter: true,  agg: () => "single" },
  crossword: { byMode: false, lowerIsBetter: false, agg: () => "sum" },
};

export function boardInfo(game) { return BOARDS[game] || null; }

// Ranked rows for one board. Device ids are used for ranking only and never sent out.
export async function board(db, game, mode, period) {
  const b = BOARDS[game];
  const dir = b.lowerIsBetter ? "ASC" : "DESC";
  const where = ["s.game = ?1"], args = [game];
  if (b.byMode) { where.push(`s.mode = ?${args.length + 1}`); args.push(mode); }
  if (period === "month") { where.push(`s.month = ?${args.length + 1}`); args.push(monthKey()); }
  const sql = b.agg(period) === "sum"
    ? `SELECT p.name, s.device, SUM(s.score) AS score, SUM(s.total) AS total, SUM(s.duration_ms) AS duration_ms,
              COUNT(*) AS count, MIN(s.created_at) AS created_at
       FROM scores s JOIN players p ON p.device = s.device
       WHERE ${where.join(" AND ")} GROUP BY s.device
       ORDER BY score ${dir}, duration_ms ASC, created_at ASC LIMIT 1000`
    : `SELECT p.name, s.device, MIN(s.score) AS score, MIN(s.total) AS total, MIN(s.duration_ms) AS duration_ms,
              NULL AS count, MIN(s.created_at) AS created_at
       FROM scores s JOIN players p ON p.device = s.device
       WHERE ${where.join(" AND ")} GROUP BY s.device
       ORDER BY score ${dir}, duration_ms ASC, created_at ASC LIMIT 1000`;
  const { results } = await db.prepare(sql).bind(...args).all();
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function publicRow(r, device) {
  const row = { rank: r.rank, name: r.name, score: r.score, total: r.total, seconds: Math.round(r.duration_ms / 1000), me: r.device === device };
  if (r.count !== null && r.count !== undefined) row.count = r.count;
  return row;
}
