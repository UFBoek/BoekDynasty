-- Allows the inaugural draft's unused picks to move independently from original snake slots.
-- Once the draft finishes, permanent program ownership remains in program_owners.
CREATE TABLE IF NOT EXISTS public.draft_pick_owners (
  overall integer PRIMARY KEY CHECK (overall >= 1),
  owner_manager_id text NOT NULL REFERENCES public.users(id),
  updated_at integer NOT NULL DEFAULT (floor(extract(epoch from now()))::integer)
);
CREATE INDEX IF NOT EXISTS draft_pick_owners_manager ON public.draft_pick_owners(owner_manager_id);

CREATE TABLE IF NOT EXISTS public.draft_pick_trade_items (
  trade_id text NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  overall integer NOT NULL CHECK (overall >= 1),
  from_manager_id text NOT NULL REFERENCES public.users(id),
  to_manager_id text NOT NULL REFERENCES public.users(id),
  PRIMARY KEY(trade_id,overall),
  CHECK (from_manager_id <> to_manager_id)
);
CREATE INDEX IF NOT EXISTS draft_pick_trade_items_slot ON public.draft_pick_trade_items(overall);
CREATE INDEX IF NOT EXISTS draft_pick_trade_items_trade ON public.draft_pick_trade_items(trade_id);

ALTER TABLE public.draft_pick_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_pick_trade_items ENABLE ROW LEVEL SECURITY;
-- The Edge Function uses existing session-based auth and a private PostgreSQL connection.
-- These tables must not be queried directly through the public Data API.
REVOKE ALL ON public.draft_pick_owners, public.draft_pick_trade_items FROM anon, authenticated;
