# Boek Dynasty

Permanent fantasy college basketball dynasty league starting in the **2026–27 season**. Managers draft **NCAA programs**, not individual athletes, and **keep those programs across future seasons** unless traded. Season-long scoring weights are configured, with **best 12 programs counting** per manager. Historical game results from 2021–22 onward, NET rankings, NCAA tournament awards, and live scoreboard updates are stored in Supabase.

## Live app

https://boek-dynasty.fig-league-archive.workers.dev/

**Current production:** GitHub contains the app code, Cloudflare Worker `boek-dynasty` serves the familiar website as a stateless compatibility frontend, and **Supabase PostgreSQL** provides accounts, league state, scoring history, drafts, and trades. The live Worker has no D1 binding or cron jobs. The old D1 database is retained only as a rollback snapshot. GitHub Pages deployment is prepared but awaits the repository owner's Pages enablement setting. This is separate from Fantasy League Records / BoekMuse.

## Deployment status

The live URL above has been migrated off Cloudflare D1. Users must sign in again with their existing usernames and passwords because sessions moved from cookies to bearer tokens. Production uses the Supabase API at `https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api` and Supabase scheduled imports. All game history and current league settings were migrated, including 7 manager slots, a 16-round draft, and best-12 scoring.

GitHub Pages at `https://ufboek.github.io/BoekDynasty/` remains **unpublished** until the repository owner goes to **Settings → Pages → Build and deployment → Source: GitHub Actions** and reruns the Pages deployment. See [deployment notes](docs/GITHUB_MIGRATION.md). Do not tell managers to use the unpublished Pages URL.

## Features

- **Configurable manager cap (2–20)**, including the commissioner; PostgreSQL validates capacity at registration with a settings-driven database trigger.
- One-time commissioner setup code, then single-use invitation links valid for 7 days.
- Each manager creates a team with a username, team name, and password.
- Passwords hashed with PBKDF2-SHA256 using Cloudflare-compatible 100,000 iterations; server-verified bearer sessions expire after 90 days and renew on use.
- Commissioner settings are organized into General, Draft, Programs, Members, Scoring, and Trades. The commissioner can rename the league, set the manager cap (2–20), configure conferences and draft rounds (1–20), reorder/shuffle draft positions before the draft, manage invitations, and enable/disable trading.
- College basketball conference membership from a verified 2026–27 ESPN standings snapshot (via SportsDataverse), bundled with the app; manual program entry if a school is missing.
- Initial snake-format draft, with exclusive ownership, turn checks, pause/resume and pre-completion commissioner reset.
- **Permanent rosters:** draft selections remain immutable draft history, while `program_owners` tracks the current owner from year to year.
- **My Team workspace:** View your complete roster, open program profiles, release programs when waivers are enabled, review incoming/outgoing trades and accept/decline/cancel pending offers, and review waiver claims. No annual redrafts.
- **Manager-to-manager trades:** select schools from each roster, send an offer, and accept, decline or cancel. Both owners' programs transfer together after acceptance, with server-side validation against stale offers. League-wide trade activity is visible.
- Responsive desktop/mobile design and PWA home-screen setup.
- **Scoring tab:** regular-season wins, Q1/Q2/Q1A bonuses, conference championships, NCAA appearance seed tiers, NCAA wins, and a +15 national championship bonus. AP and KenPom award no points. Commissioner can edit the settings; members can view them.
- Historical game data and live score ingestion use ESPN feeds and verified award records. Fantasy points follow the configured scoring rules; incomplete inputs are not presented as verified.

## Interface copy and layout

Treat Boek Dynasty as a functional league application, not a marketing landing page. Keep authentication compact and league pages focused on the status, programs, owners, picks, trades and actions users actually need. Avoid oversized promotional headlines, motivational slogans, filler descriptions and repetitive instructions. Use short, informative labels; add help text only when a rule, error or action needs explanation.

## League display and program imports

