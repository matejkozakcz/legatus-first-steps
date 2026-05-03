import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, isLoading: authLoading } = useAuth();
  const { isLegatusAdmin, isLoading: wsLoading } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user || wsLoading) return;
    navigate({ to: isLegatusAdmin ? "/admin" : "/dashboard", replace: true });
  }, [user, authLoading, wsLoading, isLegatusAdmin, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Legatus</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Modulární platforma pro řízení obchodních sítí.
      </p>
      <div className="mt-8">
        <Button asChild size="lg">
          <Link to="/auth">Přihlásit se</Link>
        </Button>
      </div>
    </main>
  );
}
