import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useModules } from "@/hooks/useModules";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/setup")({
  component: SetupWizard,
});

function SetupWizard() {
  const navigate = useNavigate();
  const { workspace, user, refresh } = useWorkspace();
  const { roles } = useRoles();
  const { modules } = useModules();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(workspace?.name ?? "");
  const [saving, setSaving] = useState(false);

  // Guard: only owner of non-active workspace
  useEffect(() => {
    if (!workspace || !user) return;
    const isOwner = workspace.owner_user_id === user.id;
    if (!isOwner || workspace.status === "active") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [workspace, user, navigate]);

  if (!workspace) return null;

  const steps = ["Název workspace", "Moduly", "Přehled rolí"];

  async function finish() {
    setSaving(true);
    const { error } = await supabase.rpc("complete_workspace_setup", {
      _workspace_id: workspace!.id,
      _name: name,
    });
    setSaving(false);
    if (error) {
      toast.error("Setup selhal", { description: error.message });
      return;
    }
    toast.success("Workspace aktivován");
    await refresh();
    navigate({ to: "/dashboard", replace: true });
  }

  const enabledModules = Object.entries(modules).filter(
    ([, v]) => v.enabled,
  );
  const disabledModules = Object.entries(modules).filter(
    ([, v]) => !v.enabled,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <Badge
                  variant={i === step ? "default" : i < step ? "secondary" : "outline"}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </Badge>
                {i < steps.length - 1 && (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            ))}
          </div>
          <CardTitle>Nastavení workspace · {steps[step]}</CardTitle>
          <CardDescription>
            Krok {step + 1} z {steps.length}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-2">
              <Label>Název workspace</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                Můžeš upravit kdykoliv později.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tyto moduly jsou aktuálně nakonfigurované. Úpravy provede Legatus admin.
              </p>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Zapnuté
                </div>
                {enabledModules.length === 0 && (
                  <p className="text-sm text-muted-foreground">Žádné.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {enabledModules.map(([key]) => (
                    <Badge key={key}>{key}</Badge>
                  ))}
                </div>
              </div>
              {disabledModules.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Vypnuté
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {disabledModules.map(([key]) => (
                      <Badge key={key} variant="secondary">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Hierarchie rolí ve workspace (1 = nejvyšší).
              </p>
              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Žádné role nejsou definované.
                </p>
              )}
              <div className="space-y-2">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <span>{r.label}</span>
                    <Badge variant="outline">L{r.level}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Zpět
            </Button>
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !name.trim()}
              >
                Pokračovat <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Dokončit a aktivovat
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
