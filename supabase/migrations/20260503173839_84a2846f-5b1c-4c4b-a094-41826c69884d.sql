DROP POLICY IF EXISTS "Super admins manage admins" ON public.legatus_admins;

CREATE OR REPLACE FUNCTION public.is_super_legatus_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.legatus_admins WHERE user_id = _user_id AND access_level = 'super')
$$;

CREATE POLICY "Super admins manage admins"
ON public.legatus_admins
FOR ALL
USING (public.is_super_legatus_admin(auth.uid()))
WITH CHECK (public.is_super_legatus_admin(auth.uid()));

CREATE POLICY "Users view own admin record"
ON public.legatus_admins
FOR SELECT
USING (user_id = auth.uid());