-- 1. Add invite_token column
ALTER TABLE public.workspaces
  ADD COLUMN invite_token TEXT UNIQUE;

-- 2. Token generator: 6 chars from A-Z + 2-9 (no O/0/I/1 confusion)
CREATE OR REPLACE FUNCTION public.gen_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
  attempts INT := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    -- Ensure uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE invite_token = result) THEN
      RETURN result;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Failed to generate unique invite token';
    END IF;
  END LOOP;
END;
$$;

-- 3. Backfill tokens for existing workspaces
UPDATE public.workspaces
SET invite_token = public.gen_invite_token()
WHERE invite_token IS NULL;

ALTER TABLE public.workspaces
  ALTER COLUMN invite_token SET NOT NULL;

-- 4. Public lookup function (callable by anonymous users on /join/:token)
CREATE OR REPLACE FUNCTION public.get_workspace_by_invite_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  status TEXT,
  default_role_key TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.status,
    (SELECT r.key FROM public.workspace_roles r
       WHERE r.workspace_id = w.id
       ORDER BY r.level DESC LIMIT 1) AS default_role_key
  FROM public.workspaces w
  WHERE w.invite_token = _token
    AND w.status <> 'cancelled';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_by_invite_token(TEXT) TO anon, authenticated;

-- 5. Rotate token — owner of workspace OR legatus admin
CREATE OR REPLACE FUNCTION public.rotate_workspace_invite_token(_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  caller UUID := auth.uid();
  is_owner BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (owner_user_id = caller) INTO is_owner
  FROM public.workspaces WHERE id = _workspace_id;

  IF NOT COALESCE(is_owner, FALSE) AND NOT public.is_legatus_admin(caller) THEN
    RAISE EXCEPTION 'Not authorized to rotate invite token';
  END IF;

  new_token := public.gen_invite_token();
  UPDATE public.workspaces SET invite_token = new_token WHERE id = _workspace_id;
  RETURN new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_workspace_invite_token(UUID) TO authenticated;

-- 6. Complete workspace setup (owner only)
CREATE OR REPLACE FUNCTION public.complete_workspace_setup(
  _workspace_id UUID,
  _name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  is_owner BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (owner_user_id = caller) INTO is_owner
  FROM public.workspaces WHERE id = _workspace_id;

  IF NOT COALESCE(is_owner, FALSE) THEN
    RAISE EXCEPTION 'Only owner can complete setup';
  END IF;

  UPDATE public.workspaces
  SET name = COALESCE(NULLIF(trim(_name), ''), name),
      status = 'active'
  WHERE id = _workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_workspace_setup(UUID, TEXT) TO authenticated;

-- 7. Allow new user to join workspace via invite token (server-side function)
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  ws RECORD;
  default_role TEXT;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, status INTO ws FROM public.workspaces
  WHERE invite_token = _token AND status <> 'cancelled';

  IF ws.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite token';
  END IF;

  SELECT key INTO default_role FROM public.workspace_roles
  WHERE workspace_id = ws.id ORDER BY level DESC LIMIT 1;

  UPDATE public.users
  SET workspace_id = ws.id,
      role_key = COALESCE(role_key, default_role)
  WHERE id = caller AND workspace_id IS NULL;

  RETURN ws.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(TEXT) TO authenticated;