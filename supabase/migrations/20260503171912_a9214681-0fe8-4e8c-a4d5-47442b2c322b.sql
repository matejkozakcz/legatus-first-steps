CREATE TABLE public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  full_name TEXT NOT NULL,
  note TEXT,
  gdpr_consented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_people_workspace ON public.people(workspace_id);
CREATE INDEX idx_people_created_by ON public.people(created_by);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legatus admins manage people"
ON public.people
FOR ALL
USING (public.is_legatus_admin(auth.uid()))
WITH CHECK (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Members view subtree people in own workspace"
ON public.people
FOR SELECT
USING (
  workspace_id = public.get_user_workspace(auth.uid())
  AND public.is_in_subtree(auth.uid(), created_by)
);

CREATE POLICY "Members insert own people in own workspace"
ON public.people
FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Members update subtree people in own workspace"
ON public.people
FOR UPDATE
USING (
  workspace_id = public.get_user_workspace(auth.uid())
  AND public.is_in_subtree(auth.uid(), created_by)
)
WITH CHECK (
  workspace_id = public.get_user_workspace(auth.uid())
  AND public.is_in_subtree(auth.uid(), created_by)
);

CREATE POLICY "Members delete own people"
ON public.people
FOR DELETE
USING (
  workspace_id = public.get_user_workspace(auth.uid())
  AND created_by = auth.uid()
);