The navigation uses **League Overview** for a league-wide dashboard and **My Team** for permanent program ownership, incoming/outgoing trade review, and waiver activity. **Standings** remains the season scoring table. Rankings use imported, verified results and disclose incomplete historical NET or award coverage; the site does not invent game points. The Programs directory includes search, conference and ownership filters.

When the commissioner opens the site with a pending draft, the frontend checks for selected conferences with no imported programs and imports their 2026–27 rosters from the bundled verified program directory, in small batches. Once the imports finish, the program directory shows schools and their ESPN CDN logos (where available). The commissioner can also manually use **Import selected programs** to retry or refresh. Existing ownership and draft picks remain unchanged.

## Free power ratings (informational)

The **Schools → Power ratings** tab provides season-selectable Bart Torvik T-Rank team rankings for 2021–22 through 2026–27, including adjusted offensive/defensive efficiency, Barthag, WAB and tempo. Each program's profile shows the same metrics for the selected season. During the current season **before official NCAA NET is released**, T-Rank standings serve as a clearly labeled **provisional quadrant source** for Q1, Q1A and Q2 scoring. Once a complete official NCAA NET snapshot is imported, NET takes precedence automatically. Historical seasons are always classified using official NCAA NET. The use of T-Rank does not change venue thresholds, league weights, program ownership or draft logic.

The public, no-key Torvik `{year}_team_results.csv` files are fetched by the Supabase Edge Function at `GET /functions/v1/boek-api/data/ratings?year=2026` (and proxied via the Cloudflare Worker as `/api/data/ratings?year=2026`). `supabase/functions/boek-api/ratings.js` validates the CSV schema, ensures full Division I coverage, and caches responses for 6 hours (current season) or 24 hours (past seasons) per warm function instance. Failed or incomplete imports show an explicit unavailable state; no synthetic data is substituted. ESPN program-name crosswalks are conservative and may leave some schools unmatched.

EvanMiya and KenPom are available as **external links only**. Their paid/restricted API or bulk exports are not scraped, redistributed, or presented as integrated numerical ratings. A public download URL is not a blanket redistribution license; confirm provider permissions before expanding public redistribution or high-frequency automation. The site does not require any paid analytics subscription.

## Provisional quadrant import and NCAA NET handoff

- Source: daily `2027_team_results.csv` from Bart Torvik (via `supabase/functions/boek-api/ratings.js`), with a strict unique ESPN school-ID crosswalk of at least **350 Division I programs**.
- Storage: `cbb_preliminary_rankings` (Supabase PostgreSQL), separate from `cbb_net_rankings` and `cbb_net_snapshots`. A single transactional replace prevents half-imports from altering fantasy points.
- Job: `boek_torvik_preliminary` via pg_cron at `05 12 * * *` UTC; commissioner can also trigger **Sync preliminary T-Rank** in Commissioner → Data. Import skips once complete official NET exists.
- Calculations: `activeRankings()` chooses official NET if complete; otherwise preliminary T-Rank if at least 350 unique schools. `historicalLeaders()`, program history, game cards and quadrant counts all follow the same source with a provisional flag.
- **Important:** preliminary T-Rank cannot be presented as official NCAA NET. Treat these bonuses and best-ball totals as estimates. At year-end, final official NET controls historical classifications.

## Architecture

The site is backed by **Supabase PostgreSQL** and its Edge Function API. All sources and deployment builds are in this GitHub repository. The existing Cloudflare Worker now serves only static assets and proxies authenticated API calls to Supabase; it does not use D1. The 2026–27 program directory remains bundled from the SportsDataverse ESPN standings snapshot; review school membership before drafting.

