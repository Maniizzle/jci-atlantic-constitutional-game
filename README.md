# JCI Atlantic Constitution Games

Three quick games that teach the JCI Atlantic 2022 Constitution & Policy Manual:

| Page | Game |
| --- | --- |
| `/` | Home screen linking all three games |
| `/swipe.html` | **Constitution Swipe**: true/false cards with article citations |
| `/adventure.html` | **Road to President**: choose-your-path story from applicant to President |
| `/words.html` | **Crossword & Bingo**: solo crossword, plus bingo for General Assemblies |

Plain HTML, CSS and JavaScript. No build step and no database. Scores and progress are kept in each player's browser (`localStorage`).

## Project layout

```
site/            the website (everything public lives here)
  index.html     home screen
  swipe.html     adventure.html     words.html
  theme.css      shared look (colours, buttons, cards)
  404.html       favicon.svg
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

- Leaderboard (needs a small database)
- "Ask the Constitution" chat (Gemini API behind a serverless function)
