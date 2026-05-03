import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type {
  FollowUpRules,
  ImpersonationConfig,
  MeetingType,
  Metric,
  ModulesConfig,
  ProductionUnit,
  PromotionConfig,
  Workspace,
  WorkspaceConfig,
  WorkspaceRole,
  WorkspaceUser,
} from "@/types/workspace";

interface WorkspaceContextValue {
  config: WorkspaceConfig | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
);

async function loadWorkspaceConfig(
  userId: string,
): Promise<WorkspaceConfig | null> {
  // 1. Load profile (users row)
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!userRow) return null;

  // 2. Check Legatus admin flag
  const { data: adminRow } = await supabase
    .from("legatus_admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const isLegatusAdmin = !!adminRow;

  if (!userRow.workspace_id) {
    // User without workspace (e.g. fresh Legatus admin) — return minimal stub
    return null;
  }

  // 3. Load workspace, roles, config, production unit in parallel
  const [
    { data: workspace, error: wsErr },
    { data: roles, error: rolesErr },
    { data: config, error: cfgErr },
    { data: prodUnits, error: puErr },
  ] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("id", userRow.workspace_id)
      .single(),
    supabase
      .from("workspace_roles")
      .select("*")
      .eq("workspace_id", userRow.workspace_id)
      .order("level", { ascending: true }),
    supabase
      .from("workspace_config")
      .select("*")
      .eq("workspace_id", userRow.workspace_id)
      .maybeSingle(),
    supabase
      .from("production_units")
      .select("*")
      .eq("workspace_id", userRow.workspace_id),
  ]);

  if (wsErr) throw wsErr;
  if (rolesErr) throw rolesErr;
  if (cfgErr) throw cfgErr;
  if (puErr) throw puErr;
  if (!workspace) return null;

  return {
    workspace: workspace as Workspace,
    user: userRow as WorkspaceUser,
    roles: (roles ?? []) as WorkspaceRole[],
    meetingTypes: (config?.meeting_types ?? []) as unknown as MeetingType[],
    followUpRules: (config?.follow_up_rules ?? {}) as unknown as FollowUpRules,
    metrics: (config?.metrics ?? []) as unknown as Metric[],
    productionUnit: ((prodUnits?.[0] ?? null) as unknown) as ProductionUnit | null,
    modules: (config?.modules ?? {}) as unknown as ModulesConfig,
    promotion: (config?.promotion ?? {}) as unknown as PromotionConfig,
    impersonation: (config?.impersonation ?? {
      enabled: false,
    }) as unknown as ImpersonationConfig,
    uiConfig: (config?.ui_config ?? {}) as Record<string, unknown>,
    isLegatusAdmin,
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const cfg = await loadWorkspaceConfig(userId);
      setConfig(cfg);
    } catch (e) {
      setError(e as Error);
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConfig(null);
      setIsLoading(false);
      return;
    }
    void load(user.id);
  }, [user, authLoading, load]);

  const refresh = useCallback(async () => {
    if (user) await load(user.id);
  }, [user, load]);

  return (
    <WorkspaceContext.Provider value={{ config, isLoading, error, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  return ctx;
}