- `data/programs-2027.json` vetted 2026–27 programs with 365 ESPN team IDs and all 32 conferences
- `src/client.js` browser interface
- `src/style.css` visual system
- `src/server.js` legacy D1 Worker/API reference (not active)
- `src/worker-proxy.js` production stateless Worker HTTP frontend and Supabase API proxy
- `supabase/functions/boek-api/server.js` active API implementation
- `supabase/functions/boek-api/results.js` game imports and scoring
- `supabase/migrations/` PostgreSQL schema and ten scheduled ingestion jobs
- `src/index.html` HTML shell
- `schema.sql` historical D1 schema (rollback reference)
- `scripts/build-worker-proxy.mjs` builds the stateless Worker served at the original URL
- `dist/worker-proxy.js` deployed Worker bundle
- `scripts/build-pages.mjs` builds the pending GitHub Pages frontend
- `.github/workflows/deploy-pages.yml` automatically deploys Pages after GitHub Pages is enabled

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
- Six primary bottom tabs: League, My Team, Programs, Draft, Standings, and More. League Overview and My Team have distinct desktop navigation entries. Trades, Commissioner (for authorized accounts), and sign-out are available through More. Desktop keeps the full sidebar.
- On phones, school cards use a compact two-row layout, full-width filters and search, and incremental batches of 24 schools; all eligible schools remain searchable.
- Draft view puts the actionable pick link above the board and displays the latest 12 picks with an option to expand; draft order appears ahead of picks on narrow screens.
- Trade offers have larger checkbox targets, selection counts and a disabled-until-valid submit button.
- Standings show the essential team/schools/points columns without mandatory horizontal scrolling. Commissioner pages display compact section navigation.
- Safe-area-aware fixed navigation, 16px form inputs to prevent iOS focus zoom, 44px-or-larger touch targets, and keyboard-preserving refreshes.
- Polling stays at roughly 12 seconds during a live draft; on mobile when the draft is not live it backs off to 30 seconds and skips inactive browser tabs. Commissioner editing is not interrupted by periodic refresh.

Mobile markup and JavaScript were smoke-tested across multiple pages and manager roles. Visual testing on physical devices remains recommended.

## Permanent dynasty features

**Profiles:** Each program opens an owner/conference/original-draft record, roster movement history and archived-season owners. Each manager opens a roster, number of recorded championships and archived-season participation. Game records and fantasy totals stay explicitly pending until a trusted results/scoring feed is configured.

**Draft room:** A redesigned in-place pick desk. Managers can search eligible undrafted programs, filter by conference, sort by current Torvik T-Rank / name / conference, maintain a browser-local shortlist, preview a school, and explicitly confirm their selection without leaving the Draft Room. School colors and ESPN logos decorate the complete, original snake draft board, with a current-round and my-picks mode, live manager tracker, upcoming picks and recent selections. Mobile uses a dedicated confirmation sheet. The server still enforces the pick order, eligibility and program availability; the timer remains informational and never auto-drafts.

**Permanent seasons:** The commissioner can archive a completed season and advance the current-season label. This copies the current roster ownership into `season_rosters` and creates per-manager season records. It does **not** clear `picks` or `program_owners`, restart the initial draft, or alter trades. Prior champions can be recorded against archived seasons by the commissioner. Until scoring is available, fantasy points and final standings remain null; do not claim historical ranks or winners.

**Waivers:** Disabled by default. When enabled by the commissioner after the inaugural draft, managers can submit a claim on any eligible unrostered program, optionally naming a school to drop to make room, cancel a claim, or directly drop a school. Claims enter a visible queue and require commissioner approval/denial. Approval checks availability/ownership/capacity again and transfers the program atomically. All accepted claims and drops are logged in `roster_transactions`. This is a commissioner-reviewed waiver process, **not automated priority processing**.

Apply `migrations/003_dynasty_seasons_waivers_clock.sql` to existing production D1 before deploying this version. The migration only creates new tables and settings. No existing schools, managers, picks, accepted trades or ownership records are modified.

## Basketball results pipeline

The scoring **weights** may be configured separately, but this pipeline does **not** award fantasy points. It only stores traceable games and ranking inputs.

