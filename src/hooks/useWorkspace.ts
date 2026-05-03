import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

/**
 * Primary hook to access the current workspace configuration.
 * Returns the full config + loading/error state.
 */
export function useWorkspace() {
  const { config, isLoading, error, refresh } = useWorkspaceContext();
  return {
    config,
    workspace: config?.workspace ?? null,
    user: config?.user ?? null,
    productionUnit: config?.productionUnit ?? null,
    isLegatusAdmin: config?.isLegatusAdmin ?? false,
    isLoading,
    error,
    refresh,
  };
}
