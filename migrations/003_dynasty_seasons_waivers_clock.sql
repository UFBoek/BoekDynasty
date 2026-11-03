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
