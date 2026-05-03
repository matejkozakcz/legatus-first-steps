CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  person_id UUID REFERENCES public.people(id),
  type_key TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'cancelled')),
  result JSONB,
  follow_up_meeting_id UUID REFERENCES public.meetings(id),
  parent_meeting_id UUID REFERENCES public.meetings(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_workspace_id ON public.meetings(workspace_id);
CREATE INDEX idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX idx_meetings_person_id ON public.meetings(person_id);
CREATE INDEX idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX idx_meetings_status ON public.meetings(status);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legatus admins manage meetings"
ON public.meetings
FOR ALL
USING (public.is_legatus_admin(auth.uid()))
WITH CHECK (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Members view subtree meetings in own workspace"
ON public.meetings
FOR SELECT
USING (
  workspace_id = public.get_user_workspace(auth.uid())
  AND public.is_in_subtree(auth.uid(), user_id)
);

CREATE POLICY "Members insert own meetings in own workspace"
ON public.meetings
FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Members update subtree meetings in own workspace"
ON public.meetings
FOR UPDATE
USING (
  workspace_id = public.get_user_workspace(auth.uid())
  AND public.is_in_subtree(auth.uid(), user_id)
)
WITH CHECK (
  workspace_id = public.get_user_workspace(auth.uid())
  AND public.is_in_subtree(auth.uid(), user_id)
);

CREATE POLICY "Members delete own meetings"
ON public.meetings
FOR DELETE
USING (
  workspace_id = public.get_user_workspace(auth.uid())
  AND user_id = auth.uid()
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();