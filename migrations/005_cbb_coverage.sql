-- Track verified scoreboard group/day coverage across the full college basketball season.
-- Additive migration: existing games, programs, managers, rankings and picks are preserved.
CREATE TABLE IF NOT EXISTS cbb_game_coverage (
  season TEXT NOT NULL,
  game_date TEXT NOT NULL,
  source_group INTEGER NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL,
  fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(season, game_date, source_group)
);
CREATE INDEX IF NOT EXISTS cbb_game_coverage_updated ON cbb_game_coverage(season, fetched_at DESC);
CREATE TABLE IF NOT EXISTS cbb_net_details (
  season TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  program_id TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY(season,snapshot_date,program_id)
);
CREATE INDEX IF NOT EXISTS cbb_net_details_date ON cbb_net_details(season,snapshot_date DESC);
CREATE TABLE IF NOT EXISTS cbb_net_snapshots (
  season TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  expected_count INTEGER NOT NULL,
  stored_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('loading','complete','error')),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(season,snapshot_date)
);
