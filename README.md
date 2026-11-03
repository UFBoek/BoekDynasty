# Boek Dynasty

Permanent fantasy college basketball dynasty league starting in the **2026–27 season**. Managers draft **NCAA programs**, not individual athletes, and **keep those programs across future seasons** unless traded. Season-long scoring weights are configured, with **best 8 programs counting** per manager. Verified game results are not yet connected.

## Live app

https://boek-dynasty.fig-league-archive.workers.dev/

This project has its own source repository, Cloudflare Worker (`boek-dynasty`), and D1 database (`boek-dynasty-db`). It does **not** reuse or modify any Fantasy League Records / BoekMuse infrastructure.

## Features

- **Configurable manager cap (2–20)**, including the commissioner; D1 validates capacity at registration with a settings-driven database trigger.
- One-time commissioner setup code, then single-use invitation links valid for 7 days.
- Each manager creates a team with a username, team name, and password.
- Passwords hashed with PBKDF2-SHA256 using Cloudflare-compatible 100,000 iterations; 90-day HttpOnly, Secure, SameSite cookies renew on use.
- Commissioner settings are organized into General, Draft, Programs, Members, Scoring, and Trades. The commissioner can rename the league, set the manager cap (2–20), configure conferences and draft rounds (1–20), reorder/shuffle draft positions before the draft, manage invitations, and enable/disable trading.
- College basketball conference membership from a verified 2026–27 ESPN standings snapshot (via SportsDataverse), bundled with the app; manual program entry if a school is missing.
- Initial snake-format draft, with exclusive ownership, turn checks, pause/resume and pre-completion commissioner reset.
- **Permanent rosters:** draft selections remain immutable draft history, while `program_owners` tracks the current owner from year to year.
- **Manager-to-manager trades:** select schools from each roster, send an offer, and accept, decline or cancel. Both owners' programs transfer together after acceptance, with server-side validation against stale offers. League-wide trade activity is visible.
- Responsive desktop/mobile design and PWA home-screen setup.
- **Scoring tab:** regular-season wins, Q1/Q2/Q1A bonuses, conference championships, NCAA appearance seed tiers, NCAA wins, and a +15 national championship bonus. AP and KenPom award no points. Commissioner can edit the settings; members can view them.
- No fabricated game results or fantasy points. Live results integration and year-end awards come later.

## Interface copy and layout

Treat Boek Dynasty as a functional league application, not a marketing landing page. Keep authentication compact and league pages focused on the status, programs, owners, picks, trades and actions users actually need. Avoid oversized promotional headlines, motivational slogans, filler descriptions and repetitive instructions. Use short, informative labels; add help text only when a rule, error or action needs explanation.

## League display and program imports

The navigation uses **Standings** for the league standings table. Scores remain unranked until verified results ingestion is connected; the site does not invent game points. The Programs directory includes search, conference and ownership filters.

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

## Mobile layout

The authenticated app has a dedicated responsive phone layout:
- Five primary bottom tabs: Overview, Programs, Draft, Standings, and More. Trades, Commissioner (for authorized accounts), and sign-out are available through More. Desktop keeps the full sidebar.
- On phones, school cards use a compact two-row layout, full-width filters and search, and incremental batches of 24 schools; all eligible schools remain searchable.
- Draft view puts the actionable pick link above the board and displays the latest 12 picks with an option to expand; draft order appears ahead of picks on narrow screens.
- Trade offers have larger checkbox targets, selection counts and a disabled-until-valid submit button.
- Standings show the essential team/schools/points columns without mandatory horizontal scrolling. Commissioner pages display compact section navigation.
- Safe-area-aware fixed navigation, 16px form inputs to prevent iOS focus zoom, 44px-or-larger touch targets, and keyboard-preserving refreshes.
- Polling stays at roughly 12 seconds during a live draft; on mobile when the draft is not live it backs off to 30 seconds and skips inactive browser tabs. Commissioner editing is not interrupted by periodic refresh.

Mobile markup and JavaScript were smoke-tested across multiple pages and manager roles. Visual testing on physical devices remains recommended.

## Permanent dynasty features

**Profiles:** Each program opens an owner/conference/original-draft record, roster movement history and archived-season owners. Each manager opens a roster, number of recorded championships and archived-season participation. Game records and fantasy totals stay explicitly pending until a trusted results/scoring feed is configured.

**Draft room:** Shows a complete round-by-round snake board including empty upcoming slots, commissioner-readiness checks, the live picking manager, recent selections and an optional 1/2/3/5/10/15/30-minute countdown. The timer is informational; expiry does not cause automatic picks. Commissioner can change the clock when the draft is pending or paused. The real pick order is unchanged.

**Permanent seasons:** The commissioner can archive a completed season and advance the current-season label. This copies the current roster ownership into `season_rosters` and creates per-manager season records. It does **not** clear `picks` or `program_owners`, restart the initial draft, or alter trades. Prior champions can be recorded against archived seasons by the commissioner. Until scoring is available, fantasy points and final standings remain null; do not claim historical ranks or winners.

**Waivers:** Disabled by default. When enabled by the commissioner after the inaugural draft, managers can submit a claim on any eligible unrostered program, optionally naming a school to drop to make room, cancel a claim, or directly drop a school. Claims enter a visible queue and require commissioner approval/denial. Approval checks availability/ownership/capacity again and transfers the program atomically. All accepted claims and drops are logged in `roster_transactions`. This is a commissioner-reviewed waiver process, **not automated priority processing**.

Apply `migrations/003_dynasty_seasons_waivers_clock.sql` to existing production D1 before deploying this version. The migration only creates new tables and settings. No existing schools, managers, picks, accepted trades or ownership records are modified.

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
npx wrangler d1 execute boek-dynasty-db --remote --file=migrations/003_dynasty_seasons_waivers_clock.sql
node scripts/build.mjs
npx wrangler deploy
```

The migration uses `CREATE TABLE IF NOT EXISTS`, restores owners from any existing draft picks with `INSERT OR IGNORE`, and installs a trigger to assign future drafted schools. It does not erase existing accounts or draft history. Back up D1 before database migrations. Running only `node scripts/build.mjs` and `npx wrangler deploy` without migrating the existing D1 database first will cause authenticated API calls to fail.

Changing GitHub files alone does **not** update the deployed Worker; deployment is currently manual.

If recreating D1: `npx wrangler d1 execute boek-dynasty-db --remote --file=schema.sql`, then securely provision a random commissioner bootstrap code and store only its SHA-256 digest in `settings.setup_hash`. Never commit a bootstrap code.

## Not yet implemented

Real live game results and scoring ingestion, year-end roster snapshots / season rollover UI, account recovery, email verification, advanced commissioner reorder/shuffle tools, draft-pick trading and free agency. The initial goal is a usable shared fantasy league shell, account management, eligible program selection and drafting.
