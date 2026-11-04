-- Activity tracking is handled only through the authenticated Supabase Edge Function.
-- The app uses its own sessions, not Supabase Auth JWTs, so the Data API
-- intentionally has no read/write grants and all access goes through the server.
CREATE TABLE IF NOT EXISTS public.activity_presence (
  user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_seen integer NOT NULL DEFAULT (floor(extract(epoch from now())))::integer,
  last_page text NOT NULL DEFAULT 'home',
  last_context text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS public.activity_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('page', 'action', 'login')),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
  created_at integer NOT NULL DEFAULT (floor(extract(epoch from now())))::integer
);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON public.activity_events (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON public.activity_events (user_id, created_at DESC);
ALTER TABLE public.activity_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_presence FROM anon, authenticated;
REVOKE ALL ON public.activity_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.activity_events_id_seq FROM anon, authenticated;
COMMENT ON TABLE public.activity_events IS 'Server-validated league audit activity; commissioner-only API; no IP, cookies or request body stored.';
COMMENT ON TABLE public.activity_presence IS 'Latest authenticated page heartbeat per manager; commissioner-only API.';
