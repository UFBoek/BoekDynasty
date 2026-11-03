CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('commissioner','manager')), created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS invites (code_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, issued_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS cap_members BEFORE INSERT ON users WHEN (SELECT count(*) FROM users)>=CAST(COALESCE((SELECT value FROM settings WHERE key='max_managers'),'10') AS INTEGER) BEGIN SELECT RAISE(ABORT,'League is full'); END;
CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY, name TEXT NOT NULL, abbr TEXT, conference_id TEXT NOT NULL, logo TEXT, updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE INDEX IF NOT EXISTS programs_conf ON programs(conference_id);
CREATE TABLE IF NOT EXISTS picks (id INTEGER PRIMARY KEY AUTOINCREMENT, overall INTEGER NOT NULL UNIQUE, round INTEGER NOT NULL, manager_id TEXT NOT NULL REFERENCES users(id), program_id TEXT NOT NULL UNIQUE REFERENCES programs(id), picked_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS login_attempts(username TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, started_at INTEGER NOT NULL);
INSERT OR IGNORE INTO settings(key,value) VALUES('conferences','["23","2","7","8","4","3","21","44","29"]'),('rounds','8'),('draft_status','pending'),('league_name','Boek Dynasty'),('max_managers','10'),('trading_enabled','1'),('draft_order','[]');
-- Commissioner bootstrap code is stored as a SHA-256 hash in settings('setup_hash'); it must be provisioned securely, never committed here.

-- Apply once to the existing Cloudflare D1 database before deploying dynasty trading.
-- Safe to re-run: preserves existing picks, ownership and accepted trades.
CREATE TABLE IF NOT EXISTS program_owners (
  program_id TEXT PRIMARY KEY REFERENCES programs(id),
  manager_id TEXT NOT NULL REFERENCES users(id),
  acquired_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS program_owners_manager ON program_owners(manager_id);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  from_manager_id TEXT NOT NULL REFERENCES users(id),
  to_manager_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
  offered_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  acceptance_token TEXT
);
CREATE INDEX IF NOT EXISTS trades_recent ON trades(offered_at DESC);

CREATE TABLE IF NOT EXISTS trade_items (
  trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL REFERENCES programs(id),
  from_manager_id TEXT NOT NULL REFERENCES users(id),
  to_manager_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(trade_id,program_id)
);
CREATE INDEX IF NOT EXISTS trade_items_program ON trade_items(program_id);

-- Preserve the draft board as draft history. Current owners are stored independently.
INSERT OR IGNORE INTO program_owners(program_id,manager_id)
  SELECT program_id,manager_id FROM picks;

CREATE TRIGGER IF NOT EXISTS draft_pick_ownership AFTER INSERT ON picks
BEGIN
  INSERT INTO program_owners(program_id,manager_id) VALUES(NEW.program_id,NEW.manager_id);
END;

INSERT OR IGNORE INTO settings(key,value) VALUES('current_season','2026-27');

-- Permanent-dynasty season records, draft timer and commissioner-reviewed waivers.
-- This migration is additive. Never clear current picks or current ownership.
INSERT OR IGNORE INTO settings(key,value) VALUES
 ('draft_clock_seconds','0'),
 ('draft_deadline','0'),
 ('waivers_enabled','0');

CREATE TABLE IF NOT EXISTS season_archives (
 season TEXT PRIMARY KEY,
 archived_at INTEGER NOT NULL DEFAULT (unixepoch()),
 champion_manager_id TEXT REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS season_rosters (
 season TEXT NOT NULL REFERENCES season_archives(season),
 manager_id TEXT NOT NULL REFERENCES users(id),
 program_id TEXT NOT NULL REFERENCES programs(id),
 PRIMARY KEY(season,program_id)
);
CREATE INDEX IF NOT EXISTS season_rosters_manager ON season_rosters(season,manager_id);
CREATE TABLE IF NOT EXISTS season_manager_records (
 season TEXT NOT NULL REFERENCES season_archives(season),
 manager_id TEXT NOT NULL REFERENCES users(id),
 programs_count INTEGER NOT NULL DEFAULT 0,
 fantasy_points REAL,
 final_place INTEGER,
 PRIMARY KEY(season,manager_id)
);
CREATE TABLE IF NOT EXISTS waiver_claims (
 id TEXT PRIMARY KEY,
 season TEXT NOT NULL,
 manager_id TEXT NOT NULL REFERENCES users(id),
 program_id TEXT NOT NULL REFERENCES programs(id),
 drop_program_id TEXT REFERENCES programs(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','cancelled')),
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS waiver_claims_pending ON waiver_claims(status,created_at);
CREATE TABLE IF NOT EXISTS roster_transactions (
 id TEXT PRIMARY KEY,
 season TEXT NOT NULL,
 manager_id TEXT NOT NULL REFERENCES users(id),
 program_id TEXT NOT NULL REFERENCES programs(id),
 action TEXT NOT NULL CHECK(action IN ('claim','drop')),
 created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS roster_transactions_recent ON roster_transactions(created_at DESC);

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
