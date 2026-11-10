# JCI Atlantic Constitution Games

Three quick games that teach the JCI Atlantic 2022 Constitution & Policy Manual:

| Page | Game |
| --- | --- |
| `/` | Home screen linking all three games |
| `/swipe.html` | **Constitution Swipe**: true/false cards with article citations |
| `/adventure.html` | **Road to President**: choose-your-path story from applicant to President |
| `/words.html` | **Crossword & Bingo**: solo crossword, plus bingo for General Assemblies |
| `/leaderboard.html` | **Leaderboard**: best score per player, last 7 days or all time |

Plain HTML, CSS and JavaScript pages, served by a Cloudflare Worker. The Worker holds every question and answer, runs each round, marks each answer and keeps the leaderboard in Cloudflare D1. The pages never contain the answers.

## Project layout

```
site/            the website (everything public lives here)
  index.html     home screen
  swipe.html     adventure.html     words.html     leaderboard.html
  player.js      player name + leaderboard client (shared by all pages)
  theme.css      shared look (colours, buttons, cards)
  404.html       favicon.svg
src/worker.js    Cloudflare Worker: /api/* to the game server, everything else from site/
src/api/         round.js (start / answer / status), name.js, leaderboard.js
src/content/     the questions and answers: swipe.js, adventure.js, crossword.js
src/lib.js       shared server rules: name checks, score limits, ranking
wrangler.jsonc   Worker config: name, site folder, D1 database binding
schema.sql       D1 tables (players, scores)
migrations/      updates for an existing database, run in order
```

## Deploy on Cloudflare Workers (recommended)

The Worker `jci-atlantic-constitutional-game` is connected to this repo (Workers Builds).
Every push to `master` runs `npx wrangler deploy`, which reads `wrangler.jsonc`.

- `assets.directory` is `./site`, so the website files are served from there.
- `d1_databases` connects the `jci-games` database as `DB`. No dashboard binding is needed.
- The `name` in `wrangler.jsonc` must stay the same as the Worker's name in the dashboard.

### Leaderboard database (D1), one-time

1. Storage & Databases → **D1** → database `jci-games` (its ID is in `wrangler.jsonc`).
2. Open it → **Console**, paste the contents of `schema.sql`, run. (Safe to run again; it only creates what's missing.)

**Already have the database from before?** Run the files in `migrations/` in order, once each, instead of `schema.sql`. `002_server_rounds.sql` keeps existing scores but converts them to the official-round rules: the first score in each slot stays, later replays are removed. Names are untouched.

### Official rounds and practice

| Game | Official score | Month board | All-time board |
| --- | --- | --- | --- |
| Swipe (quick, full) | first round of each type each month | that round | official rounds added up |
| Road to President | first run ever | runs finished this month | first runs |
| Crossword | first finish of each puzzle | points earned this month | points from all puzzles |

Everything after the official round is practice: same game, nothing saved. Months follow Lagos time.

### How names and scores are protected

- Each phone gets a random device id the first time it plays. It works like a password for that player's name, travels in a request header, and is never shown or returned by the API.
- A name belongs to one device. Matching ignores case, spaces and punctuation, and the database's `UNIQUE` rule enforces it.
- The server takes the name from its own records, never from the score request.
- The server deals the questions, marks every answer and times the round itself. Scores can't be sent in; they're built from real answers.
- An official round started and abandoned stays your official round: starting again resumes it.
- Rounds that finish faster than a person could read them don't count. At most 60 rounds per device per hour, same-site requests only.
- All queries are parameterized, and names are shown as plain text.
- Stored: chosen name, scores, times and device id. No emails, phone numbers or IP addresses.

Still possible: someone using a second phone or browser as a new player (with a different name) to learn answers before their official round. The moderation commands below help if that happens.

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

```bash
npx wrangler d1 execute jci-games --local --file schema.sql   # local test database
npx wrangler dev                                               # http://localhost:8787
```

## Editing the questions

All questions and answers are in `src/content/`:

- `swipe.js`: `CARDS` is `[chapter, statement, true/false, explanation, article]`. `TWINS` holds flipped versions.
- `adventure.js`: `SCENES`, one per step. The right choice has `ok: true`.
- `crossword.js`: `PUZZLES`. Each word's row and column is fixed, so changing words needs a new layout. Also update `PUZZLE_LIST` in `site/words.html` if you add a puzzle.
- Bingo clues are in `TERMS` in `site/words.html` (bingo has no scores).

Commit and push, and Cloudflare redeploys.

## Planned next

- "Ask the Constitution" chat (Gemini API behind the Worker)
- Live bingo mode (Durable Objects)
