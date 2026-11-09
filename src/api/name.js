// GET  /api/name?name=Amaka   -> is this name free for me?
// POST /api/name {name}        -> claim (or change to) this name for my device
import { json, fail, deviceFrom, cleanName, nameKey, nameProblem, sameOrigin, readJson, needDb } from "../lib.js";

async function owner(db, key) {
  const row = await db.prepare("SELECT device FROM players WHERE name_key = ?1").bind(key).first();
  return row ? row.device : null;
}

async function suggestions(db, name) {
  const base = name.slice(0, 20);
  const letters = "ABDEFKMOST";
  const ideas = [`${base} ${letters[Math.floor(Math.random() * letters.length)]}.`, `${base}2`, `${base} JCI`, `${base}${Math.floor(10 + Math.random() * 89)}`];
  const keys = ideas.map(nameKey);
  const { results } = await db
    .prepare(`SELECT name_key FROM players WHERE name_key IN (${keys.map((_, i) => "?" + (i + 1)).join(",")})`)
    .bind(...keys)
    .all();
  const taken = new Set(results.map((r) => r.name_key));
  return ideas.filter((n, i) => !taken.has(keys[i]) && n.length <= 24).slice(0, 3);
}

export async function onRequestGet({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  const device = deviceFrom(request);
  const name = cleanName(new URL(request.url).searchParams.get("name"));
  const problem = nameProblem(name);
  if (problem) return json({ ok: true, available: false, reason: problem });
  const who = await owner(env.DB, nameKey(name));
  if (who && who !== device) {
    return json({ ok: true, available: false, reason: "taken", suggestions: await suggestions(env.DB, name) });
  }
  return json({ ok: true, available: true, yours: !!who });
}

export async function onRequestPost({ request, env }) {
  const noDb = needDb(env); if (noDb) return noDb;
  if (!sameOrigin(request)) return fail(403, "origin");
  const device = deviceFrom(request);
  if (!device) return fail(400, "device");
  const body = await readJson(request);
  if (!body) return fail(400, "body");

  const name = cleanName(body.name);
  const problem = nameProblem(name);
  if (problem) return fail(400, problem);
  const key = nameKey(name);

  const who = await owner(env.DB, key);
  if (who && who !== device) return fail(409, "taken", { suggestions: await suggestions(env.DB, name) });

  try {
    await env.DB
      .prepare(
        `INSERT INTO players (device, name, name_key) VALUES (?1, ?2, ?3)
         ON CONFLICT(device) DO UPDATE SET name = excluded.name, name_key = excluded.name_key`
      )
      .bind(device, name, key)
      .run();
  } catch (e) {
    // Two people grabbed the same name at the same moment: the UNIQUE rule decided.
    if (String(e && e.message).includes("UNIQUE")) return fail(409, "taken", { suggestions: await suggestions(env.DB, name) });
    throw e;
  }
  return json({ ok: true, name });
}
