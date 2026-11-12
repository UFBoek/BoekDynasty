# Standings

Standings is an operate surface for comparing current fantasy totals and inspecting the best-ball programs behind them. Rankings, ties, counted-program IDs, program records, scores, and projections retain the existing data flow. No scoring rules or roster data change.

The replacement table separates rank, franchise, program preview, earned fantasy points, full-season projection, and gap. Counted-roster W–L sits directly below earned points; it is never mixed into the projected figure. Owned and counting program counts remain under the manager name. A navy table heading and tabular score typography establish hierarchy without summary cards. The current manager receives a pale-blue row; leaders use restrained copper rank emphasis.

At 760px and below each manager becomes a three-line grid: identity and earned score, program preview, then labeled projection and gap. Expanded program ledgers use consistent columns for identity, earned score with W–L, and projection. At intermediate widths program previews give way to score columns. No information depends on hover.

Refresh, manager profiles, program profiles, scoring rules, expand/collapse, and My contributions remain available. Disclosure controls keep keyboard focus after rerendering. Reduced-motion users receive no disclosure transition.

Tokens: ink #18334a; secondary #526879; divider #dce4e9; leader #984b22; owned row #f0f6f9; expanded row #e6eff4. Display type inherits Plus Jakarta Sans; body type inherits the application font. Controls have 44px heights. Table radius is 12px, 10px on phones.

Validation: source reviewed for global CSS conflicts and mobile/tablet disclosure visibility; JS syntax and Worker build pass. Existing suite: 127/128 pass. The sole Trade Desk markup expectation also fails on the unchanged baseline. Browser rendering was unavailable because local Chromium socket creation was denied and the remote browser could not reach localhost; no visual pass is claimed.
