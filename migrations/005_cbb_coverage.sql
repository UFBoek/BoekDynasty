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
