CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('week','month')),
  period_start date NOT NULL,
  metric_key text NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, period_type, period_start, metric_key)
);

CREATE INDEX idx_goals_workspace_user_period ON public.goals(workspace_id, user_id, period_type, period_start);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view subtree goals"
  ON public.goals FOR SELECT
  USING (workspace_id = get_user_workspace(auth.uid()) AND is_in_subtree(auth.uid(), user_id));

CREATE POLICY "Members insert own goals"
  ON public.goals FOR INSERT
  WITH CHECK (workspace_id = get_user_workspace(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Members update own goals"
  ON public.goals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members delete own goals"
  ON public.goals FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Legatus admins manage goals"
  ON public.goals FOR ALL
  USING (is_legatus_admin(auth.uid()))
  WITH CHECK (is_legatus_admin(auth.uid()));

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();