# Boek Dynasty

Separate fantasy college basketball app for the **2026–27 season**. Users draft **NCAA programs**, not individual athletes. The winner will be determined by a season-long cumulative scoring system, which is deliberately **not yet configured**.

## Live app

https://boek-dynasty.fig-league-archive.workers.dev/

This project has its own source repository, Cloudflare Worker (`boek-dynasty`), and D1 database (`boek-dynasty-db`). It does **not** reuse or modify any Fantasy League Records / BoekMuse infrastructure.

## Features

- **Up to 10 managers**, including the commissioner; a database trigger enforces the cap.
- One-time commissioner setup code, then single-use invitation links valid for 7 days.
- Each manager creates a team with a username, team name, and password.
- Passwords hashed with PBKDF2-SHA256; 90-day HttpOnly, Secure, SameSite cookies renew on use.
- Commissioner chooses Division I conferences and draft rounds (1–20).
- College basketball conference membership imported from ESPN's 2026–27 data; manual program entry if a school is missing.
- Shared snake-format draft with exclusive ownership, turn checks, pause/resume and commissioner reset.
- Responsive desktop/mobile design and PWA home-screen setup.
- No fabricated game results or fantasy points. Scoring and live results come later.

## Architecture

Production has **zero npm dependencies**: Cloudflare Workers serve the backend and web app, Cloudflare D1 stores league data. The ESPN team directory is an unofficial external source whose membership should be reviewed before drafting.

- `src/client.js` browser interface
- `src/style.css` visual system
- `src/server.js` Worker/API implementation
- `src/index.html` HTML shell
- `schema.sql` D1 schema
- `scripts/build.mjs` build pipeline
- `dist/worker.js` Worker bundle

## Publishing an update

From this repository, with Node.js installed:

```sh
node scripts/build.mjs
npx wrangler deploy
```

Changing GitHub files alone does **not** update the deployed Worker; deployment is currently manual.

If recreating D1: `npx wrangler d1 execute boek-dynasty-db --remote --file=schema.sql`, then securely provision a random commissioner bootstrap code and store only its SHA-256 digest in `settings.setup_hash`. Never commit a bootstrap code.

## Not yet implemented

Season scoring, real live game results, account recovery, email verification, advanced commissioner reorder/shuffle tools, trades and free agency. The initial goal is a usable shared fantasy league shell, account management, eligible program selection and drafting.
