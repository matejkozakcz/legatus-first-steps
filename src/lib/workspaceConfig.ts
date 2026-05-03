import type { WorkspaceRole } from "@/types/workspace";

/**
 * Pure helpers for reading workspace config outside of React components
 * (e.g. inside event handlers or utility modules that already received the
 * roles array). Inside components prefer the dedicated hooks.
 */

export function getRoleLevel(
  roleKey: string | null | undefined,
  roles: WorkspaceRole[],
): number | null {
  if (!roleKey) return null;
  return roles.find((r) => r.key === roleKey)?.level ?? null;
}

export function canAccessLevel(
  roleKey: string | null | undefined,
  roles: WorkspaceRole[],
  maxLevel: number,
): boolean {
  const level = getRoleLevel(roleKey, roles);
  return level != null && level <= maxLevel;
}
