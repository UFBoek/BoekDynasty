CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('commissioner','manager')), created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TRIGGER IF NOT EXISTS cap_members BEFORE INSERT ON users WHEN (SELECT count(*) FROM users)>=10 BEGIN SELECT RAISE(ABORT,'League is full (10 managers)'); END;
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS invites (code_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, issued_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY, name TEXT NOT NULL, abbr TEXT, conference_id TEXT NOT NULL, logo TEXT, updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE INDEX IF NOT EXISTS programs_conf ON programs(conference_id);
CREATE TABLE IF NOT EXISTS picks (id INTEGER PRIMARY KEY AUTOINCREMENT, overall INTEGER NOT NULL UNIQUE, round INTEGER NOT NULL, manager_id TEXT NOT NULL REFERENCES users(id), program_id TEXT NOT NULL UNIQUE REFERENCES programs(id), picked_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS login_attempts(username TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, started_at INTEGER NOT NULL);
INSERT OR IGNORE INTO settings(key,value) VALUES('conferences','["23","2","7","8","4","3","21","44","29"]'),('rounds','8'),('draft_status','pending');
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
