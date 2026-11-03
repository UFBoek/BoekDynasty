-- Independently validated NCAA Tournament matchups and First Four classification.
-- Additive: never touches program ownership, draft picks, trades, or existing awards.
CREATE TABLE IF NOT EXISTS cbb_ncaa_results(
  season TEXT NOT NULL,
  winner_id TEXT NOT NULL,
  loser_id TEXT NOT NULL,
  day_num INTEGER NOT NULL,
  opening_round INTEGER NOT NULL DEFAULT 0 CHECK(opening_round IN (0,1)),
  source_note TEXT NOT NULL,
  PRIMARY KEY(season,winner_id,loser_id)
);
CREATE INDEX IF NOT EXISTS cbb_ncaa_results_winner ON cbb_ncaa_results(season,winner_id);
CREATE INDEX IF NOT EXISTS cbb_ncaa_results_loser ON cbb_ncaa_results(season,loser_id);
