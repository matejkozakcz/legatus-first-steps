import { createFileRoute, useNavigate, Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { isLegatusAdmin, isLoading: wsLoading } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!wsLoading && !isLegatusAdmin) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, authLoading, wsLoading, isLegatusAdmin, navigate]);

  if (authLoading || wsLoading || !user || !isLegatusAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Načítám…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/admin/workspaces" className="text-xl font-semibold">
              Legatus Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                to="/admin/workspaces"
                activeProps={{ className: "font-medium text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              >
                Workspaces
              </Link>
              <Link
                to="/admin/templates"
                activeProps={{ className: "font-medium text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              >
                Templates
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Odhlásit
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
