// JCI Atlantic Constitution Games: Cloudflare Worker entry.
// /api/* goes to the game server; everything else is a file from site/.
import * as name from "./api/name.js";
import * as leaderboard from "./api/leaderboard.js";
import * as round from "./api/round.js";
import { fail } from "./lib.js";

const ROUTES = {
  "GET /api/name": name.onRequestGet,
  "POST /api/name": name.onRequestPost,
  "GET /api/leaderboard": leaderboard.onRequestGet,
  "POST /api/round/start": round.start,
  "POST /api/round/act": round.act,
  "GET /api/round/status": round.status,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.replace(/\/$/, "");
      const handler = ROUTES[`${request.method} ${path}`];
      if (!handler) {
        const known = Object.keys(ROUTES).some((k) => k.endsWith(" " + path));
        return fail(known ? 405 : 404, known ? "method" : "not-found");
      }
      try {
        return await handler({ request, env, ctx });
      } catch (e) {
        console.error("api error", url.pathname, (e && e.stack) || e);
        return fail(500, "server");
      }
    }

    const res = await env.ASSETS.fetch(request);
    if (res.status === 404) {
      const page = await env.ASSETS.fetch(new Request(new URL("/404", url), request));
      return new Response(page.body, { status: 404, headers: page.headers });
    }
    return res;
  },
};
