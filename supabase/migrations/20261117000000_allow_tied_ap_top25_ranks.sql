-- Official AP polls permit ties: both Michigan and USC are #18 on Nov. 16, 2026.
-- Preserve unique dated team membership, but do not enforce a unique rank value.
ALTER TABLE public.cbb_ap_rankings
  DROP CONSTRAINT IF EXISTS cbb_ap_rankings_season_snapshot_date_ap_rank_key;
