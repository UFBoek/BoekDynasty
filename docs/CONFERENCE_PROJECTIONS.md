# Conference-conditioned fantasy point projections (2026–27)

**Status:** Exploratory research baseline; not a verified historical-KenPom model and not deployed to the league site.

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
5. These CSV/JSON results are a **static research snapshot**. Committing them does not deploy a site change or set up a nightly refresh.

## Reusing the projection

`src/conference-projection.js` implements the coefficient formula for any new rank and conference strength and can project a full 365-program ratings snapshot after importing the saved JSON model. If you later train with true historical KenPom inputs, retain the source labels and rerun the season-based validation; do not silently relabel this baseline as KenPom-trained.
