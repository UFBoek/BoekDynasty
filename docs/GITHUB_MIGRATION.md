# Boek Dynasty: Supabase migration and GitHub deployment

## Current production (live)

- Website: https://boek-dynasty.fig-league-archive.workers.dev/
- Public source: https://github.com/UFBoek/BoekDynasty (`main`)
- API: https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api
- Database: Supabase PostgreSQL project `hscgsaujazcyneykarai`
- Frontend: Stateless Cloudflare Worker for the existing URL. It serves assets committed to GitHub and forwards `/api/*` to Supabase. It has **zero D1 bindings and zero Cloudflare cron jobs**.
- Results: Supabase scheduled imports from ESPN, including live games every 15 minutes, reconciliation, historical backfills, official NET and AP rankings.

The production site is **already off D1**. The previous D1 database and `dist/worker.js` remain intact solely for rollback. Do not restore the old D1 Worker by accident.

## GitHub Pages: one setting is still required

The alternative static site at https://ufboek.github.io/BoekDynasty/ is **not published**. GitHub Actions builds the client successfully, but `actions/configure-pages` fails because GitHub Pages itself is not enabled for this repository. The standard `GITHUB_TOKEN` cannot create a Pages site with `enablement: true`; it needs a more privileged personal or GitHub App token.

**The repository owner must visit:** https://github.com/UFBoek/BoekDynasty/settings/pages
- Under **Build and deployment**, select **GitHub Actions** as the source.
- Then visit https://github.com/UFBoek/BoekDynasty/actions/workflows/deploy-pages.yml and rerun the failed deployment, or push a new commit to `main`. The workflow also runs automatically on future pushes to `main`.
- After a successful deployment, open the Pages URL and sign in. The existing Worker URL will continue to work until an explicit retirement decision.

Do not describe the Pages URL as live until it actually returns HTTP 200 and the login/browser flows are checked.

## Code paths

- `src/client.js`: canonical UI; no D1-specific changes are needed here.
- `src/worker-proxy.js`: existing-URL frontend and authenticated API reverse proxy.
- `scripts/build-worker-proxy.mjs`: builds `dist/worker-proxy.js` from the canonical interface assets and inserts bearer-token session support.
- `wrangler.toml`: points to `dist/worker-proxy.js`, no D1 binding, `crons = []`.
- `scripts/build-pages.mjs`: builds `pages-dist/`, pointing at the Supabase API for `/BoekDynasty/`.
- `.github/workflows/deploy-pages.yml`: Pages build and deployment.
- `supabase/functions/boek-api/`: deployed private API, PostgreSQL adapter, ESPN result processing, validated scheduling.
- `supabase/migrations/`: tables, RLS, NCAA results and all Supabase cron schedules.
- `src/server.js`, `src/results.js`, `schema.sql`, `dist/worker.js`: legacy D1 implementation, retained as backup/reference, **not active**.

## Data migration and checks

- Imported original 26,176 recorded D1 games and historical metadata. Supabase ingestion continues adding missing games.
- Imported the commissioner account (PBKDF2-SHA256 password hash and salt), 135 programs, invitations, final league scoring/settings, 1,794 NET ranks plus NET details, 335 NCAA tournament results, 573 awards, 827 game-coverage records, and 25 AP rankings.
- Verified the final D1 settings match Supabase, including **7 managers**, **16 draft rounds**, the exact selected conference pool, and scoring rules (best 12 programs).
- Verified the Supabase API `/status` and `/state` authorization, and a live ESPN import.
- Historical leader calculations produced 1,988 school-season records across 365 programs before additional backfills.
- Verified the live original URL now returns its UI, bearer-token client script, the correct 7-manager API status, and a 401 for unsigned `/state`.
- Verified Cloudflare production script settings have `bindings: []` and `schedules: []`.
- **Still requires human browser acceptance:** sign in with an actual migrated manager password, then test creating a second account from an invite, drafting, trading and your device's mobile/browser UI. A temporary authenticated end-to-end test was blocked by the available testing interface and was not claimed as passed.

## Security and operations

- The GitHub repo is public. Never commit actual D1 data exports, user password hashes, raw session tokens, invite codes, private database connection strings, or service keys.
- The `public` tables have RLS enabled and no direct `anon` or `authenticated` data access. League authorization is enforced server-side within the Supabase Edge API.
- The app uses bearer sessions and requires all users to **sign in again** once after migration. Their existing usernames/passwords remain valid.
- Scheduled functions are protected by a generated 256-bit secret stored in Supabase Vault. Only its SHA-256 hash is in the private settings table.
- Monitor `SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'boek_%'` (10 jobs).
- See recent HTTP results in `net._http_response`, and Supabase Edge Function logs for failures.
- The Worker compatibility frontend is currently deployed from the committed `dist/worker-proxy.js` via the Cloudflare Worker API. A source edit does not automatically redeploy this legacy URL; rebuild and deploy with Wrangler if needed. The Pages workflow does auto-deploy after the one-time enablement.
- Keep the former D1 database as a read-only rollback reference. Do not simultaneously run separate writeable leagues against both databases.


## Historical season completeness (verified November 4, 2026)

All five completed seasons have verified ESPN Division I scoreboard coverage for **every day from November 1 through April 15**, including NCAA Tournament group 100 in March and April. Original CDN scoreboards for early seasons were incomplete even when marked scanned. The repair fetched the full ESPN site API game lists with Supabase pg_net and upserted them by ESPN game ID, preserving scores, true home/away and neutral-site indicators. The repaired records are reflected in the live school pages and historical points leaderboard.

| Season | Recorded games | Final games | Day coverage | Final NET teams | NCAA games | NCAA seeds | Conference regular champions* | Conference tournament champions | National champion |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2021–22 | 6,291 | 5,883 | 166/166 | 350 | 67 | 68 | 35 | 32 | 1 |
| 2022–23 | 6,046 | 6,014 | 166/166 | 358 | 67 | 68 | 40 | 32 | 1 |
| 2023–24 | 6,149 | 6,143 | 167/167 | 359 | 67 | 68 | 36 | 32 | 1 |
| 2024–25 | 6,299 | 6,292 | 166/166 | 363 | 67 | 68 | 39 | 31 | 1 |
| 2025–26 | 6,207 | 6,190 | 166/166 | 364 | 67 | 68 | 35 | 31 | 1 |

*Conference regular title counts include co-champions where applicable. Each season has 4 First Four games among its 67 NCAA results. The NET snapshots are final-season ranks (not weekly NET history). Historical AP Top 25 weekly polls are not imported and are not used in fantasy scoring.

The Edge Function's `verify-leaders` job confirmed `archive_complete: true` and the five verified archived seasons. Archived program profiles now return `status: complete`, and the current 2026–27 season remains provisional/live. The deployed Cloudflare frontend was checked at `/app.js` with HTTP 200 and confirmed the updated Final Points label. The helper that calculates completeness requires daily coverage, at least 5,700 final games, completed NET, NCAA results, and validated title awards, rather than assuming a date being scanned is sufficient.

An idempotent private repair workflow is available in `supabase/functions/boek-api/index.ts` as `site-import-queued`, backed by the RLS-restricted `cbb_historical_site_queue` table. It imports only previously fetched official ESPN responses and never exposes a public database key. The queue was empty after the repair.
