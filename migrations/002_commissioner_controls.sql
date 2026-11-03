-- Add commissioner controls without modifying existing managers, schools, picks, or trades.
INSERT OR IGNORE INTO settings(key,value) VALUES ('league_name','Boek Dynasty'),('max_managers','10'),('trading_enabled','1'),('draft_order','[]');
DROP TRIGGER IF EXISTS cap_members;
CREATE TRIGGER cap_members BEFORE INSERT ON users
WHEN (SELECT count(*) FROM users) >= CAST(COALESCE((SELECT value FROM settings WHERE key='max_managers'),'10') AS INTEGER)
BEGIN SELECT RAISE(ABORT,'League is full'); END;
