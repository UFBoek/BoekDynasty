-- Non-destructive basketball data foundation. Requires migrations 001-003.
CREATE TABLE IF NOT EXISTS cbb_games (
  game_id TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  game_date TEXT NOT NULL,
  start_utc TEXT,
  home_id TEXT,
  away_id TEXT,
  home_name TEXT NOT NULL,
  away_name TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL CHECK(status IN ('scheduled','live','final','cancelled','postponed')),
  status_detail TEXT,
  neutral_site INTEGER NOT NULL DEFAULT 0,
  conference_game INTEGER NOT NULL DEFAULT 0,
  season_type INTEGER,
  event_name TEXT,
  tournament_tag TEXT,
  source TEXT NOT NULL DEFAULT 'espn-scoreboard',
  content_hash TEXT NOT NULL,
  fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cbb_games_season_date ON cbb_games(season,game_date DESC);
CREATE INDEX IF NOT EXISTS cbb_games_home ON cbb_games(season,home_id,game_date DESC);
CREATE INDEX IF NOT EXISTS cbb_games_away ON cbb_games(season,away_id,game_date DESC);
CREATE TABLE IF NOT EXISTS cbb_sync_runs (
  id TEXT PRIMARY KEY,
  job TEXT NOT NULL,
  season TEXT NOT NULL,
  target_date TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','ok','error')),
  received INTEGER NOT NULL DEFAULT 0,
  matched INTEGER NOT NULL DEFAULT 0,
  changed INTEGER NOT NULL DEFAULT 0,
  error_text TEXT,
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS cbb_sync_runs_recent ON cbb_sync_runs(started_at DESC);
CREATE TABLE IF NOT EXISTS cbb_net_rankings (
  season TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  program_id TEXT NOT NULL,
  net_rank INTEGER NOT NULL CHECK(net_rank > 0 AND net_rank <= 500),
  source TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(season,snapshot_date,program_id)
);
CREATE INDEX IF NOT EXISTS cbb_net_latest ON cbb_net_rankings(season,snapshot_date DESC);
CREATE TABLE IF NOT EXISTS cbb_awards (
  season TEXT NOT NULL,
  program_id TEXT NOT NULL,
  award_type TEXT NOT NULL CHECK(award_type IN ('conference_regular_champion','conference_tournament_champion','ncaa_seed','ncaa_wins','national_champion','kenpom_final_rank')),
  value REAL NOT NULL,
  source_note TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(season,program_id,award_type)
);
CREATE INDEX IF NOT EXISTS cbb_awards_season ON cbb_awards(season,award_type);
INSERT OR IGNORE INTO settings(key,value) VALUES('results_auto_sync','1');
