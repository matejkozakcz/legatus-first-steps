import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useRoles } from "./useRoles";

export function useModules() {
  const { config } = useWorkspaceContext();
  const { currentLevel } = useRoles();
  const modules = config?.modules ?? {};

  const isModuleEnabled = (key: string): boolean => {
    const m = modules[key];
    if (!m?.enabled) return false;

    // Optional visibility-by-level gating (e.g. reports.visible_to_levels)
    const visibleLevels = m.visible_to_levels as number[] | undefined;
    if (visibleLevels && Array.isArray(visibleLevels)) {
      if (currentLevel == null) return false;
      return visibleLevels.includes(currentLevel);
    }
    return true;
  };

  const getModuleConfig = (key: string) => modules[key];

  return {
    modules,
    isModuleEnabled,
    getModuleConfig,
  };
}