**Sources & normalization**
- Primary: public ESPN site-v2 men's basketball scoreboard with `groups=50`, date `YYYYMMDD`, and 500-event safety limit; a second ESPN CDN representation is attempted if the first is unavailable. These endpoints are undocumented/unauthenticated and can block Workers, return incomplete results, or change schema. Do not treat a successful deployment as proof of successful upstream ingestion.
- Maps ESPN team IDs to the 365-school verified 2026–27 directory. Retains games involving any known Division I school; original scores, opponent names, game status, time, location, conference flag, and an *unverified* tournament tag are persisted in `cbb_games`.
- A game is only counted as final if the ESPN feed explicitly says it is final and both scores are valid. Canceled/postponed games never become losses. Existing rows update only when content changes.
- Every import creates an audit record in `cbb_sync_runs`. Errors, HTTP failures, missing data and malformed shapes remain visible under **Commissioner → Data** and the **Results** screen.

**Automatic updates**
- Cloudflare Cron Trigger `*/15 * * * *` checks scoreboards every 15 minutes throughout the day and night, November–April. The collector skips offseason months but does not miss overnight score corrections.
- Cloudflare Cron Trigger `15 10 * * *` rechecks the past seven days and imports the next three days of scheduled matchups at 10:15 UTC daily. This preserves earlier results and matches by ESPN event ID.
- `wrangler.toml` declares both triggers; for manual Cloudflare API deployments, update the Worker's Cron Trigger schedules separately. `results_auto_sync` controls whether the scheduled handler runs.
- **Commissioner → Data** can import a specific date, retry the past seven days, preload three upcoming days, disable auto polling, and view logged failures.

**NET and quadrant metadata**
- Rankings are separate dated snapshots in `cbb_net_rankings`. NET rankings are generally not available at the start of November; the site must never carry over the previous season's values.
- Commissioners can import official NET snapshots as `ESPN_TEAM_ID,NET_RANK` CSV rows. Imports are rejected if dates/IDs/ranks are invalid, duplicate, or fewer than 250 Division I schools. Every snapshot has season/date/source provenance. A duplicate date is not overwritten silently.
- Optional **provider override**: set `NET_FEED_URL` as a Worker environment variable (or secret) to a trusted, authorized JSON endpoint returning `{"date":"2026-12-01","records":[{"program_id":"57","net_rank":4}, ...]}`. By default, after December 8 the nightly job attempts the NCAA ranking API proxy and audits it; setting NET_FEED_URL overrides that default. Only use feeds for which you have redistribution/access rights.
- Provisional Q1/Q1A/Q2/Q3/Q4 wins are derived from finished games, actual home/away/neutral venue and the latest complete **current-season T-Rank fallback**, until a complete **official current-season NCAA NET snapshot** exists. Imported official NET always wins; historical seasons never use T-Rank. All fantasy points are recomputed from the active ranks, so existing early-season bonuses and standings automatically change as ranking sources change.
- Program profiles load current season W–L and game log on demand, plus NET and provisional quadrant counts. **Standings points remain pending** until an independently verified scoring calculation is implemented.
- Commissioner-supported manual achievements (season champions, NCAA seed and wins, national champion and optional final KenPom ranking) go into `cbb_awards` with source references. These are factual inputs, not fantasy points.

**Data migration and tests**

Run `npx wrangler d1 execute boek-dynasty-db --remote --file=migrations/004_cbb_results.sql
npx wrangler d1 execute boek-dynasty-db --remote --file=migrations/005_cbb_coverage.sql
npx wrangler d1 execute boek-dynasty-db --remote --file=migrations/006_ap_top25.sql` before deploying a Worker with `src/results.js`. Then run `node --test tests/results.test.mjs` to validate event normalization and quadrant boundaries. The migration is additive and preserves members, ownership, trades and draft history.

**Important limitations:** ESPN feed reachability from the actual Cloudflare Worker must be verified via **Commissioner → Data → Import date** or a real Cron run. No live scoreboard fetch has been confirmed just by deploying code. NCAA NET automatic ingestion requires an authorized NET feed; until one is connected, NET data must be imported by the commissioner. ESPN tournament annotations can be incomplete and should not be treated as authoritative bracket data.

## Complete game and NET coverage checks (2026–27)

