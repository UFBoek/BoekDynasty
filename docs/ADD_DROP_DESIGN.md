# Add / Drop

The Add / Drop workspace extends the league's navy and copper identity with a searchable program market and a separate move-review panel. Free agents and the manager's roster share the same scouting layout. This keeps comparison data beside selection controls and makes the incoming and outgoing programs explicit before a transaction.

## Behavior

- Search matches program and conference names. Conference filters include power, mid-major and individual conferences. Sort options cover current-season points, KenPom, Torvik, five-year average points, roster cost and program name; unavailable numeric values sort last.
- Every program exposes five metrics: current-season fantasy points, KenPom rank, Torvik rank, five-year average fantasy points and estimated roster cost. Historical averages require at least three available seasons. Costs are 2026–27 estimates, not audited payroll; metric titles retain the existing evidence, range and confidence descriptions. Missing values appear as an em dash or N/A.
- Selecting a free agent prepares an addition. An optional outgoing program makes it a swap; a full roster requires an outgoing selection. The My roster view prepares a standalone release. Program names retain profile navigation.
- Confirm addition submits the reviewed addition. Swaps and releases additionally use the existing native destructive confirmation. Pending submissions disable their action and display Saving move or Releasing feedback. Errors retain the selection and restore controls after the request finishes. Successful actions clear the submitted selection.
- When roster moves are closed, scouting remains available and confirmation is disabled. Background rendering invalidates selected programs whose ownership has changed, while preserving valid choices, search, filters, focus/caret and list scroll.
- The personal activity ledger displays the latest twelve roster transactions. Existing waiver claims remain in a disclosure section with pending-claim cancellation available.
- Existing backend transactions continue to enforce ownership, eligibility, roster capacity and open status independently of the interface. No scoring or roster transaction rules were changed.

## Layout and tokens

The desktop layout places a bounded scrolling market beside a sticky 320px review panel, narrowing the panel to 285px below 1100px. At 1000px and below, the panel stacks beneath the market; selecting a program scrolls and moves focus into review. At 1500px and above, program identity, metrics and selection occupy a single row. Smaller layouts put metrics on a second row and retain all five values.

| Token | Value |
| --- | --- |
| Ink | `#18334a` |
| Secondary text | `#526879` |
| Rules | `#dce5ec` |
| Copper action and focus | `#994b28` |
| Release action | `#9c3737` |
| Workspace corners | 8px |
| Main confirmation height | At least 46px |
| Mobile selection height | At least 44px |

The page inherits the application's typography, uses tabular numerals for metrics, and scopes its styling under the `ad-` classes. Native search and select controls have labels; selection and pool buttons expose pressed state; the result count uses a polite live region. Visible focus, selection color, caret and scrollbars use the page palette. Reduced-motion preferences disable row transitions and switch the mobile review scroll to an immediate jump.

## Validation and limits

The implementation handoff reports 127 passing Node tests, passing syntax checks and a rebuilt proxy bundle. Independent review ran the UI suite with 31 passing tests and inspected the source, appended CSS, selection guards and backend transaction validation. Follow-up source inspection confirmed the reduced-motion scroll fix, corrected estimate wording/evidence titles, pending action feedback and final redraw after completion or error.

The UI tests use a mocked DOM and generated HTML assertions. They cover full-roster and closed-state confirmation, stale ownership selection invalidation and retained legacy actions; they do not establish browser interaction or visual correctness.

Browser execution was unavailable: local Chromium failed with a socket Operation not permitted error, and the cloud browser could not reach localhost. No screenshots or visual sign-off were produced. Desktop/mobile rendering, narrow-screen overflow, computed contrast, real keyboard behavior, assistive-technology behavior and focus/scroll preservation still require browser verification. No production roster moves were submitted during this review.

School profile Add actions preserve the incoming preselection: a full roster opens Free agents with that school selected, clears stale filters, and focuses the drop selector. Integration with the concurrent school-profile update is covered by the UI suite.
