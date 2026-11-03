# CBB Dynasty: GitHub Pages + Supabase deployment

The public site is served by GitHub Pages. The private API is a Supabase Edge Function using PostgreSQL. Cloudflare D1 is no longer needed by the new site.

## Services
- Website: `https://ufboek.github.io/BoekDynasty/`
- API: `https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api`
- Database: Supabase project `hscgsaujazcyneykarai`
- Ingestion: Supabase `pg_cron` + `pg_net` call authenticated background jobs in the Edge Function. ESPN games and NCAA NET / AP ranking updates are stored in PostgreSQL. Historical archive refreshes happen separately.
- Continuous deployment: `.github/workflows/deploy-pages.yml` runs on pushes to `main`.

## Important one-time GitHub Pages setting
Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
GitHub does not permit a normal `GITHUB_TOKEN` to enable Pages from `actions/configure-pages` automatically. This repository setting must be enabled by an owner if it has not been set already.

## Repository structure
- `scripts/build-pages.mjs`: bundles the HTML/CSS/JavaScript/image into `pages-dist/`, rebases the root paths for `/BoekDynasty/`, and points the API client at Supabase.
- `supabase/functions/boek-api/index.ts`: secure CORS, API routing and authenticated cron imports.
- `supabase/functions/boek-api/server.js`: existing dynasty API rules, password verification, trades and draft logic.
- `supabase/functions/boek-api/db.js`: parameterized PostgreSQL adapter and transactional batched writes.
- `supabase/functions/boek-api/results.js`: ESPN scoreboard, historical scoring, NET quadrant and award imports.
- `supabase/migrations/`: database tables, NCAA tournament records, and job schedules.

## Security and operations
- Never commit live password hashes, session tokens, invitation codes, Supabase connection strings, or service keys. The current public Git repository contains code and schema, not migrated private data.
- All league tables have RLS enabled and explicitly deny direct `anon` / `authenticated` access. The API authenticates each manager before serving league data or allowing mutations.
- GitHub Pages uses a Bearer token in localStorage; users must **sign in again** after moving from the Cloudflare Worker. Previous usernames/passwords remain valid because their PBKDF2 password hashes were migrated.
- Supabase scheduled jobs use a random 256-bit secret generated inside PostgreSQL, stored encrypted in Vault, with only the SHA-256 hash in the private `settings` table. The raw secret is not in the Git repository.
- Background jobs can be monitored with `SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'boek_%'`; API responses are in `net._http_response` (typically retained six hours).
- Pages site uses the default deployed Supabase API URL, overridable via `BOEK_API_BASE`.

## Rollback
The previous Cloudflare Worker/D1 site and original database are preserved until the Pages URL, account login, signups, draft, results and trading are verified. **Avoid running both sites as independently writable live leagues after launch.** Disable old D1 ingestion or redirect the old site after the Pages cutover.

## Verification already performed
- Imported all 26,176 previously recorded D1 basketball games; manager/settings/invites, 135 imported programs, 1,794 NET rankings, 1,794 NET detail rows, 335 NCAA tournament results, 573 awards, 827 date/group coverage records, and 25 AP rankings.
- Live `/status` returned HTTP 200 from Supabase with the league name and membership count.
- Unauthenticated `/state` returned HTTP 401.
- `/login` validation returned HTTP 400 and the correct GitHub Pages CORS origin.
- Protected scheduled `ncaa`, `verify-leaders`, `verify-quads`, and `live` job routes returned HTTP 200. The live job fetched ESPN events successfully.
- Historical leader calculation produced 1,988 program-season records across 365 programs and seasons 2021–22 to 2026–27.
- Full browser registration/login/draft/trade testing requires a manager session and must still be completed before an irreversible shutdown of D1.

## Deploy
1. Enable GitHub Actions as the Pages source in repository Settings if necessary.
2. Push changes to main (workflow builds and publishes).
3. Confirm `https://ufboek.github.io/BoekDynasty/` loads, log in with an existing manager account, and validate results.
4. After the site and accounts work, retire the Cloudflare Worker ingestion. Do not erase D1 until verified.