- The scoreboard importer requests **all published Division I scoreboard games** from ESPN group 50, plus group 100 for NCAA Tournament games in March/April. Nightly reconciliation also checks group 55 (CBI) and group 56 (CIT). ESPN's CDN representation is the network fallback. A failed required group aborts that date rather than presenting an incomplete slate as complete. Results include unrecognized ESPN team IDs so newly eligible or non-Division-I opponents do not disappear.
- The app stores each ESPN event once, keyed by provider game ID, and records both the score and the source group/venue. Each successful source/date/group is saved in `cbb_game_coverage`. The Results screen displays **verified dates** and **dates not verified**. The commissioner can manually repair four missing dates; nightly reconciliation also progressively repairs gaps.
- Scores are retained for **all Division I programs**, including games where the team is not one of the league's 135 draft-eligible schools. `data/net-name-crosswalk-2027.json` maps all **365 verified ESPN schools** to their short NCAA-style name. A fixture with all 365 names passes the NET mapping test; this does not prove actual live NCAA naming parity until the first official 2026–27 release.
- On and after **December 8, 2026**, the nightly job will **attempt** NCAA NET ingestion through the public open-source NCAA API proxy (`ncaa-api.henrygd.me`). It refuses ranking lists shorter than 350 schools, duplicate rankings/IDs, unrecognized names, or recognizably stale previous-season standings, and logs failures. Before December, the NCAA does not publish current-season NET; do not import prior-year ranks. Source availability and naming still require production verification.
- NCAA NET source fields are retained in `cbb_net_details`, not just the ranking. A snapshot is only used by the site if `cbb_net_snapshots` says **complete** and both rankings and details passed row-count verification. Interrupted uploads cannot silently alter quadrant calculations.
- The configured `NET_FEED_URL` may override the public NCAA proxy with a trusted authorized JSON provider. Commissioner NET uploads remain available. Source ranks are current-season-specific and NET-dependent quadrant wins are provisional until final rankings.

**Apply** `migrations/005_cbb_coverage.sql` after 004 before deploying. The migration only adds audit, source-row, and snapshot-status tables.

**Do not confuse scheduled collection with verified collection:** An ESPN or NCAA endpoint can return HTTP 403 or an unexpected response from Cloudflare. The live league should only be considered fully populated after import logs show genuine returned games, all required calendar dates verified, and a current-season NET snapshot with complete school coverage. The live 2026–27 NET feed is not available in early November.

## November 2026 visual and navigation refinement

- **Draft Room:** A true full-width **snake draft grid** with manager columns and round rows. Even rounds reverse overall pick order, while manager positions remain fixed. Selected schools display ESPN logos and link to their profiles; the on-clock pick and current manager column are highlighted. Full board, current round, and my-picks views work on mobile with horizontal and vertical scrolling. Recap panels show the most recent and upcoming selections. The draft action still uses the existing authenticated `draft/pick` endpoint; no auto-picks were added.
- **League Overview:** Removes redundant rostered-program and draft-pick metrics. Replaces the old league-roster table with compact manager tiles, each showing their owned programs as small school logos. Empty rosters are labeled honestly.
- **Standings:** Removes school counts and roster previews; keeps manager name and pending fantasy-point totals until real scoring is enabled.
- **Scores & Results:** Browses games by a selected Eastern-time date, with seven-day date navigation, a calendar picker, conference filtering, My League filtering, and verified **current AP Top 25** filtering. The daily endpoint returns up to 1,000 date-matched games (instead of the most recent 80 irrespective of date), including team conference IDs. Cards show logos, game status, scores, and links to ESPN box scores.
- **AP poll data:** Uses ESPNs site-v2 rankings endpoint; validates the year and a complete 25-school AP poll, then archives dated snapshots in `cbb_ap_rankings`. Daily collection attempts to update it; Commissioner → Data has a manual refresh button. Without a verified AP snapshot, Top 25 displays a descriptive unavailable state rather than claiming a fabricated ranking. AP ranks are **display metadata only**, not scoring or NET quadrant inputs.
- **Best ball:** Commissioner → General includes a separately saved best-ball setting, with a count from 1 through the draft round count. Only the `best_programs` configuration changes; all other scoring weights remain untouched. The scoring settings page links users back to General for this value.
- **Visual density:** Reduces oversized panels, sharpens typography and focus behavior, and adds restrained active, hover and live-score states while preserving the existing navy/white/orange scheme.
- **Deployment:** Apply `migrations/006_ap_top25.sql` before deploying. This only adds the AP ranking snapshot table.
- **Regression tests:** `node --test tests/ui.test.mjs` and `node --test tests/results.test.mjs`.

