# Standings design

The season table is the first primary content, with ranking, franchise identity, program ownership, best-ball counts, gaps and fantasy points kept together. A compact header places refresh and scoring navigation within reach. Championship context and a disclosure for scoring provenance follow the table instead of delaying it.

The visual system uses the existing navy identity (#18334a), readable slate supporting text (#526879), restrained copper leader emphasis (#9b4b24), white rows and pale blue owned-team emphasis. Points use tabular numerals and stronger type weight. Rules and aligned columns carry hierarchy instead of summary cards.

At narrow widths, each manager becomes a compact grid retaining rank, name, roster preview, score and gap. Contribution lists stack, with 44px expansion controls, explicit focus states and reduced-motion support. My contributions opens and focuses the current manager’s breakdown. All scoring and ownership calculations remain in the existing data flow.

Validation: existing regression suite passed; desktop and 390px preview layouts inspected using test data. Source review identified and resolved the shortcut focus/scroll behavior. Production data was not modified.
