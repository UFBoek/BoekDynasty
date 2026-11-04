# Fantasy scoring audit — November 2026

This audit covers five completed NCAA men's basketball seasons (2021–22 through 2025–26) using the league's persisted scoring settings. The Supabase Edge API is the scoring engine; the stateless Cloudflare Worker serves the site.

## Point rules and verified source

| Component | Fantasy points | Verified source |
| --- | ---: | --- |
| Regular-season win | +1 | Completed ESPN game, season type 2, excluding conference tournament |
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
| First Four victory | +2 | One of four First Four games per completed season |
| National championship | +15 | Confirmed champion award; stacks with its final-game victory |
| Manager season total | Best **12** programs | Sort current owned programs by fantasy points, count the best 12 |

No KenPom or AP Poll fantasy bonus is configured.

For Q1, opponents are NET 1–30 at home, 1–50 neutral, or 1–75 away. For Q2, opponents are 31–75 home, 51–100 neutral, or 76–135 away. Extra Q1A is opponent NET 1–15 home, 1–25 neutral, or 1–40 away. The base regular-season win point is **additional** to Q1/Q1A/Q2 bonuses.

## Independent aggregated checks

| Season | Regular wins | Q1 wins | Q1A wins | Q2 wins | Correctly tagged conference tournament games |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2021–22 | 5,450 | 385 | 166 | 518 | 301 |
| 2022–23 | 5,596 | 373 | 150 | 530 | 305 |
| 2023–24 | 5,721 | 382 | 176 | 557 | 302 |
| 2024–25 | 5,869 | 403 | 185 | 572 | 300 |
| 2025–26 | 5,785 | 398 | 153 | 573 | 300 |

Every archived season has **68 seed awards**, **63 main-bracket NCAA victories**, **4 First Four victories**, **1 national championship award** and the imported conference championship awards. All five title awards were independently compared against the winners of their actual NCAA final game, and **all five match**.

The independent count query excludes any game where the losing opponent has no final NET rank from quadrant bonuses. Those results still earn the regular-season win point; they must not be assigned invented opponent NET classifications.

## Corrected source classification

The first import's hardcoded tournament-name filter missed ESPN conference championship names such as *Atlantic 10 Championship*, *American Conference Championship*, *Big West Championship*, and *America East Playoffs*. As a result, **1,118 conference tournament games** over five seasons were incorrectly eligible for regular win and quadrant bonuses.

The import classification is now based on ESPN event notes containing `Tournament`, `Championship` or `Playoffs` during the postseason, together with `season_type=2` and `conferenceCompetition=true`. Historical database rows were repaired using the original ESPN event IDs and complete official ESPN metadata. The revised archived regular-game totals and quadrant counts above are the post-fix values.

The currently configured season `2026-27` remains live/provisional. Quad bonuses only apply once its NET snapshots are available; NCAA seeds, postseason wins and championship bonuses are added when verified.

## Site and API rollout

- `supabase/functions/boek-api/results.js`: source classification and program totals.
- `supabase/functions/boek-api/server.js`: authenticated `GET /api/data/standings` returns current program points and manager totals, applying best-12 selection.
- `src/client.js`, `dist/worker-proxy.js`: League Standings and My Team now show actual fantasy points instead of placeholders.
- Final historical API `verify-leaders` returned HTTP 200 with all five archive seasons verified and 1,988 historical school-season scores across 365 programs.
- Live site `/app.js` served HTTP 200 with the new standings UI; unsigned `/api/data/standings` correctly returned 401.

Authenticated real-manager browser testing is still needed to confirm end-to-end rendering for an actual drafted league; do not claim that this test has been performed.
