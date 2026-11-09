# JCI Atlantic Constitution Games

Three quick games that teach the JCI Atlantic 2022 Constitution & Policy Manual:

| Page | Game |
| --- | --- |
| `/` | Home screen linking all three games |
| `/swipe.html` | **Constitution Swipe**: true/false cards with article citations |
| `/adventure.html` | **Road to President**: choose-your-path story from applicant to President |
| `/words.html` | **Crossword & Bingo**: solo crossword, plus bingo for General Assemblies |
| `/leaderboard.html` | **Leaderboard**: best score per player, last 7 days or all time |

Plain HTML, CSS and JavaScript with no build step. On Cloudflare Pages, a small API in `functions/` adds claimed player names and a leaderboard, stored in Cloudflare D1. Without that API (for example on Salus or any static host), the games still work and the leaderboard simply stays hidden.

## Project layout

```
site/            the website (everything public lives here)
  index.html     home screen
  swipe.html     adventure.html     words.html     leaderboard.html
  player.js      player name + leaderboard client (shared by all pages)
  theme.css      shared look (colours, buttons, cards)
  404.html       favicon.svg
functions/api/   Cloudflare Pages Functions: name.js, score.js, leaderboard.js
lib/api.js       shared server rules: name checks, score limits, ranking
schema.sql       D1 tables (players, scores)
nginx.conf       web server config: port 8080, caching, security headers, /healthz
Dockerfile       container image Salus builds and runs
```

## Run it locally

Any static server works:

```bash
cd site && python3 -m http.server 8080
# open http://localhost:8080
```

Or exactly as Salus will run it:

```bash
docker build -t jci-games .
docker run --rm -p 8080:8080 jci-games
```

## Deploy on Cloudflare Pages (recommended)

1. Workers & Pages → Create → Pages → Connect to Git → this repo.
2. Production branch `master`. Framework preset **None**, build command empty, output directory **`site`**.
   The `functions/` folder at the repo root is picked up automatically.

### Leaderboard database (D1)

1. Storage & Databases → **D1** → Create database `jci-games`.
2. Open it → **Console**, paste the contents of `schema.sql`, run. (Safe to run again; it only creates what's missing.)
3. Pages project → **Settings → Bindings → Add → D1 database**. Variable name **`DB`**, database `jci-games`. Add it to Production (and Preview if you use preview deploys).
4. Redeploy (push a commit, or Deployments → Retry).

### How names and scores are protected

- Each phone gets a random device id the first time it plays. It works like a password for that player's name, travels in a request header, and is never shown or returned by the API.
- A name belongs to one device. Matching ignores case, spaces and punctuation, and the database's `UNIQUE` rule enforces it.
- The server takes the name from its own records, never from the score request.
- Scores are checked: known game and mode only, score within range, a minimum time per card or scene, at most 30 games per device per hour, same-site requests only.
- All queries are parameterized, and names are shown as plain text.
- Stored: chosen name, scores, times and device id. No emails, phone numbers or IP addresses.

A determined person can still script fake scores (no browser game can fully stop that). Use the moderation commands below.

### Moderation (run in D1 → Console)

```sql
-- See the newest scores
SELECT s.id, p.name, s.game, s.mode, s.score, s.total, s.duration_ms, s.created_at
FROM scores s JOIN players p ON p.device = s.device ORDER BY s.id DESC LIMIT 50;

-- Remove one bad score
DELETE FROM scores WHERE id = 123;

-- Remove all scores of a player (name_key = name in lowercase, letters and numbers only)
DELETE FROM scores WHERE device = (SELECT device FROM players WHERE name_key = 'amakao');

-- Free a name (e.g. the owner changed phones); their old scores disappear from the board too
DELETE FROM players WHERE name_key = 'amakao';
```

### Run the API locally

Create a `wrangler.toml` for local use only (it's git-ignored; if it were committed, Cloudflare would use it instead of the dashboard bindings):

```toml
name = "jci-local"
pages_build_output_dir = "site"
compatibility_date = "2024-09-23"
[[d1_databases]]
binding = "DB"
database_name = "jci-games"
database_id = "00000000-0000-0000-0000-000000000000"
```

Then:

```bash
npx wrangler d1 execute jci-games --local --file schema.sql
npx wrangler pages dev        # http://localhost:8788
```

## Deploy on Salus

Salus builds from a Git repository and runs the `Dockerfile` as a container.

1. **Push this repo to GitHub** (or GitLab / Azure DevOps):
   ```bash
   gh repo create jci-constitution-games --private --source . --push
   # or create an empty repo on github.com, then:
   git remote add origin git@github.com:<you>/jci-constitution-games.git
   git push -u origin main
   ```
2. **Create a project in Salus** and pick the repository you just pushed.
3. **Build settings:** choose the **Dockerfile** build (the Dockerfile is at the repo root).
4. **Port:** `8080`. Salus doesn't pass a `PORT` variable, and nginx listens on 8080.
5. **Visibility:** public.
6. **Health check (optional):** `GET /healthz` returns `200 ok`.
7. Deploy. Every push to `main` then rebuilds and redeploys through your release rules.

To use your own domain (for example `quiz.jciatlantic.org`), add it under the project's custom domains (a Pro plan feature on Salus Cloud) and point a DNS `CNAME` at the address Salus gives you.

## Editing the questions

- Swipe cards: the `CARDS` list in `site/swipe.html`. Each card is
  `[chapter, statement, true/false, explanation, article]`. Flipped versions are in `TWINS`.
- Adventure scenes: the `SCENES` list in `site/adventure.html`.
- Crossword: the `WORDS` list in `site/words.html`. Each word's row/column is fixed, so a new word needs a new layout.
- Bingo clues: the `TERMS` list in `site/words.html`.

Commit and push, and Salus redeploys.

## Planned next

- "Ask the Constitution" chat (Gemini API behind a Pages Function)
- Live bingo mode (Durable Objects)
