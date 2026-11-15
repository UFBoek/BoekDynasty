# Conference-conditioned fantasy point projections (2026–27)

**Status:** Revised live in the Cloudflare-hosted Boek Dynasty frontend on November 15, 2026. Still an exploratory NET-proxy-trained baseline, not a verified historical-KenPom model or backtested early-season forecast.

- Output: `data/kenpom-conference-projections-2026-27.csv` and `.json`, 365 Division I programs, captured November 11, 2026.
- Current input: current-season KenPom national ranking in `private.cbb_kenpom_daily`.
- Historical training (2021–22 through 2025–26): end-of-season **NCAA NET ranks**, *not historical KenPom*, joined to recorded league fantasy scores reconstructed using the current scoring weights, conference titles, NCAA seeds and postseason results.
- Historical conference difficulty: mean final NET rank of opponents from that program's actual league games **in the historical season**, instead of indiscriminately labeling all non-power programs as one tier. Current conference difficulty: mean current KenPom rank of other programs in the same 2026–27 conference.
- Design: a regularized nonlinear national-rank response combined with continuous conference-strength interactions, relative dominance over conference peers, plus **separate shrunken intercept and rank slope for each current conference**. A strong Atlantic 10 team, strong Big South team and equivalent Big 12 team need not receive identical points.
- Fit rows: 1,792 program/seasons (programs with 6+ validated conference opponents). Outputs are clipped to 0–145 points and rounded to 0.1.

## Leave-one-season-out historical backtest

| Model | MAE (points) | RMSE (points) |
| --- | ---: | ---: |
| Rank alone | 5.55 | 8.40 |
| Rank + specific conference difficulty + shrunken conference effects | 4.40 | 6.93 |

The conference model reduces historical MAE by **20.7%**. The test leaves out each historical season in turn but uses *final season NET* and realized opponent-strength numbers. It is **NOT** a validated preseason or early-November forecasting error estimate.

## Critical limitations

1. **Historical KenPom ranks are missing in Supabase.** This is an initial NET-proxy model and cannot legitimately be called a fit on historical KenPom. KenPom's historical archive is a separately licensed data product. Once historical authorized KenPom rankings are available, retrain and compare on identical holdouts.
2. Final NET and current early-season KenPom are different measures and time points. College programs can rise or fall substantially from November to March. Projected values should be treated as provisional baselines, not confident win totals or betting probabilities.
3. The season-specific conference difficulty comes from actual historical opponents. The shrunken conference-ID effects use *current* program membership, so conference realignment still introduces noise. This should be improved by backfilling historical conference memberships from verified season-specific conference sources.
4. Outputs depend on historical game/award completeness and the **current** league scoring configuration as of the snapshot date. Recalculate after scoring changes, historical repairs or new daily KenPom data.
5. The CSV/JSON exports are **static November 11 research snapshots**, but the live website recomputes projections from the latest existing KenPom snapshot and current earned scoring whenever those feeds refresh. Forecast coefficients themselves are fixed until the model is retrained. No separate projection scraper or scheduled task was introduced.

## Reusing the projection

`src/conference-projection.js` implements the coefficient formula for any new rank and conference strength and can project a full 365-program ratings snapshot after importing the saved JSON model. If you later train with true historical KenPom inputs, retain the source labels and rerun the season-based validation; do not silently relabel this baseline as KenPom-trained.

## Live site implementation (revised November 15, 2026)

The Cloudflare Worker `boek-dynasty` now serves `src/client.js` and `src/style.css` with this model embedded. The API and official fantasy scoring rules are unchanged. Forecasts are displayed separately from verified earned points on **My Team**, **other manager rosters**, **Schools → Program index**, **school profiles**, **Standings**, **Trade Desk** and **Add / Drop**. The Schools and Add / Drop lists can sort by projected points. **Draft Board intentionally has no projection display.**

The model is recomputed from the latest already-imported current-season KenPom national rankings and the conference-average ranks of the other programs in each team's current conference. The frontend refreshes KenPom about every 30 minutes when a relevant page is active and earned scoring about every 60 seconds. Refresh frequency reflects the site polling intervals, *not* a promise of fresh KenPom upstream data each time.

### In-season earned-points and conference-competition corrections (November 15)

The baseline still uses the previously fitted 2021–22 to 2025–26 final-NET proxy coefficients with current-season KenPom **ordinal ranks**. Its historical coefficients have not been retrained on the latest scoring revision.

The revised live forecast makes two deliberately moderate adjustments:

1. **Verified earned points / actual games played.** The old heuristic compared earned points to a wall-clock fraction of the entire fantasy season and muted November surprise to ~16%. The new calculation instead starts with expected regular-season scoring after `g` verified final games, taken as `0.65 * baseline * min(g,31) / 31`. It applies a bounded correction to the surprise `earned - expected`. The multiplier is `0.75 + 0.25*g/(g+14) + 0.35*(31-g)/(g+14)` for `g<=31`, with asymmetric caps to avoid runaway extrapolation. Games and earned points must come from the same verified standings response. When the season finishes, the forecast equals earned points exactly, blending out remaining upside during the final 15% of the season.

2. **Concentration of conference title competitors.** The old baseline sees a conference's *average* opponent rank, which can overstate title odds when one or two rival teams are much stronger than the mean. For regular-season and conference-tournament titles separately, we calculate a rank-based softmax share against **every ranked team in that conference** (temperature 35 national-rank places for regular, 55 for tournament). We subtract the analogous hypothetical share if every opponent were ranked at the conference mean. The difference is multiplied by the league's current conference-title point values and shrunk 35% (0.65 retained), capped at ±4 forecast points. Mid-major title values apply to the American and to the Pac-12, matching official fantasy scoring. This is a corrective overlay, *not* an independently calibrated championship probability model.

Memphis demonstration from the November 15 stored KenPom snapshot: Memphis #78, Wichita State #77, South Florida #98, baseline 28.5, earned 6.5 after four finals (3–1). The rank-distribution correction is about −0.6, the earned-points/form correction about +5.5, giving **33.3 projected points** (versus ~29.1 under the previous heuristic). Memphis is not a dominant conference favorite with Wichita State virtually tied.

**Limitations:** The KenPom pipeline stores ranks only, **not AdjEM or point-spread strength**, so the ranking-distance softmax cannot capture true numeric KenPom efficiency gaps. The 65% regular-season split, softmax temperatures and earned-points shrinkage are heuristic and have **not** passed an early-season walk-forward backtest. For a statistically calibrated upgrade, collect permitted historical KenPom rating *snapshots* (not just final NET ranks), program/game-point snapshots and actual AdjEM; then run time-consistent backtests across November/December/January before choosing parameters. Also retrain the baseline after the November scoring-rule revisions. Do not present this live result as proven forecasting accuracy.

The UI ranking is national order by current full-season forecast (with program ID as a stable tie breaker), not the input KenPom ranking. Official standings continue to use verified earned fantasy points; best-ball projections are secondary context. If KenPom is unavailable, the forecast displays a dash.

To redeploy future frontend changes, rebuild the stateless Worker bundle using `node scripts/build-worker-proxy.mjs` and deploy to the existing Cloudflare Worker. Source commits alone do not update this deployed Worker.
