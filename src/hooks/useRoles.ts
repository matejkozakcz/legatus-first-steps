import { useMemo } from "react";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import type { WorkspaceRole } from "@/types/workspace";

export function useRoles() {
  const { config } = useWorkspaceContext();
  const roles = config?.roles ?? [];
  const currentRoleKey = config?.user?.role_key ?? null;

  const byKey = useMemo(() => {
    const map = new Map<string, WorkspaceRole>();
    for (const r of roles) map.set(r.key, r);
    return map;
  }, [roles]);

  const getRoleLevel = (roleKey: string | null | undefined): number | null => {
    if (!roleKey) return null;
    return byKey.get(roleKey)?.level ?? null;
  };

  const currentLevel = getRoleLevel(currentRoleKey);

  /**
   * Check if the current user can access a feature gated to a maximum level.
   * Lower level number = higher seniority (1 = top).
   */
  const canAccessLevel = (maxLevel: number): boolean => {
    if (currentLevel == null) return false;
    return currentLevel <= maxLevel;
  };

  const hasRole = (roleKey: string): boolean => currentRoleKey === roleKey;

  return {
    roles,
    currentRole: currentRoleKey ? byKey.get(currentRoleKey) ?? null : null,
    currentRoleKey,
    currentLevel,
    getRoleLevel,
    canAccessLevel,
    hasRole,
  };
}
