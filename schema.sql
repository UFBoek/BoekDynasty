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
