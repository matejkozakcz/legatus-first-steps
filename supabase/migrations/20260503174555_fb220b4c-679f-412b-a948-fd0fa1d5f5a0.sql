
-- Allow legatus admins to insert impersonation log for any workspace
CREATE POLICY "Legatus admins insert impersonation log"
  ON public.impersonation_log
  FOR INSERT
  WITH CHECK (public.is_legatus_admin(auth.uid()) AND impersonator_id = auth.uid());

CREATE POLICY "Legatus admins end impersonation"
  ON public.impersonation_log
  FOR UPDATE
  USING (public.is_legatus_admin(auth.uid()) AND impersonator_id = auth.uid())
  WITH CHECK (public.is_legatus_admin(auth.uid()) AND impersonator_id = auth.uid());

-- RPC to start impersonating a workspace (as owner or virtual admin)
CREATE OR REPLACE FUNCTION public.admin_start_impersonation(_workspace_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  ws RECORD;
  log_id uuid;
  target_user uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_legatus_admin(caller) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id, owner_user_id INTO ws FROM public.workspaces WHERE id = _workspace_id;
  IF ws.id IS NULL THEN RAISE EXCEPTION 'Workspace not found'; END IF;

  target_user := COALESCE(ws.owner_user_id, caller);

  INSERT INTO public.impersonation_log (impersonator_id, impersonated_id, workspace_id)
  VALUES (caller, target_user, _workspace_id)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_end_impersonation(_log_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.impersonation_log
  SET ended_at = now()
  WHERE id = _log_id AND impersonator_id = caller;
END;
$$;
