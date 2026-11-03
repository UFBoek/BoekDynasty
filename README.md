# Boek Dynasty

Permanent fantasy college basketball dynasty league starting in the **2026–27 season**. Managers draft **NCAA programs**, not individual athletes, and **keep those programs across future seasons** unless traded. Season-long scoring is deliberately **not yet configured**.

## Live app

https://boek-dynasty.fig-league-archive.workers.dev/

This project has its own source repository, Cloudflare Worker (`boek-dynasty`), and D1 database (`boek-dynasty-db`). It does **not** reuse or modify any Fantasy League Records / BoekMuse infrastructure.

## Features

- **Configurable manager cap (2–20)**, including the commissioner; D1 validates capacity at registration with a settings-driven database trigger.
- One-time commissioner setup code, then single-use invitation links valid for 7 days.
- Each manager creates a team with a username, team name, and password.
- Passwords hashed with PBKDF2-SHA256 using Cloudflare-compatible 100,000 iterations; 90-day HttpOnly, Secure, SameSite cookies renew on use.
- Commissioner settings are organized into General, Draft, Programs, Members, and Trades. The commissioner can rename the league, set the manager cap (2–20), configure conferences and draft rounds (1–20), reorder/shuffle draft positions before the draft, manage invitations, and enable/disable trading.
- College basketball conference membership from a verified 2026–27 ESPN standings snapshot (via SportsDataverse), bundled with the app; manual program entry if a school is missing.
- Initial snake-format draft, with exclusive ownership, turn checks, pause/resume and pre-completion commissioner reset.
- **Permanent rosters:** draft selections remain immutable draft history, while `program_owners` tracks the current owner from year to year.
- **Manager-to-manager trades:** select schools from each roster, send an offer, and accept, decline or cancel. Both owners' programs transfer together after acceptance, with server-side validation against stale offers. League-wide trade activity is visible.
- Responsive desktop/mobile design and PWA home-screen setup.
- No fabricated game results or fantasy points. Scoring, live results, and historical season awards come later.

## Interface copy and layout

Treat Boek Dynasty as a functional league application, not a marketing landing page. Keep authentication compact and league pages focused on the status, programs, owners, picks, trades and actions users actually need. Avoid oversized promotional headlines, motivational slogans, filler descriptions and repetitive instructions. Use short, informative labels; add help text only when a rule, error or action needs explanation.

## League display and program imports

The navigation uses **Standings** for the league standings table. Scores remain unranked until the season-long points system is configured; the site does not invent game points. The Programs directory includes search, conference and ownership filters.

When the commissioner opens the site with a pending draft, the frontend checks for selected conferences with no imported programs and imports their 2026–27 rosters from the bundled verified program directory, in small batches. Once the imports finish, the program directory shows schools and their ESPN CDN logos (where available). The commissioner can also manually use **Import selected programs** to retry or refresh. Existing ownership and draft picks remain unchanged.

## Architecture

Production has **zero npm dependencies**: Cloudflare Workers serve the backend and web app, Cloudflare D1 stores league data. The 2026–27 program directory is bundled from the SportsDataverse ESPN standings snapshot; review school membership before drafting.

- `data/programs-2027.json` vetted 2026–27 programs with 365 ESPN team IDs and all 32 conferences
- `src/client.js` browser interface
- `src/style.css` visual system
- `src/server.js` Worker/API implementation
- `src/index.html` HTML shell
- `schema.sql` D1 schema
- `scripts/build.mjs` build pipeline
- `dist/worker.js` Worker bundle

## Program directory source

The original live ESPN Core conference endpoint returned HTTP 403 from Cloudflare in November 2026. The bundled `data/programs-2027.json` file replaces that dependency. It was extracted from SportsDataverse's `raw/mbb/espn_standings_2027.json.gz`, a 2026–27 ESPN standings snapshot containing 365 unique ESPN team IDs across 32 conferences. `admin/sync` now loads locally bundled records, not external network feeds. The first production import loaded 135 schools from the commissioner's then-current 10 selected conferences. This dataset is season-specific and must be refreshed and verified before a later season.

## Commissioner settings

- **General:** League name (3–40 characters); manager limit (2–20) as long as it is not lower than the current registered manager count. Changing the cap is blocked after the draft starts.
- **Draft:** Rounds per manager, save/shuffle/manually arrange draft order before the draft, and start/pause/reset controls. Server-side selection order uses the persisted order. The draft order is locked once the draft starts.
- **Programs:** Eligible conferences, import from the verified bundled 2026–27 directory, and add missing programs.
- **Members:** See registered managers and issue single-use seven-day invitations. Both invites and registration honor the configured manager cap.
- **Trades:** Enable/disable new trade proposals and acceptance after the initial draft. Disabling trading retains the history and existing accepted ownership; existing offers can still be cancelled or declined.

Existing D1 deployments **must apply `migrations/002_commissioner_controls.sql` before deploying this version**. The migration creates default settings and replaces the old hard-coded 10-manager trigger with a configurable one. No managers, schools, picks, or trades are deleted.

## Publishing an update

From this repository, with Node.js installed:

```sh
node scripts/build.mjs
npx wrangler deploy
```

**Existing production D1 database:** apply `migrations/001_program_ownership_trades.sql` **once before deploying this code**:

```sh
npx wrangler d1 execute boek-dynasty-db --remote --file=migrations/001_program_ownership_trades.sql
npx wrangler d1 execute boek-dynasty-db --remote --file=migrations/002_commissioner_controls.sql
node scripts/build.mjs
npx wrangler deploy
```

The migration uses `CREATE TABLE IF NOT EXISTS`, restores owners from any existing draft picks with `INSERT OR IGNORE`, and installs a trigger to assign future drafted schools. It does not erase existing accounts or draft history. Back up D1 before database migrations. Running only `node scripts/build.mjs` and `npx wrangler deploy` without migrating the existing D1 database first will cause authenticated API calls to fail.

Changing GitHub files alone does **not** update the deployed Worker; deployment is currently manual.

If recreating D1: `npx wrangler d1 execute boek-dynasty-db --remote --file=schema.sql`, then securely provision a random commissioner bootstrap code and store only its SHA-256 digest in `settings.setup_hash`. Never commit a bootstrap code.

## Not yet implemented

Season scoring, real live game results, year-end roster snapshots / season rollover UI, account recovery, email verification, advanced commissioner reorder/shuffle tools, draft-pick trading and free agency. The initial goal is a usable shared fantasy league shell, account management, eligible program selection and drafting.
