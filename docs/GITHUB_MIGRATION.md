# GitHub Pages migration (staged, not live)

This branch prepares the public frontend to run on GitHub Pages. It is intentionally **not** deployed yet. The current site and existing D1 data remain untouched.

## Target architecture

- Public website: GitHub Pages from this repository at `/BoekDynasty/`.
- Private league state, accounts, invitations, draft order, trades, and sessions: Supabase PostgreSQL, with server-side authorization and transactional writes.
- Application API: HTTPS backend backed by Supabase, preserving the current `/api/*` contract where possible.
- Historical and live game data: GitHub Actions imports of verifiable ESPN source data into public, static season/date JSON assets, avoiding high-volume writes to the league's operational database.
- **Never** commit the live D1 database dump, password hashes, session tokens, invitation codes, database service keys, or secret environment variables to this public repo.

## Deployment

1. Connect a Supabase project and migrate SQL schema/data with credentials protected.
2. Reimplement and test API endpoints in PostgreSQL or its Edge Functions, including username/password migration, session management, draft atomicity and trade atomicity.
3. Point the GitHub Actions repository variable `BOEK_API_BASE` to the new HTTPS API base URL; the static client sends API requests to `BOEK_API_BASE + '/' + route`.
4. Ensure the API permits the Pages origin and uses secure authentication. Cross-site cookies may be restricted by browsers, so validate login across Safari/Chrome or adopt first-party JWT sessions.
5. In GitHub repository Settings → Pages, select GitHub Actions as publishing source. Run the `Deploy Boek Dynasty to GitHub Pages` workflow manually after the backend is working.
6. Test signup, login, draft picks from two simultaneous managers, trades, game results, standings, and program profiles before decommissioning D1 and the Cloudflare app.
7. After validation, change the Pages workflow trigger to include push to `main` for regular deployments.

The build will **fail safely** if `BOEK_API_BASE` is missing. It cannot accidentally publish a copy that still writes to D1 without configuring a backend. No public database credentials are required or allowed.
