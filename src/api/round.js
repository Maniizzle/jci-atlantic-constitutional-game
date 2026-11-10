// Server-run rounds. The page never sees an answer before the player commits to one.
//   POST /api/round/start  {game, mode}            -> new round, or resumes your open official round
//   POST /api/round/act    {round, ...}            -> one answer / move; the server marks it
//   GET  /api/round/status?game=swipe              -> is your official round available, in progress or done?
//
// Official rounds (they fill a leaderboard slot, see slotFor):
//   swipe: first round of each mode each month · adventure: first run ever · crossword: first finish per puzzle
// Everything after that is practice: same game, nothing saved.
import { json, fail, deviceFrom, sameOrigin, readJson, needDb, monthKey, slotFor, board, LIMITS } from "../lib.js";
import { CARDS, TWINS } from "../content/swipe.js";
import { STAGES, SCENES } from "../content/adventure.js";
import { PUZZLES } from "../content/crossword.js";

const PTS = 10; // crossword points per word
const GAMES = {
  swipe: { modes: { quick: 10, full: CARDS.length }, minMs: (r) => r.total * 900 },
  adventure: { modes: { story: SCENES.length }, minMs: (r) => r.total * 1500 },
  crossword: {
    modes: Object.fromEntries(PUZZLES.map((p) => [p.id, p.words.length * PTS])),
    minMs: (r) => (r.total / PTS) * 3000,
  },
};

const shuffle = (a) => {
  a = a.slice();
  for (let j = a.length - 1; j > 0; j--) { const r = Math.floor(Math.random() * (j + 1)); [a[j], a[r]] = [a[r], a[j]]; }
  return a;
};
const cellsOf = (o) => Array.from({ length: o.w.length }, (_, k) => `${o.r + (o.d === "D" ? k : 0)},${o.c + (o.d === "A" ? k : 0)}`);

// ---------- new rounds ----------
async function newState(db, device, game, mode) {
  if (game === "swipe") {
    let ids = CARDS.map((_, k) => k);
    if (mode === "quick") {
      // Prefer cards this device hasn't seen in its recent rounds
      const { results } = await db
        .prepare("SELECT state FROM rounds WHERE device = ?1 AND game = 'swipe' ORDER BY created_at DESC LIMIT 4")
        .bind(device).all();
      const seen = new Set(results.flatMap((r) => { try { return JSON.parse(r.state).deck.map((d) => d[0]); } catch { return []; } }));
      const fresh = shuffle(ids.filter((k) => !seen.has(k)));
      ids = fresh.concat(shuffle(ids.filter((k) => seen.has(k)))).slice(0, 10);
    }
    return { deck: shuffle(ids).map((k) => [k, TWINS[k] && Math.random() < 0.5 ? 1 : 0]), i: 0, score: 0 };
  }
  if (game === "adventure") {
    return { scene: 0, slips: 0, orders: SCENES.map((sc) => shuffle(sc.choices.map((_, k) => k))) };
  }
  return { revealed: [], solved: [], penalty: 0 };
}

// ---------- what the page is allowed to see ----------
function sceneView(st, n) {
  const sc = SCENES[n];
  return { index: n, stage: sc.s, title: sc.title, text: sc.text, choices: st.orders[n].map((k) => ({ id: k, t: sc.choices[k].t })) };
}
function view(row) {
  const st = row.st, base = { round: row.id, official: !!row.slot, total: row.total };
  if (row.game === "swipe") {
    return { ...base, index: st.i, score: st.score,
      items: st.deck.map(([k, t]) => ({ ch: CARDS[k][0], q: t ? TWINS[k][0] : CARDS[k][1] })) };
  }
  if (row.game === "adventure") {
    return { ...base, stages: STAGES, slips: st.slips, scene: st.scene < SCENES.length ? sceneView(st, st.scene) : null };
  }
  const p = PUZZLES.find((x) => x.id === row.mode);
  return { ...base, penalty: st.penalty,
    puzzle: { id: p.id, title: p.title, h: p.h, w: p.w, words: p.words.map((o, i) => ({ i, r: o.r, c: o.c, d: o.d, len: o.w.length, clue: o.clue })) },
    revealed: st.revealed.map((i) => ({ i, w: p.words[i].w })),
    solved: st.solved.map((i) => ({ i, art: p.words[i].art })) };
}