## November 2026 mobile, directory and history improvements

- **Mobile navigation:** Seven compact accessible tabs, with Results on the bottom bar alongside League, My Team, Schools, Draft, Standings and More. Results is no longer hidden behind More on mobile.
- **Programs directory:** Full-text school search, fast conference chips, conference dropdown, All/Available/Rostered/My Programs state filters, A–Z jump strip, sorting by name/conference/availability and compact school logo cards. Filter and sort choices persist while browsing school profiles.
- **School profiles:** Small identity header, current owner, W–L, NET and earned scoring preview, plus selectable year cards from **2021–22 through the current season**. Each historical year shows calculated points only for available verified components; a dash means the year has not been imported. The game log and old transactions are collapsed by default for compact browsing. Current-year and prior-year totals are not shown as finalized fantasy scores when NET, tournament or awards data is missing.
- **Scoring previews:** `GET /api/data/history?id=ESPN_ID` computes an auditably derived partial point total using the league's current scoring weights, recorded regular-season final wins, validated latest season NET quadrant information when available, and commissioner-verified postseason/conference achievements. It does not invent wins, NET, championship bonuses or exact missing totals. If there is no verified season data, it returns `null`, never zero.
- **Historical backfill:** Each 15-minute live-game check attempts three missing historical scoreboard dates, newest first, working from 2025–26 backward to 2021–22. Checked date/source groups are retained in `cbb_game_coverage`; failures are audited in `cbb_sync_runs` with retry throttling. Commissioners may manually advance three dates at a time in Commissioner → Data. This pipeline is incremental, not an instant one-time historical load, and historical fantasy totals remain partial until full source and postseason coverage is verified.
- **AP Top 25:** Seeded the **October 19, 2026 preseason Associated Press poll** from the official NCAA rankings page (`data/ap-polls/2026-preseason.json`) with 25 verified ESPN IDs into `cbb_ap_rankings`. Current Results Top 25 filtering immediately works, even if future ESPN poll access is blocked. Automatic refresh tries ESPN first, then the NCAA basketball men's Associated Press proxy, and refuses incomplete or mismatched school lists. Snapshot source/date are preserved. No AP Poll points are awarded in league scoring.
- **My Team:** Compact identity card with real roster logos, progress bar toward the manager's permanent roster size, best-ball count, more helpful empty states and cleaner roster/trade/waiver sections.

## November 3, 2026 historical scoring repairs

- Historical scoreboard ingestion now runs every minute, selecting up to eight unchecked dates in rotation across **all five seasons (2021–22 through 2025–26)**. The dates, source groups, imported games and failures are persisted in D1; current-season polling continues independently every fifteen minutes.
- Commissioner → Data now displays per-season checked dates, collected games, historical NET coverage and verified achievement counts. Commissioners can manually advance eight historical dates, import historical NET for a selected season, or enter source-cited conference/postseason achievements for any season back to 2021–22.
- Archived final NET is imported separately by season from Warren Nolan. Strict school-ID alias matching and a threshold of at least 350 validated Division I programs prevent incomplete or misidentified rankings from silently entering quadrant scoring. Provider errors are audited and retried.
- Historic program scores display verified partial totals, including regular wins, NET-dependent Q1/Q1A/Q2 wins, recorded NCAA tournament wins and source-backed achievements. Until full schedules, seeds and all conference/postseason achievements are verified, no program-year total should be described as final.
- Official NCAA national champions have been backfilled for each of the five completed seasons (Kansas 2022, Connecticut 2023 and 2024, Florida 2025, Michigan 2026), with source https://www.ncaa.com/history/basketball-men/d1. These are production data rows; they are not recalculated from incomplete game imports.

