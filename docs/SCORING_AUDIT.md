# Fantasy scoring audit — November 2026

This audit covers five completed NCAA men's basketball seasons (2021–22 through 2025–26) using the league's persisted scoring settings. The Supabase Edge API is the scoring engine; the stateless Cloudflare Worker serves the site.

## Point rules and verified source

| Component | Fantasy points | Verified source |
| --- | ---: | --- |
| Regular-season win | +1 | Completed ESPN game, season type 2, excluding conference tournament |
| Conference tournament win | +2 | Completed, positively identified conference tournament game |
| Quad 2 win | +0.5 | Final season NET of opponent; winner's actual home/away/neutral venue |
| Quad 1 win | +1.5 | Final season NET of opponent; winner's actual home/away/neutral venue |
| Extra Quad 1A win | +1 | Additional bonus for a qualifying Quad 1 win |
| Conference regular champion | +8 | Imported verified conference regular-title records (co-champions can qualify) |
| Conference tournament champion | +8 | Imported conference tournament title records |
| NCAA seed 1–4 | +8 | Verified NCAA Tournament bracket, one appearance award |
| NCAA seed 5–8 | +6 | Same |
| NCAA seed 9–12 | +5 | Same |
| NCAA seed 13–16 | +4 | Same |
| NCAA Tournament victory | +3 | One of the 63 main-bracket games per completed season |
| Multi-Bid & Mid-Major at-large selection | +5 | Seeded in NCAA Tournament without winning its conference tournament; awarded after conference auto-bid champions are verified (31+ titles); does not apply to Pac-12 |
| Eligible NCAA upset seed line | +1 per line, no cap | NCAA win over a better seed; current Multi-Bid & Mid-Major conference group or Pac-12; winner seed minus opponent seed |
| First Four victory | +2 | One of four First Four games per completed season |
| National championship | +15 | Confirmed champion award; stacks with its final-game victory |
| Manager season total | Best **12** programs | Sort current owned programs by fantasy points, count the best 12 |

At-large bid bonuses stack with NCAA seed and win points, but are not awarded to conference tournament automatic qualifiers. They only apply to the Multi-Bid & Mid-Major conference group. No KenPom or AP Poll fantasy bonus is configured. NCAA upset points stack with the main-bracket/First Four win points and quadrant bonuses. Only verified NCAA games with both bracket seeds known can earn the seed-difference bonus.

For Q1, opponents are NET 1–30 at home, 1–50 neutral, or 1–75 away. For Q2, opponents are 31–75 home, 51–100 neutral, or 76–135 away. Extra Q1A is opponent NET 1–15 home, 1–25 neutral, or 1–40 away. Quadrant bonuses are applied to **regular-season, conference tournament, NCAA main-bracket, and First Four wins**. The base win point for the relevant type of game is additional to Q1/Q1A/Q2 bonuses.

## Independent scoring engine validation

The private `verify-scoring` endpoint ran successfully against Supabase with **zero point breakdown arithmetic errors**, **zero per-school historical profile mismatches**, and **zero ineligible conference programs**. Only schools in the nine configured league conferences appear in Historical Leaders (125 eligible schools at the time of the check).

| Season | Regular wins | Conference tournament wins (+2) | NCAA main wins (+3) | First Four wins (+2) | Q1 bonuses | Extra Q1A bonuses | Q2 bonuses |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2021–22 | 5,414 | 300 | 63 | 4 | 465 | 207 | 571 |
| 2022–23 | 5,558 | 304 | 63 | 4 | 454 | 189 | 584 |
| 2023–24 | 5,708 | 302 | 63 | 4 | 464 | 219 | 611 |
| 2024–25 | 5,850 | 297 | 63 | 4 | 487 | 228 | 623 |
| 2025–26 | 5,772 | 300 | 63 | 4 | 480 | 196 | 624 |

Quad win totals count **all three game stages**, not just regular-season games; First Four wins are part of NCAA postseason bonus accounting. All five seasons also have 68 seed awards, verified conference title bonuses, and one correctly matched national champion award.

A concrete independent school profile and leaderboard match: **Florida 2024–25 scored 122.5 points** with the current configured rules, including its NCAA seed, six main-bracket wins, three conference tournament wins, 15-point national championship bonus, and all qualifying quadrant bonuses.

## Corrected source classification

The first import's hardcoded tournament-name filter missed ESPN conference championship names such as *Atlantic 10 Championship*, *American Conference Championship*, *Big West Championship*, and *America East Playoffs*. As a result, **1,118 conference tournament games** over five seasons were incorrectly eligible for regular win and quadrant bonuses.

The import classification is now based on ESPN event notes containing `Tournament`, `Championship` or `Playoffs` during the postseason, together with `season_type=2` and `conferenceCompetition=true`. Historical database rows were repaired using the original ESPN event IDs and complete official ESPN metadata. The revised archived regular-game totals and quadrant counts above are the post-fix values.

The currently configured season `2026-27` remains live/provisional. Quad bonuses only apply once its verified NET snapshots are available; NCAA seeds, postseason wins and championship bonuses are added when verified.

## Member settings and school scoring detail

Each program's season profile now shows an 11-line source breakdown, including exact points from the NCAA seed, both conference titles, conference tournament wins, NCAA/First Four victories, regular wins, and Q1/Q1A/Q2 bonuses, with a total that matches the historical leaderboard. Every manager can edit their team name, username, photo, favorite eligible school, accent color, and password from My Settings. Profile editing is self-scoped by session and was tested using a temporary account that was deleted immediately after validation. Password changes revoke other sessions, but a positive password-change browser test was not performed.

## Site and API rollout

- `supabase/functions/boek-api/results.js`: source classification and program totals.
- `supabase/functions/boek-api/server.js`: authenticated `GET /api/data/standings` returns current program points and manager totals, applying best-12 selection.
- `src/client.js`, `dist/worker-proxy.js`: League Standings and My Team now show actual fantasy points instead of placeholders.
- Final `verify-scoring` returned HTTP 200 with all five archive seasons verified, 125 eligible schools in Historical Leaders, and reconciled profile totals.
- Live site `/app.js` served HTTP 200 with the new standings UI; unsigned `/api/data/standings` correctly returned 401.

Authenticated real-manager browser testing is still needed to confirm end-to-end rendering for an actual drafted league; do not claim that this test has been performed.
