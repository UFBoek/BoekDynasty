# Trade Desk

The Trade Desk uses a side-by-side negotiation workspace within the existing navy, slate and copper league identity. Compact section navigation connects incoming offers, proposal building, sent offers and the activity ledger. Incoming offers retain priority before the builder; an empty inbox occupies a short status strip.

Each manager header includes program and unused-pick counts plus current-season best-ball points. Roster rows expose conference, current-season fantasy points, Bart Torvik national rank, historical average fantasy points and reported 2026 roster cost. Historical averages require at least three available seasons. Unreported/model-only spending displays N/A. All metrics use existing data helpers; no scoring or trade backend rules changed.

Search filters programs by name or conference without dropping selected assets. Draft picks use disclosure lists. The proposal summary names both packages and totals selected-program season points, explicitly excluding pick valuation and projected best-ball impact. Changing partners clears only requested assets. A successful submission clears the proposal. Async redraws preserve selections, searches, focused control/caret, roster scroll and disclosure state.

At mobile widths the two sides stack; every row retains its scouting data. Controls use visible keyboard focus and native checkbox/select semantics. Rich offer cards retain accept, decline and cancellation actions. Paused trading and missing data preserve existing rules.

Visual tokens scoped to `.td-desk`: ink #18334a, secondary #526879, rule #dce5ec, copper #994b28; Inter body and existing Plus Jakarta Sans headings; 8px workspace corners, 44px primary actions, aligned tabular numeric data.

Validation: 123 regression tests pass. Isolated synthetic-data desktop and 390px mobile previews verified search, selections, partner switching, clearing and disabled submit state. A browser redraw check verified focus, caret, checked assets and expanded picks persist. Production trade transactions were not submitted during QA.
