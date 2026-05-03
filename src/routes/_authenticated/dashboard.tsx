import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { useModules } from "@/hooks/useModules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GdprConsentModal, useGdprConsent } from "@/components/GdprConsentModal";
import { Plus, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { signOut } = useAuth();
  const { workspace, user, productionUnit } = useWorkspace();
  const { roles, currentRole } = useRoles();
  const { meetingTypes } = useMeetingTypes();
  const { modules, isModuleEnabled } = useModules();
  const { hasConsent } = useGdprConsent();

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Žádný workspace</CardTitle>
            <CardDescription>
              Tvůj účet zatím nemá přiřazený workspace. Kontaktuj Legatus admina.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => signOut()}>
              Odhlásit se
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GdprConsentModal />
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{workspace.name}</h1>
            <p className="text-xs text-muted-foreground">
              {user?.full_name} · {currentRole?.label ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!hasConsent} title={!hasConsent ? "Nejprve potvrď GDPR souhlas" : undefined}>
              <Plus className="mr-1 h-4 w-4" /> Schůzka
            </Button>
            <Button size="sm" variant="secondary" disabled={!hasConsent} title={!hasConsent ? "Nejprve potvrď GDPR souhlas" : undefined}>
              <UserPlus className="mr-1 h-4 w-4" /> Kontakt
            </Button>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Odhlásit se
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Základní info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>Plán: <Badge variant="secondary">{workspace.plan}</Badge></div>
            <div>Status: <Badge>{workspace.status}</Badge></div>
            <div>Měrná jednotka: {productionUnit?.label ?? "—"} ({productionUnit?.key ?? "—"})</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role ({roles.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {roles.length === 0 && <p className="text-muted-foreground">Zatím žádné role.</p>}
            {roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span>{r.label}</span>
                <Badge variant="outline">L{r.level}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typy schůzek ({meetingTypes.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {meetingTypes.length === 0 && <p className="text-sm text-muted-foreground">Zatím žádné typy.</p>}
            {meetingTypes.map((t) => (
              <Badge key={t.key} style={{ backgroundColor: t.color, color: "#fff" }}>
                {t.key} · {t.label}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moduly</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.keys(modules).length === 0 && (
              <p className="text-muted-foreground">Žádné moduly nejsou nakonfigurované.</p>
            )}
            {Object.entries(modules).map(([key]) => (
              <div key={key} className="flex items-center justify-between">
                <span>{key}</span>
                <Badge variant={isModuleEnabled(key) ? "default" : "secondary"}>
                  {isModuleEnabled(key) ? "zapnuto" : "vypnuto"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
