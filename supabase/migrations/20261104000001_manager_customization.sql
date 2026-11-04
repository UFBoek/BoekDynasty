ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_data TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#D9611E',
  ADD COLUMN IF NOT EXISTS favorite_program_id TEXT;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users FROM anon, authenticated;
