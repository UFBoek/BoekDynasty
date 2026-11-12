# Conference-conditioned fantasy point projections (2026–27)

**Status:** Live in the Cloudflare-hosted Boek Dynasty frontend as of November 11, 2026. Still an exploratory NET-proxy-trained model, not a verified historical-KenPom model.

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

## Live site implementation (November 11, 2026)

The Cloudflare Worker `boek-dynasty` now serves `src/client.js` and `src/style.css` with this model embedded. The API and official fantasy scoring rules are unchanged. Forecasts are displayed separately from verified earned points on **My Team**, **other manager rosters**, **Schools → Program index**, **school profiles**, **Standings**, **Trade Desk** and **Add / Drop**. The Schools and Add / Drop lists can sort by projected points. **Draft Board intentionally has no projection display.**

The model is recomputed from the latest already-imported current-season KenPom national rankings and the conference-average ranks of the other programs in each team's current conference. The frontend refreshes KenPom about every 30 minutes when a relevant page is active and earned scoring about every 60 seconds. Refresh frequency reflects the site polling intervals, *not* a promise of fresh KenPom upstream data each time.

### Earned-points effect

`baseline` is the model's full-season estimate. `progress` is approximately 0 at October 30, 72% at March 10, and 100% at April 10, using an intentionally simple season progress calendar. Each verified earning update changes the full-season forecast by a **small residual correction**, not by simply adding points already earned:

```js
maxChange = 2.5 + 12 * progress
correction = clamp(
  (earnedPoints - baseline * progress) * (0.16 + 0.84 * progress * progress),
  -maxChange, maxChange
)
forecast = max(earnedPoints, baseline + correction)
if (progress >= 1 && earnedScoringAvailable) forecast = earnedPoints
```

Until the live standings feed is available, the model displays its pure KenPom baseline. The UI ranking is the national ordinal rank by projected points (with program ID as a stable tie breaker), **not** the source KenPom ranking. Official standings continue to be ranked by verified earned fantasy points; projected best-ball is secondary context. If KenPom is unavailable, the forecast shows a dash instead of fabricating an estimate. Once the model has historical early-season snapshots, replace the heuristic earned-points correction with a properly backtested in-season residual model.

To redeploy future frontend changes, rebuild the stateless Worker bundle using `node scripts/build-worker-proxy.mjs` and deploy to the existing Cloudflare Worker. Source commits alone do not update this deployed Worker.
