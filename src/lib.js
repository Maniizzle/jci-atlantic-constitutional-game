// Shared helpers for the Pages Functions in /functions/api.
// The database is reached only through the D1 binding named DB (Pages > Settings > Bindings).

export const LIMITS = {
  scoresPerHour: 30,      // per device
  boardSize: 20,
};

// Crossword puzzles: id -> number of words (10 points each). Must match site/words.html.
export const PUZZLE_WORDS = { p1: 14, p2: 15, p3: 15, p4: 14, p5: 15, p6: 14 };

// Rules a submitted score must satisfy. Anything else is rejected.
export const GAMES = {
  swipe: {
    modes: { quick: 10, full: 32 },       // mode -> number of cards
    lowerIsBetter: false,
    check: (s, total) => s >= 0 && s <= total,
    minMs: (mode, total) => total * 900,   // nobody reads and answers a card faster than this
  },
  adventure: {
    modes: { story: 12 },                  // 12 scenes
    lowerIsBetter: true,                   // score = slip-ups
    check: (s) => s >= 0 && s <= 99,
    minMs: (mode, total) => total * 1500,
  },
  crossword: {
    // mode = puzzle id, total = 10 points per word
    modes: Object.fromEntries(Object.entries(PUZZLE_WORDS).map(([id, n]) => [id, n * 10])),
    lowerIsBetter: false,
    check: (s, total) => s >= 0 && s <= total,
    minMs: (mode) => PUZZLE_WORDS[mode] * 3000, // at least 3 seconds a word
    firstOnly: true,                       // only the first finish of each puzzle counts
    board: "total",                        // ranked by total points across all puzzles
  },
};

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

export async function readJson(request) {
  const text = await request.text();
  if (text.length > 2000) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export function needDb(env) {
  return env && env.DB ? null : fail(503, "not-configured");
}

// Best score per player for one board, ranked. Device ids are used for ranking only.
export async function board(db, game, mode, period) {
  const g = GAMES[game];
  const dir = g.lowerIsBetter ? "ASC" : "DESC";
  const since = period === "week" ? "datetime('now','-7 days')" : "'1970-01-01'";
  if (g.board === "total") {
    // One score per puzzle per player (first finish only), so the sum is fair.
    const { results } = await db
      .prepare(
        `SELECT p.name, s.device, SUM(s.score) AS score, SUM(s.total) AS total,
                SUM(s.duration_ms) AS duration_ms, COUNT(*) AS count, MIN(s.created_at) AS created_at
         FROM scores s JOIN players p ON p.device = s.device
         WHERE s.game = ?1 AND s.created_at >= ${since}
         GROUP BY s.device
         ORDER BY score DESC, duration_ms ASC, created_at ASC
         LIMIT 1000`
      )
      .bind(game)
      .all();
    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
  const { results } = await db
    .prepare(
      `WITH best AS (
         SELECT s.device, s.score, s.total, s.duration_ms, s.created_at,
                ROW_NUMBER() OVER (PARTITION BY s.device
                  ORDER BY s.score ${dir}, s.duration_ms ASC, s.created_at ASC) AS rn
         FROM scores s
         WHERE s.game = ?1 AND s.mode = ?2 AND s.created_at >= ${since}
       )
       SELECT p.name, b.device, b.score, b.total, b.duration_ms, b.created_at
       FROM best b JOIN players p ON p.device = b.device
       WHERE b.rn = 1
       ORDER BY b.score ${dir}, b.duration_ms ASC, b.created_at ASC
       LIMIT 1000`
    )
    .bind(game, mode)
    .all();
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function publicRow(r, device) {
  const row = { rank: r.rank, name: r.name, score: r.score, total: r.total, seconds: Math.round(r.duration_ms / 1000), me: r.device === device };
  if (r.count !== undefined) row.puzzles = r.count;
  return row;
}
