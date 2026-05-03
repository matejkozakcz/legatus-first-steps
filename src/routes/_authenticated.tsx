import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, isLoading: authLoading } = useAuth();
  const { workspace, isLoading: wsLoading, error } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect owner of inactive workspace to /setup
  useEffect(() => {
    if (!user || !workspace) return;
    const isOwner = workspace.owner_user_id === user.id;
    const onSetup = location.pathname === "/setup";
    if (isOwner && workspace.status !== "active" && !onSetup) {
      navigate({ to: "/setup", replace: true });
    } else if (workspace.status === "active" && onSetup) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, workspace, location.pathname, navigate]);

  if (authLoading || (user && wsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Načítám workspace…
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-destructive">
          Chyba při načítání workspace: {error.message}
        </p>
      </div>
    );
  }

  return <Outlet />;
}

