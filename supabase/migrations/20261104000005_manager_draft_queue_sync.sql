-- Manager-owned queue, retained for all seasons and draft stages.
-- Legacy per-browser queues are imported by the client after login.
CREATE TABLE IF NOT EXISTS public.draft_queues (
  manager_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  program_ids TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at INTEGER NOT NULL DEFAULT (floor(extract(epoch from now()))::integer)
);
ALTER TABLE public.draft_queues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.draft_queues FROM anon, authenticated;
