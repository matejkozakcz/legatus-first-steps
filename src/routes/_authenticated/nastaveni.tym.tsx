import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Copy, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/nastaveni/tym")({
  component: TeamSettingsPage,
});

function TeamSettingsPage() {
  const { workspace, user } = useWorkspace();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);

  const isOwner = !!workspace && workspace.owner_user_id === user?.id;

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("workspaces")
        .select("invite_token")
        .eq("id", workspace.id)
        .maybeSingle();
      if (cancelled) return;
      setToken((data as { invite_token?: string } | null)?.invite_token ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  const inviteUrl = token
    ? `${window.location.origin}/join/${token}`
    : "";

  async function rotate() {
    if (!workspace) return;
    setRotating(true);
    const { data, error } = await supabase.rpc("rotate_workspace_invite_token", {
      _workspace_id: workspace.id,
    });
    setRotating(false);
    if (error) {
      toast.error("Rotace selhala", { description: error.message });
      return;
    }
    setToken(data as string);
    toast.success("Nový pozvánkový token vygenerován");
  }

  function copy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Zkopírováno do schránky");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Nastavení týmu</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pozvánkový odkaz</CardTitle>
            <CardDescription>
              Sdílej tento odkaz s lidmi, které chceš pozvat do workspace.
              {!isOwner && " Rotaci může provést pouze vlastník."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Načítám…</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Token</Label>
                  <div className="flex gap-2">
                    <Input value={token ?? ""} readOnly className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plný odkaz</Label>
                  <div className="flex gap-2">
                    <Input value={inviteUrl} readOnly />
                    <Button variant="outline" onClick={copy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      onClick={rotate}
                      disabled={rotating}
                    >
                      {rotating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Rotovat token
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
