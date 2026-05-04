CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  recipient_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  icon text,
  accent_color text,
  link_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_created ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON public.notifications(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients view own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Recipients update own notifications"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Recipients delete own notifications"
  ON public.notifications FOR DELETE
  USING (recipient_id = auth.uid());

CREATE POLICY "Legatus admins manage notifications"
  ON public.notifications FOR ALL
  USING (public.is_legatus_admin(auth.uid()))
  WITH CHECK (public.is_legatus_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;