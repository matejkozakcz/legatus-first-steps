import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Bell, User as UserIcon, Camera, Lock, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Jméno musí mít alespoň 2 znaky")
  .max(80, "Jméno je příliš dlouhé");

const passwordSchema = z
  .string()
  .min(8, "Heslo musí mít alespoň 8 znaků")
  .max(128, "Heslo je příliš dlouhé");

function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { config, refresh } = useWorkspaceContext();
  const push = usePushNotifications();

  const initialName = config?.user?.full_name ?? "";
  const initialAvatar = config?.user?.avatar_url ?? null;

  const [fullName, setFullName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Reset form when opening / when context loads
  useEffect(() => {
    if (open) {
      setFullName(config?.user?.full_name ?? "");
      setAvatarUrl(config?.user?.avatar_url ?? null);
    }
  }, [open, config?.user?.full_name, config?.user?.avatar_url]);

  const fileRef = useRef<HTMLInputElement>(null);

  const onPushToggle = async () => {
    if (push.isSubscribed) await push.unsubscribe();
    else await push.subscribe();
  };

  const onAvatarPick = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vyber prosím obrázek");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Obrázek je větší než 5 MB");
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("users")
        .update({ avatar_url: newUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      setAvatarUrl(newUrl);
      await refresh();
      toast.success("Avatar aktualizován");
    } catch (e) {
      toast.error((e as Error).message || "Nepodařilo se nahrát avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSaveName = async () => {
    if (!user) return;
    const parsed = fullNameSchema.safeParse(fullName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Neplatné jméno");
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ full_name: parsed.data })
        .eq("id", user.id);
      if (error) throw error;
      await refresh();
      toast.success("Jméno uloženo");
    } catch (e) {
      toast.error((e as Error).message || "Nepodařilo se uložit");
    } finally {
      setSavingName(false);
    }
  };

  const initials = (fullName || user?.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Password change
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const onChangePassword = async () => {
    if (!user?.email) return;
    const cur = passwordSchema.safeParse(currentPw);
    if (!cur.success) {
      toast.error("Zadej aktuální heslo");
      return;
    }
    const next = passwordSchema.safeParse(newPw);
    if (!next.success) {
      toast.error(next.error.issues[0]?.message ?? "Neplatné nové heslo");
      return;
    }
    if (newPw !== newPw2) {
      toast.error("Hesla se neshodují");
      return;
    }
    setSavingPw(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signErr) {
        toast.error("Aktuální heslo je nesprávné");
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
      if (updErr) throw updErr;
      toast.success("Heslo bylo změněno");
      setCurrentPw("");
      setNewPw("");
      setNewPw2("");
      setPwOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "Nepodařilo se změnit heslo");
    } finally {
      setSavingPw(false);
    }
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

            <TabsContent value="profile" className="mt-5 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-white/80 shadow-md">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                    <AvatarFallback className="text-xl bg-[color:var(--deep-hex)] text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--deep-hex)] text-white shadow-md hover:opacity-90 disabled:opacity-60"
                    aria-label="Změnit avatar"
                  >
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onAvatarPick(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Klikni na ikonu fotoaparátu pro nahrání nové fotky.<br />
                  <span className="text-xs">Max. 5 MB, JPG nebo PNG.</span>
                </div>
              </div>

              {/* Full name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Jméno</Label>
                <div className="flex gap-2">
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={80}
                    placeholder="Tvoje jméno"
                  />
                  <Button
                    onClick={() => void onSaveName()}
                    disabled={savingName || fullName === initialName}
                  >
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uložit"}
                  </Button>
                </div>
              </div>

              {/* Email read-only */}
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={user?.email ?? ""} readOnly disabled />
              </div>

              {/* Password change collapsible */}
              <Collapsible open={pwOpen} onOpenChange={setPwOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border bg-card/40 px-4 py-3 text-sm font-medium hover:bg-card/60 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Změnit heslo
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${pwOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 rounded-xl border bg-card/40 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_pw">Aktuální heslo</Label>
                    <Input
                      id="current_pw"
                      type="password"
                      autoComplete="current-password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_pw">Nové heslo</Label>
                    <Input
                      id="new_pw"
                      type="password"
                      autoComplete="new-password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_pw2">Potvrď nové heslo</Label>
                    <Input
                      id="new_pw2"
                      type="password"
                      autoComplete="new-password"
                      value={newPw2}
                      onChange={(e) => setNewPw2(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => void onChangePassword()}
                    disabled={savingPw || !currentPw || !newPw || !newPw2}
                    className="w-full"
                  >
                    {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : "Změnit heslo"}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
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
                      onClick={(e) => { e.preventDefault(); void onPushToggle(); }}
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
