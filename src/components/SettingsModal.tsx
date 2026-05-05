import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, User as UserIcon } from "lucide-react";

interface Ctx { open: () => void; close: () => void }
const SettingsCtx = createContext<Ctx | null>(null);

export function useSettingsModal() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error("useSettingsModal must be used within SettingsModalProvider");
  return c;
}

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<Ctx>(() => ({ open: () => setIsOpen(true), close: () => setIsOpen(false) }), []);
  return (
    <SettingsCtx.Provider value={value}>
      {children}
      <SettingsModal open={isOpen} onOpenChange={setIsOpen} />
    </SettingsCtx.Provider>
  );
}

function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const push = usePushNotifications();

  const onToggle = async () => {
    if (push.isSubscribed) await push.unsubscribe();
    else await push.subscribe();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="legatus-modal-glass max-w-xl max-h-[90vh] overflow-y-auto p-0 border-0 sm:rounded-[28px]">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="font-heading text-xl tracking-wide text-[color:var(--deep-hex)]">
            Nastavení
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="gap-2">
                <UserIcon className="h-4 w-4" /> Profil
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" /> Oznámení
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-5 space-y-3">
              <div className="rounded-xl border bg-card/40 p-4 space-y-2">
                <div className="text-xs uppercase text-muted-foreground font-semibold">E-mail</div>
                <div className="text-sm">{user?.email ?? "—"}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Další úpravy profilu budou dostupné brzy.
              </p>
            </TabsContent>

            <TabsContent value="notifications" className="mt-5 space-y-3">
              <div className="rounded-xl border bg-card/40 p-4 space-y-3">
                <div className="flex items-center gap-2 font-heading font-semibold text-sm">
                  <Bell className="h-4 w-4" /> Push notifikace
                </div>
                <p className="text-xs text-muted-foreground">
                  Upozornění o nových schůzkách a follow-upech přímo na zařízení.
                </p>

                {push.status === "unsupported" && (
                  <p className="text-sm text-muted-foreground">Tento prohlížeč push notifikace nepodporuje.</p>
                )}
                {push.status === "blocked" && (
                  <p className="text-sm text-muted-foreground">
                    Push notifikace nejsou dostupné v náhledu Lovable. Otevři publikovanou aplikaci.
                  </p>
                )}
                {push.status === "denied" && (
                  <p className="text-sm text-destructive">Oprávnění zamítnuto. Povol notifikace v nastavení prohlížeče.</p>
                )}
                {(push.status === "default" || push.status === "granted") && (
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{push.isSubscribed ? "Aktivní" : "Vypnuté"}</p>
                      <p className="text-xs text-muted-foreground">Stav: {push.status}</p>
                    </div>
                    <Switch
                      checked={push.isSubscribed}
                      disabled={push.busy}
                      onClick={(e) => { e.preventDefault(); void onToggle(); }}
                    />
                  </div>
                )}
                {push.error && <p className="text-sm text-destructive">{push.error}</p>}
                {push.status === "granted" && !push.isSubscribed && (
                  <Button onClick={() => void push.subscribe()} disabled={push.busy} size="sm">
                    Zapnout notifikace
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

