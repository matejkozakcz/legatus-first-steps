
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS pending_meeting jsonb;