// ---------- helpers ----------
async function loadRound(db, id, device) {
  const row = await db.prepare("SELECT * FROM rounds WHERE id = ?1 AND device = ?2").bind(id, device).first();
  if (!row) return null;
  row.st = JSON.parse(row.state);
  return row;
}
async function saveRound(db, row) {
  await db.prepare("UPDATE rounds SET state = ?1, status = ?2, elapsed_ms = ?3, last_at = ?4 WHERE id = ?5")
    .bind(JSON.stringify(row.st), row.status, row.elapsed_ms, row.last_at, row.id).run();
}
function tick(row) { // active time: gaps over a minute count as one minute
  const now = Date.now();
  row.elapsed_ms += Math.min(Math.max(0, now - row.last_at), 60000);
  row.last_at = now;
}
async function myRanks(db, device, game, mode) {
  const [m, a] = await Promise.all([board(db, game, mode, "month"), board(db, game, mode, "all")]);
  const pick = (rows) => { const r = rows.find((x) => x.device === device); return r ? { rank: r.rank, of: rows.length } : null; };
  return { month: pick(m), all: pick(a) };
}

async function finish(db, row) {
  row.status = "done";
  const st = row.st;
  let score;
  if (row.game === "swipe") score = st.score;
  else if (row.game === "adventure") score = st.slips;
  else score = Math.max(0, st.solved.filter((i) => !st.revealed.includes(i)).length * PTS - st.penalty);
  const result = { score, total: row.total, seconds: Math.round(row.elapsed_ms / 1000), official: !!row.slot, saved: false };
  if (row.slot) {
    if (row.elapsed_ms < GAMES[row.game].minMs(row)) {
      result.reason = "too-fast";
    } else {
      const player = await db.prepare("SELECT name FROM players WHERE device = ?1").bind(row.device).first();
      if (player) {
        await db.prepare(
          `INSERT INTO scores (game, mode, name, score, total, duration_ms, device, month, slot)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ON CONFLICT(device, slot) DO NOTHING`
        ).bind(row.game, row.mode, player.name, score, row.total, row.elapsed_ms, row.device, row.month, row.slot).run();
        result.saved = true;
        Object.assign(result, await myRanks(db, row.device, row.game, row.mode));
      } else result.reason = "no-name";
    }
  }
  return result;
}

