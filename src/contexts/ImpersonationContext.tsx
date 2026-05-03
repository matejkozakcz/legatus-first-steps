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
import { useWorkspace } from "@/hooks/useWorkspace";

const STORAGE_KEY = "legatus_impersonation_session";

interface ImpersonationState {
  targetId: string;
  targetName: string;
  logId: string | null;
  workspaceId: string;
}

interface ImpersonationContextValue {
  state: ImpersonationState | null;
  isImpersonating: boolean;
  effectiveUserId: string | null;
  start: (targetId: string, targetName: string) => Promise<void>;
  stop: () => Promise<void>;
}

const Ctx = createContext<ImpersonationContextValue | undefined>(undefined);

function loadStored(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationState) : null;
  } catch {
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { workspace } = useWorkspace();
  const [state, setState] = useState<ImpersonationState | null>(() => loadStored());

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [state]);

  const stop = useCallback(async () => {
    const current = state;
    setState(null);
    if (current?.logId) {
      try {
        await supabase
          .from("impersonation_log")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", current.logId);
      } catch {
        // best-effort
      }
    }
  }, [state]);

  const start = useCallback(
    async (targetId: string, targetName: string) => {
      if (!user || !workspace) return;
      if (targetId === user.id) return;
      // End previous if any
      if (state) await stop();
      const { data, error } = await supabase
        .from("impersonation_log")
        .insert({
          impersonator_id: user.id,
          impersonated_id: targetId,
          workspace_id: workspace.id,
        })
        .select("id")
        .single();
      if (error) {
        // Still allow client-side impersonation but warn
        console.warn("Impersonation log insert failed", error);
      }
      setState({
        targetId,
        targetName,
        logId: data?.id ?? null,
        workspaceId: workspace.id,
      });
    },
    [user, workspace, state, stop],
  );

  // End on sign out
  useEffect(() => {
    if (!user && state) {
      // user signed out — fire and forget end
      void stop();
    }
  }, [user, state, stop]);

  // Wrap signOut to end impersonation first
  useEffect(() => {
    // Listen for any auth state change to clean up
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT" && state) {
        await stop();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [state, stop]);

  return (
    <Ctx.Provider
      value={{
        state,
        isImpersonating: !!state,
        effectiveUserId: state?.targetId ?? user?.id ?? null,
        start,
        stop,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}

// Convenience: disabled-prop helper
export function useReadOnlyGuard() {
  const { isImpersonating } = useImpersonation();
  return {
    readOnly: isImpersonating,
    disabledProps: isImpersonating
      ? { disabled: true, title: "Pouze náhled" }
      : {},
  };
}
