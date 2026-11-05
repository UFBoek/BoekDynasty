-- In-app notifications, opt-in Web Push and verified optional email delivery.
CREATE TABLE IF NOT EXISTS public.cbb_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('trade_offer','trade_accepted','trade_declined','trade_cancelled','draft_start','draft_turn','draft_soon','draft_finished','announcement','test')),
  title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 140),
  body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 1200),
  target text NOT NULL DEFAULT 'notifications',
  reference_id text,
  created_at integer NOT NULL DEFAULT floor(extract(epoch from now()))::integer,
  read_at integer,
  UNIQUE(user_id,kind,reference_id)
);
CREATE INDEX IF NOT EXISTS cbb_notifications_inbox ON public.cbb_notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS cbb_notifications_unread ON public.cbb_notifications(user_id,read_at) WHERE read_at IS NULL;
CREATE TABLE IF NOT EXISTS public.cbb_notification_preferences (
  user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  trades boolean NOT NULL DEFAULT true,
  draft boolean NOT NULL DEFAULT true,
  announcements boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  email_address text,
  email_verified_at integer
);
CREATE TABLE IF NOT EXISTS public.cbb_push_devices (
  endpoint text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  user_agent text,
  created_at integer NOT NULL DEFAULT floor(extract(epoch from now()))::integer,
  updated_at integer NOT NULL DEFAULT floor(extract(epoch from now()))::integer,
  last_delivered_at integer,
  last_error text
);
CREATE INDEX IF NOT EXISTS cbb_push_devices_member ON public.cbb_push_devices(user_id);
CREATE TABLE IF NOT EXISTS public.cbb_push_vapid_keys (
  id integer PRIMARY KEY CHECK (id=1),
  public_key text NOT NULL,
  private_jwk jsonb NOT NULL,
  created_at integer NOT NULL DEFAULT floor(extract(epoch from now()))::integer
);
CREATE TABLE IF NOT EXISTS public.cbb_notification_email_verification (
  user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.cbb_notification_outbox (
  notification_id uuid PRIMARY KEY REFERENCES public.cbb_notifications(id) ON DELETE CASCADE,
  processed_at integer,
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);
CREATE INDEX IF NOT EXISTS cbb_notification_outbox_pending ON public.cbb_notification_outbox(processed_at) WHERE processed_at IS NULL;
ALTER TABLE public.cbb_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbb_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbb_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbb_push_vapid_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbb_notification_email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbb_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cbb_notifications,public.cbb_notification_preferences,public.cbb_push_devices,public.cbb_push_vapid_keys,public.cbb_notification_email_verification,public.cbb_notification_outbox FROM anon,authenticated;
