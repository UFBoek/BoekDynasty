-- Early-season T-Rank estimates are stored separately from official NCAA NET.
-- Current season only: historical seasons continue to use verified NCAA NET.
CREATE TABLE IF NOT EXISTS public.cbb_preliminary_rankings (
  season TEXT NOT NULL,
  program_id TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 400),
  snapshot_date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Bart Torvik T-Rank',
  PRIMARY KEY (season, program_id),
  UNIQUE (season, rank)
);
CREATE INDEX IF NOT EXISTS cbb_preliminary_rankings_date ON public.cbb_preliminary_rankings(season, snapshot_date);
ALTER TABLE public.cbb_preliminary_rankings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cbb_preliminary_rankings FROM anon, authenticated;
