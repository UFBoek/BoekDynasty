-- Display-only AP Top 25 ranking snapshots for basketball results filters.
-- These are NOT used to award fantasy points or infer NET quadrants.
CREATE TABLE IF NOT EXISTS cbb_ap_rankings (
  season TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  program_id TEXT NOT NULL,
  ap_rank INTEGER NOT NULL CHECK (ap_rank BETWEEN 1 AND 25),
  source TEXT NOT NULL DEFAULT 'espn-ap-poll',
  PRIMARY KEY (season, snapshot_date, program_id),
  UNIQUE (season, snapshot_date, ap_rank)
);
CREATE INDEX IF NOT EXISTS idx_ap_latest ON cbb_ap_rankings(season, snapshot_date DESC);
