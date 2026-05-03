import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const push = usePushNotifications();

  const onToggle = async () => {
    if (push.isSubscribed) await push.unsubscribe();
    else await push.subscribe();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Zpět
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Nastavení</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Push notifikace
          </CardTitle>
          <CardDescription>
            Dostávejte upozornění o nových schůzkách a follow-upech přímo na zařízení.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {push.status === "unsupported" && (
            <p className="text-sm text-muted-foreground">
              Tento prohlížeč push notifikace nepodporuje.
            </p>
          )}
          {push.status === "blocked" && (
            <p className="text-sm text-muted-foreground">
              Push notifikace nejsou dostupné v náhledu Lovable. Otevřete publikovanou aplikaci.
            </p>
          )}
          {push.status === "denied" && (
            <p className="text-sm text-destructive">
              Oprávnění zamítnuto. Povolte notifikace v nastavení prohlížeče.
            </p>
          )}
          {(push.status === "default" || push.status === "granted") && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">
                  {push.isSubscribed ? "Aktivní" : "Vypnuté"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Stav oprávnění: {push.status}
                </p>
              </div>
              <Switch
                checked={push.isSubscribed}
                disabled={push.busy}
                onClick={(e) => {
                  e.preventDefault();
                  void onToggle();
                }}
              />
            </div>
          )}
          {push.error && (
            <p className="text-sm text-destructive">{push.error}</p>
          )}
          {push.status === "granted" && !push.isSubscribed && (
            <Button onClick={() => void push.subscribe()} disabled={push.busy} size="sm">
              Zapnout notifikace
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
