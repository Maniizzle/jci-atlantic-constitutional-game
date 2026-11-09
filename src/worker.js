// JCI Atlantic Constitution Games: Cloudflare Worker entry.
// /api/* goes to the leaderboard code; everything else is a file from site/.
import * as name from "./api/name.js";
import * as score from "./api/score.js";
import * as leaderboard from "./api/leaderboard.js";
import { fail } from "./lib.js";

const ROUTES = { "/api/name": name, "/api/score": score, "/api/leaderboard": leaderboard };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const route = ROUTES[url.pathname.replace(/\/$/, "")];
      if (!route) return fail(404, "not-found");
      const handler = request.method === "GET" ? route.onRequestGet : request.method === "POST" ? route.onRequestPost : null;
      if (!handler) return fail(405, "method");
      try {
        return await handler({ request, env, ctx });
      } catch (e) {
        console.error("api error", url.pathname, e && e.stack || e);
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