// ---------- endpoints ----------
export async function start({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  if (!sameOrigin(request)) return fail(403, "origin");
  const device = deviceFrom(request);
  if (!device) return fail(400, "device");
  const b = await readJson(request);
  const g = b && GAMES[b.game];
  if (!g) return fail(400, "game");
  const total = g.modes[b.mode];
  if (!total) return fail(400, "mode");
  const db = env.DB;

  // Reopen a round this device already has open (e.g. a practice crossword after a page reload)
  if (typeof b.resume === "string") {
    const row = await db.prepare("SELECT * FROM rounds WHERE id = ?1 AND device = ?2 AND game = ?3 AND mode = ?4 AND status = 'open'")
      .bind(b.resume, device, b.game, b.mode).first();
    if (row) { row.st = JSON.parse(row.state); return json({ ok: true, resumed: true, ...view(row) }); }
  }

  const recent = await db.prepare("SELECT COUNT(*) AS n FROM rounds WHERE device = ?1 AND created_at >= datetime('now','-1 hour')").bind(device).first();
  if (recent.n >= LIMITS.roundsPerHour) return fail(429, "slow-down");

  const month = monthKey();
  const slot = slotFor(b.game, b.mode, month);
  const player = await db.prepare("SELECT name FROM players WHERE device = ?1").bind(device).first();
  let official = false;
  if (player) {
    const open = await db.prepare("SELECT * FROM rounds WHERE device = ?1 AND slot = ?2 AND status = 'open' LIMIT 1").bind(device, slot).first();
    if (open) { // carry on with the official round you already started
      open.st = JSON.parse(open.state);
      return json({ ok: true, resumed: true, ...view(open) });
    }
    const used = await db.prepare(
      "SELECT 1 FROM rounds WHERE device = ?1 AND slot = ?2 UNION SELECT 1 FROM scores WHERE device = ?1 AND slot = ?2 LIMIT 1"
    ).bind(device, slot).first();
    official = !used;
  }

  // Tidy up old practice rounds now and then
  if (Math.random() < 0.05) {
    await db.prepare("DELETE FROM rounds WHERE slot IS NULL AND created_at < datetime('now','-14 days')").run();
  }

  const row = { id: crypto.randomUUID(), device, game: b.game, mode: b.mode, month, slot: official ? slot : null,
    total, st: await newState(db, device, b.game, b.mode), status: "open", elapsed_ms: 0, last_at: Date.now() };
  await db.prepare(
    `INSERT INTO rounds (id, device, game, mode, month, slot, total, state, status, elapsed_ms, last_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'open', 0, ?9)`
  ).bind(row.id, device, row.game, row.mode, month, row.slot, total, JSON.stringify(row.st), row.last_at).run();
  return json({ ok: true, resumed: false, practiceReason: official ? null : player ? "used" : "no-name", ...view(row) });
}

export async function act({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  if (!sameOrigin(request)) return fail(403, "origin");
  const device = deviceFrom(request);
  if (!device) return fail(400, "device");
  const b = await readJson(request, 8000);
  if (!b || typeof b.round !== "string") return fail(400, "body");
  const db = env.DB;
  const row = await loadRound(db, b.round, device);
  if (!row) return fail(404, "round");
  if (row.status !== "open") return fail(409, "finished");
  tick(row);
  const st = row.st;
  let out = {};

  if (row.game === "swipe") {
    if (typeof b.answer !== "boolean") return fail(400, "answer");
    const [k, t] = st.deck[st.i];
    const truth = t ? TWINS[k][1] : CARDS[k][2];
    const correct = b.answer === truth;
    if (correct) st.score++;
    out = { index: st.i, correct, truth, why: t ? TWINS[k][2] : CARDS[k][3], art: CARDS[k][4], score: st.score };
    st.i++;
    if (st.i >= st.deck.length) out.result = await finish(db, row);
  } else if (row.game === "adventure") {
    const sc = SCENES[st.scene];
    const ch = sc.choices[b.choice];
    if (!Number.isInteger(b.choice) || !ch) return fail(400, "choice");
    if (ch.ok) {
      out = { correct: true, win: sc.win, art: sc.art, slips: st.slips };
      st.scene++;
      if (st.scene >= SCENES.length) out.result = await finish(db, row);
      else out.next = sceneView(st, st.scene);
    } else {
      st.slips = Math.min(99, st.slips + 1);
      out = { correct: false, fail: ch.fail, why: ch.why, art: sc.art, slips: st.slips, scene: sceneView(st, st.scene) };
    }
  } else {
    const p = PUZZLES.find((x) => x.id === row.mode);
    if (b.type === "words") { // the player finished typing these words: are they right?
      if (!Array.isArray(b.items) || b.items.length > 40) return fail(400, "items");
      const correct = [];
      for (const it of b.items) {
        const o = p.words[it && it.i];
        if (o && typeof it.letters === "string" && it.letters.toUpperCase() === o.w) {
          if (!st.solved.includes(it.i)) st.solved.push(it.i);
          correct.push({ i: it.i, art: o.art });
        }
      }
      out = { correct };
    } else if (b.type === "check") { // flag wrong letters; each one costs a point
      if (!b.cells || typeof b.cells !== "object") return fail(400, "cells");
      const sol = {};
      p.words.forEach((o) => cellsOf(o).forEach((k, n) => (sol[k] = o.w[n])));
      const wrong = Object.entries(b.cells).filter(([k, v]) => sol[k] && String(v).toUpperCase() !== sol[k]).map(([k]) => k);
      st.penalty += wrong.length;
      out = { wrong, penalty: st.penalty };
    } else if (b.type === "reveal") {
      const o = p.words[b.i];
      if (!o) return fail(400, "word");
      if (!st.revealed.includes(b.i)) st.revealed.push(b.i);
      if (!st.solved.includes(b.i)) st.solved.push(b.i);
      out = { i: b.i, w: o.w, art: o.art };
    } else return fail(400, "type");
    if (st.solved.length === p.words.length) out.result = await finish(db, row);
  }

  await saveRound(db, row);
  return json({ ok: true, ...out });
}

export async function status({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  const device = deviceFrom(request);
  const game = new URL(request.url).searchParams.get("game");
  const g = GAMES[game];
  if (!g) return fail(400, "game");
  const month = monthKey();
  const modes = {};
  for (const mode of Object.keys(g.modes)) {
    const slot = slotFor(game, mode, month);
    let state = "new", score = null;
    if (device) {
      const s = await env.DB.prepare("SELECT score, total FROM scores WHERE device = ?1 AND slot = ?2").bind(device, slot).first();
      const r = s ? null : await env.DB.prepare("SELECT status FROM rounds WHERE device = ?1 AND slot = ?2 LIMIT 1").bind(device, slot).first();
      if (s) { state = "done"; score = { score: s.score, total: s.total }; }
      else if (r) state = r.status === "open" ? "open" : "done";
    }
    modes[mode] = { state, score };
  }
  return json({ ok: true, game, month, modes });
}