## November 3, 2026: historical fantasy scoring and Schools/Results navigation

**The scoring data is now imported or staged as follows:**
- NCAA seeds for 2022–2026: all 68 teams per season, including four verified 2026 First Four seeds.
- Conference tournament champions: 32, 32, 32, 31 and 31 records by season (2022–2026).
- National champions: one verified winner per completed season.
- NCAA Tournament results: 67 verified matchups and four First Four wins per year for 2022–2025; 2026 results are reconstructed from verified ESPN final matchups between NCAA-seeded teams as the March backfill completes.
- Conference regular-season championships: 185 verified champion/co-champion records for 2022–2026 stored in `data/historical-conference-2022-2026.json`. Both `programHistory` and `historicalLeaders` count these records **immediately**, even if the database write quota blocks D1 archival. A later quota-safe import writes only missing rows.
- Source snapshot: `data/historical-postseason-2022-2026.json` provides NCAA seeds, game results and conference tournament winners; `migrations/007_ncaa_tournament_results.sql` creates the independently verified NCAA game table.

**Quad venue thresholds:** Q1 is opponent NET rank 1–30 at home, 1–50 neutral and 1–75 away. Q2 is ranks 31–75 at home, 51–100 neutral and 76–135 away. Q1A is ranks 1–15 home, 1–25 neutral and 1–40 away. Q1A stacks on Q1. The score parser stores ESPN's home/away competitor identities and separate `neutral_site` flag; scoring uses the winning team's own venue, never blindly assumes that an ESPN-designated home team at a neutral site is playing at home. Postseason games are excluded from the regular-season quad calculation. Each historical season uses that season's verified *final* NET.

**Interface updates:** Schools has accessible pill-based conference and sort filters plus a dedicated **Historical Leaders** tab with all 365 known Division I schools, a searchable all-season scoring table, year buttons and school profile links. Results uses a dense multi-column grid of compact game cards and a horizontally scrollable conference button strip, without the previous select dropdowns. All previous authenticated league and dynasty ownership rules remain intact.

**Cloudflare capacity:** On November 3, 2026 the free D1 database reached its daily write quota while ingesting hundreds of historical dates. The Worker now runs 8 ordinary and 8 priority-postseason dates every **30 minutes**, rather than every minute; this keeps the continuous backfill at a sustainable pace after quota renewal. Live games still update every 15 minutes. Incomplete historical seasons remain labeled *partial*; do not describe unfinished game coverage as a final season score. Tests include regression cases for home/neutral/away Q1 and Q1A scoring, stacked First Four/NCAA wins, archived championship fallback and the Schools/Results controls.

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
npx wrangler d1 execute boek-dynasty-db --remote --file=migrations/004_cbb_results.sql
node scripts/build.mjs
npx wrangler deploy
```

The migration uses `CREATE TABLE IF NOT EXISTS`, restores owners from any existing draft picks with `INSERT OR IGNORE`, and installs a trigger to assign future drafted schools. It does not erase existing accounts or draft history. Back up D1 before database migrations. Running only `node scripts/build.mjs` and `npx wrangler deploy` without migrating the existing D1 database first will cause authenticated API calls to fail.

Changing GitHub files alone does **not** update the deployed Worker; deployment is currently manual.

If recreating D1: `npx wrangler d1 execute boek-dynasty-db --remote --file=schema.sql`, then securely provision a random commissioner bootstrap code and store only its SHA-256 digest in `settings.setup_hash`. Never commit a bootstrap code.

## Not yet implemented

Real live game results and scoring ingestion, year-end roster snapshots / season rollover UI, account recovery, email verification, advanced commissioner reorder/shuffle tools, draft-pick trading and free agency. The initial goal is a usable shared fantasy league shell, account management, eligible program selection and drafting.
