import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { X, Plus, Trash2, Crown, Link as LinkIcon, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface WorkspaceLite {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  invite_token: string;
  owner_user_id: string | null;
}

interface Props {
  workspace: WorkspaceLite;
  open: boolean;
  onClose: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  vedouci: "#00555f",
  budouci_vedouci: "#22c55e",
  garant: "#7c5cff",
  ziskatel: "#00abbd",
  novacek: "#94a3b8",
};

const ROLE_LABELS_FALLBACK: Record<string, string> = {
  vedouci: "Vedoucí",
  budouci_vedouci: "Budoucí vedoucí",
  garant: "Garant",
  ziskatel: "Získatel",
  novacek: "Nováček",
};

export function WorkspaceDetailModal({ workspace, open, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(workspace.name);
  const [plan, setPlan] = useState(workspace.plan);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState(workspace.invite_token);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (open) {
      setName(workspace.name);
      setPlan(workspace.plan);
      setInviteToken(workspace.invite_token);
    }
  }, [open, workspace.id, workspace.name, workspace.plan, workspace.invite_token]);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${inviteToken}`
    : `/join/${inviteToken}`;

  // Members of this workspace
  const { data: members } = useQuery({
    queryKey: ["ws_members", workspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, role_key, is_active")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
    enabled: open,
  });

  // Workspace roles (for label mapping)
  const { data: roles } = useQuery({
    queryKey: ["ws_roles", workspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workspace_roles")
        .select("key, label, level")
        .eq("workspace_id", workspace.id)
        .order("level", { ascending: false });
      return data ?? [];
    },
    enabled: open,
  });

  const roleLabel = (key: string | null) => {
    if (!key) return "—";
    const r = roles?.find((x) => x.key === key);
    return r?.label ?? ROLE_LABELS_FALLBACK[key] ?? key;
  };

  // Users without workspace (available to add)
  const { data: availableUsers } = useQuery({
    queryKey: ["users_unassigned"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email")
        .is("workspace_id", null)
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
    enabled: open && addPickerOpen,
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("users")
        .update({ workspace_id: workspace.id })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Člen přidán");
      qc.invalidateQueries({ queryKey: ["ws_members", workspace.id] });
      qc.invalidateQueries({ queryKey: ["users_unassigned"] });
      qc.invalidateQueries({ queryKey: ["admin_workspaces"] });
      setAddPickerOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("users")
        .update({ workspace_id: null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Člen odebrán");
      qc.invalidateQueries({ queryKey: ["ws_members", workspace.id] });
      qc.invalidateQueries({ queryKey: ["admin_workspaces"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBasics = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workspaces")
        .update({ name: name.trim(), plan })
        .eq("id", workspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Změny uloženy");
      qc.invalidateQueries({ queryKey: ["admin_workspaces"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      // Detach members
      await supabase.from("users").update({ workspace_id: null }).eq("workspace_id", workspace.id);
      await supabase.from("workspace_config").delete().eq("workspace_id", workspace.id);
      await supabase.from("workspace_roles").delete().eq("workspace_id", workspace.id);
      await supabase.from("production_units").delete().eq("workspace_id", workspace.id);
      const { error } = await supabase.from("workspaces").delete().eq("id", workspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workspace smazán");
      qc.invalidateQueries({ queryKey: ["admin_workspaces"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Zkopírováno");
  };

  const rotateToken = async () => {
    setRotating(true);
    const { data, error } = await supabase.rpc("rotate_workspace_invite_token", {
      _workspace_id: workspace.id,
    });
    setRotating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInviteToken(data as unknown as string);
    toast.success("Token rotován");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-w-3xl p-0 gap-0 overflow-hidden shadow-2xl border-0"
          style={{ borderRadius: 28 }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex items-start justify-between text-white"
            style={{ background: "#00555f" }}
          >
            <div>
              <h2 className="font-heading font-bold text-xl">{workspace.name}</h2>
              <p className="text-sm opacity-80 mt-0.5">
                Workspace · {workspace.slug} · plán {workspace.plan}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Zavřít"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
            {/* Basic info */}
            <section className="space-y-3">
              <h3 className="font-heading font-semibold text-foreground">Základní údaje</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Název workspace</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Plán</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Invite link */}
            <section className="space-y-3">
              <h3 className="font-heading font-semibold text-foreground">Pozvánkový odkaz</h3>
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(0,171,189,0.08)", border: "1px solid rgba(0,171,189,0.25)" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ background: "#00abbd" }}
                  >
                    <LinkIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-semibold text-sm text-foreground">
                      Pozvánkový odkaz workspace
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sdílej s novými členy. Otevře onboarding přímo do tohoto workspace.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={inviteUrl} readOnly className="bg-background font-mono text-xs" />
                  <Button
                    size="sm"
                    onClick={copyInvite}
                    className="bg-[#00abbd] hover:bg-[#00abbd]/90 text-white shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Kopírovat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={rotateToken}
                    disabled={rotating}
                    className="shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {rotating ? "…" : "Rotovat"}
                  </Button>
                </div>
              </div>
            </section>

            {/* Members */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-foreground">
                  Členové workspace{" "}
                  <span className="text-muted-foreground font-normal text-sm">
                    · {members?.length ?? 0}
                  </span>
                </h3>
                <Popover open={addPickerOpen} onOpenChange={setAddPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      className="rounded-full bg-[#00abbd] hover:bg-[#00abbd]/90 text-white"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Přidat
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-72" align="end">
                    <Command>
                      <CommandInput placeholder="Hledat…" />
                      <CommandList>
                        <CommandEmpty>Žádní volní uživatelé</CommandEmpty>
                        <CommandGroup>
                          {(availableUsers ?? []).map((m) => (
                            <CommandItem
                              key={m.id}
                              onSelect={() => addMember.mutate(m.id)}
                              className="flex items-center justify-between"
                            >
                              <span>{m.full_name ?? m.email}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                {(members ?? []).map((m) => {
                  const isOwner = m.id === workspace.owner_user_id;
                  const color = ROLE_COLORS[m.role_key ?? ""] ?? "#94a3b8";
                  const display = m.full_name ?? m.email;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                          style={{ background: color }}
                        >
                          {display.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
                            {display}
                            {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {roleLabel(m.role_key)}
                            {isOwner && " · zakladatel workspace"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          style={{ borderColor: color, color }}
                          className="text-[11px]"
                        >
                          {isOwner ? "zakladatel" : roleLabel(m.role_key)}
                        </Badge>
                        {!isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember.mutate(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(members?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground italic">Žádní členové</p>
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-background/50">
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Smazat workspace
            </Button>
            <Button
              onClick={() => saveBasics.mutate()}
              disabled={saveBasics.isPending}
              className="bg-[#fc7c71] hover:bg-[#fc7c71]/90 text-white"
            >
              {saveBasics.isPending ? "Ukládání…" : "Uložit změny"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat workspace „{workspace.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Všichni členové budou odpojeni a config smazán. Tuto akci nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkspace.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
