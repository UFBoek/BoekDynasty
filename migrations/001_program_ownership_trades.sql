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
