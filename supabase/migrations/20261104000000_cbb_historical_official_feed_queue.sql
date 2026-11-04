-- Temporary, private request IDs for verified historical ESPN site scoreboards.
CREATE TABLE IF NOT EXISTS public.cbb_historical_site_queue (
  season text NOT NULL,
  game_date text NOT NULL,
  source_group integer NOT NULL CHECK (source_group IN (50,100)),
  request_id bigint NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(season,game_date,source_group)
);
CREATE INDEX IF NOT EXISTS cbb_site_queue_request_id ON public.cbb_historical_site_queue(request_id);
ALTER TABLE public.cbb_historical_site_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cbb_historical_site_queue FROM anon, authenticated;
