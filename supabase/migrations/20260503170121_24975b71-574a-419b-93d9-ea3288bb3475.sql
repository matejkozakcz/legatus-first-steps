
-- ============================================================
-- MIGRATION 001: workspaces + legatus_admins
-- ============================================================

CREATE TABLE public.workspaces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  plan            text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  owner_user_id   uuid,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','cancelled')),
  frozen_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.legatus_admins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid UNIQUE,
  email           text UNIQUE NOT NULL,
  full_name       text,
  access_level    text NOT NULL DEFAULT 'support' CHECK (access_level IN ('super','support')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legatus_admins ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a Legatus admin?
CREATE OR REPLACE FUNCTION public.is_legatus_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.legatus_admins WHERE user_id = _user_id)
$$;

-- ============================================================
-- MIGRATION 002: workspace_roles
-- ============================================================

CREATE TABLE public.workspace_roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key             text NOT NULL,
  label           text NOT NULL,
  level           integer NOT NULL,
  permissions     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, key)
);

ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 003: users (profiles) with workspace_id + role_key
-- ============================================================

CREATE TABLE public.users (
  id              uuid PRIMARY KEY,
  workspace_id    uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  full_name       text,
  avatar_url      text,
  manager_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  role_key        text,
  gdpr_consent_accepted_at  timestamptz,
  gdpr_consent_version      text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_workspace ON public.users(workspace_id);
CREATE INDEX idx_users_manager ON public.users(manager_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helpers used in RLS
CREATE OR REPLACE FUNCTION public.get_user_workspace(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM public.users WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role_key FROM public.users WHERE id = _user_id
$$;

-- Recursive subtree check via manager_id
CREATE OR REPLACE FUNCTION public.is_in_subtree(_root_id uuid, _target_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH RECURSIVE subtree AS (
    SELECT id FROM public.users WHERE id = _root_id
    UNION ALL
    SELECT u.id FROM public.users u
    JOIN subtree s ON u.manager_id = s.id
  )
  SELECT EXISTS (SELECT 1 FROM subtree WHERE id = _target_id)
$$;

-- Auto-create users row on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MIGRATION 004: production_units
-- ============================================================

CREATE TABLE public.production_units (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key             text NOT NULL,
  label           text NOT NULL,
  description     text,
  value_multiplier numeric NOT NULL DEFAULT 1.0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, key)
);

ALTER TABLE public.production_units ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 005: workspace_config
-- ============================================================

CREATE TABLE public.workspace_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  modules         jsonb NOT NULL DEFAULT '{}'::jsonb,
  meeting_types   jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics         jsonb NOT NULL DEFAULT '[]'::jsonb,
  promotion       jsonb NOT NULL DEFAULT '{}'::jsonb,
  impersonation   jsonb NOT NULL DEFAULT '{"enabled": false}'::jsonb,
  ui_config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 006: workspace_templates
-- ============================================================

CREATE TABLE public.workspace_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  default_roles           jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_meeting_types   jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_metrics         jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_modules         jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_follow_up_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_production_unit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_admin_id     uuid REFERENCES public.legatus_admins(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 007: workspace_config_log
-- ============================================================

CREATE TABLE public.workspace_config_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  changed_by_admin_id  uuid REFERENCES public.legatus_admins(id) ON DELETE SET NULL,
  change_type     text NOT NULL,
  previous_value  jsonb,
  new_value       jsonb,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_config_log_workspace ON public.workspace_config_log(workspace_id, created_at DESC);

ALTER TABLE public.workspace_config_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 008: impersonation_log
-- ============================================================

CREATE TABLE public.impersonation_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  impersonator_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  impersonated_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz
);

CREATE INDEX idx_impersonation_workspace ON public.impersonation_log(workspace_id, started_at DESC);

ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- workspaces
CREATE POLICY "Legatus admins manage all workspaces" ON public.workspaces
  FOR ALL USING (public.is_legatus_admin(auth.uid()))
  WITH CHECK (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Members view own workspace" ON public.workspaces
  FOR SELECT USING (id = public.get_user_workspace(auth.uid()));

-- legatus_admins
CREATE POLICY "Legatus admins view admins" ON public.legatus_admins
  FOR SELECT USING (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Super admins manage admins" ON public.legatus_admins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.legatus_admins
            WHERE user_id = auth.uid() AND access_level = 'super')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.legatus_admins
            WHERE user_id = auth.uid() AND access_level = 'super')
  );

-- workspace_roles
CREATE POLICY "Legatus admins manage roles" ON public.workspace_roles
  FOR ALL USING (public.is_legatus_admin(auth.uid()))
  WITH CHECK (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Members view roles in own workspace" ON public.workspace_roles
  FOR SELECT USING (workspace_id = public.get_user_workspace(auth.uid()));

-- users
CREATE POLICY "Users view self" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users update self" ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Members view workspace users" ON public.users
  FOR SELECT USING (workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Legatus admins manage users" ON public.users
  FOR ALL USING (public.is_legatus_admin(auth.uid()))
  WITH CHECK (public.is_legatus_admin(auth.uid()));

-- production_units
CREATE POLICY "Legatus admins manage production units" ON public.production_units
  FOR ALL USING (public.is_legatus_admin(auth.uid()))
  WITH CHECK (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Members view own workspace production units" ON public.production_units
  FOR SELECT USING (workspace_id = public.get_user_workspace(auth.uid()));

-- workspace_config
CREATE POLICY "Legatus admins manage config" ON public.workspace_config
  FOR ALL USING (public.is_legatus_admin(auth.uid()))
  WITH CHECK (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Members view own workspace config" ON public.workspace_config
  FOR SELECT USING (workspace_id = public.get_user_workspace(auth.uid()));

-- workspace_templates
CREATE POLICY "Legatus admins manage templates" ON public.workspace_templates
  FOR ALL USING (public.is_legatus_admin(auth.uid()))
  WITH CHECK (public.is_legatus_admin(auth.uid()));

-- workspace_config_log
CREATE POLICY "Legatus admins view config log" ON public.workspace_config_log
  FOR SELECT USING (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Legatus admins insert config log" ON public.workspace_config_log
  FOR INSERT WITH CHECK (public.is_legatus_admin(auth.uid()));

-- impersonation_log
CREATE POLICY "Legatus admins view impersonation log" ON public.impersonation_log
  FOR SELECT USING (public.is_legatus_admin(auth.uid()));

CREATE POLICY "Members view own workspace impersonation log" ON public.impersonation_log
  FOR SELECT USING (
    workspace_id = public.get_user_workspace(auth.uid())
    AND (impersonator_id = auth.uid() OR impersonated_id = auth.uid())
  );

CREATE POLICY "Members insert own impersonation events" ON public.impersonation_log
  FOR INSERT WITH CHECK (
    impersonator_id = auth.uid()
    AND workspace_id = public.get_user_workspace(auth.uid())
  );

CREATE POLICY "Members end own impersonation events" ON public.impersonation_log
  FOR UPDATE USING (impersonator_id = auth.uid())
  WITH CHECK (impersonator_id = auth.uid());
