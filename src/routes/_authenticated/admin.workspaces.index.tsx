import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { WorkspaceDetailModal } from "@/components/admin/WorkspaceDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Users, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { useWorkspaceContext, IMPERSONATION_KEY } from "@/contexts/WorkspaceContext";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  created_at: string;
  invite_token: string;
  owner_user_id: string | null;
  owner_email: string | null;
  owner_name: string | null;
  member_count: number;
}

interface TemplateOpt {
  id: string;
  name: string;
  default_modules: unknown;
  default_roles: unknown;
  default_meeting_types: unknown;
  default_metrics: unknown;
  default_follow_up_rules: unknown;
  default_production_unit: unknown;
}

export const Route = createFileRoute("/_authenticated/admin/workspaces/")({
  component: WorkspacesList,
});

const AVATAR_PALETTE = [
  "#00abbd",
  "#fc7c71",
  "#7c5cff",
  "#f5a524",
  "#22c55e",
  "#ec4899",
  "#0ea5e9",
  "#a855f7",
];

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-heading font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function WorkspacesList() {
  const [rows, setRows] = useState<WorkspaceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [detailWs, setDetailWs] = useState<WorkspaceRow | null>(null);
  const { refresh } = useWorkspaceContext();

  const load = async () => {
    try {
      const { data: workspaces, error: wsErr } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false });
      if (wsErr) throw wsErr;

      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, email, full_name, workspace_id");
      if (uErr) throw uErr;

      const counts = new Map<string, number>();
      const ownerEmails = new Map<string, string>();
      const ownerNames = new Map<string, string>();
      for (const u of users ?? []) {
        if (u.workspace_id) counts.set(u.workspace_id, (counts.get(u.workspace_id) ?? 0) + 1);
        ownerEmails.set(u.id, u.email);
        if (u.full_name) ownerNames.set(u.id, u.full_name);
      }

      setRows(
        (workspaces ?? []).map((w) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
          status: w.status,
          plan: w.plan,
          created_at: w.created_at,
          invite_token: w.invite_token,
          owner_user_id: w.owner_user_id,
          owner_email: w.owner_user_id ? ownerEmails.get(w.owner_user_id) ?? null : null,
          owner_name: w.owner_user_id ? ownerNames.get(w.owner_user_id) ?? null : null,
          member_count: counts.get(w.id) ?? 0,
        })),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const list = rows ?? [];
    return {
      total: list.length,
      active: list.filter((w) => w.status === "active").length,
      members: list.reduce((s, w) => s + w.member_count, 0),
      invites: 0,
    };
  }, [rows]);

  const handleEnter = async (workspaceId: string, name: string) => {
    try {
      const { error: rpcErr } = await supabase.rpc("admin_start_impersonation", {
        _workspace_id: workspaceId,
      });
      if (rpcErr) throw rpcErr;
      window.localStorage.setItem(IMPERSONATION_KEY, workspaceId);
      await refresh();
      toast.success(`Vstoupil/a jsi do workspace „${name}"`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Workspace celkem" value={stats.total} icon={Building2} />
        <StatCard label="Aktivní" value={stats.active} icon={Building2} />
        <StatCard label="Celkem členů" value={stats.members} icon={Users} />
        <StatCard label="Aktivní pozvánky" value={stats.invites} icon={Mail} />
      </div>

      {/* Header + create */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-foreground">Workspaces</h2>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button className="bg-[#fc7c71] hover:bg-[#fc7c71]/90 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Nový workspace
            </Button>
          </DialogTrigger>
          <NewWorkspaceDialog
            onCreated={() => {
              setOpenNew(false);
              void load();
            }}
          />
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!rows && !error && <p className="text-sm text-muted-foreground">Načítám…</p>}

      {rows && rows.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Zatím nejsou vytvořeny žádné workspace.
        </Card>
      )}

      {rows && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((w, idx) => {
            const initial = w.name?.charAt(0).toUpperCase() ?? "?";
            const color = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
            const isActive = w.status === "active";
            return (
              <Card key={w.id} className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-heading font-bold text-lg shrink-0"
                    style={{ background: color }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-foreground truncate">
                        {w.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={
                          isActive
                            ? "border-green-500/40 text-green-700 dark:text-green-400 bg-green-500/10"
                            : "border-muted text-muted-foreground"
                        }
                      >
                        {isActive ? "aktivní" : w.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {w.owner_name ?? w.owner_email ?? "Bez vlastníka"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-base font-heading font-bold text-foreground">
                      {w.member_count}
                    </div>
                    <div className="text-[11px] text-muted-foreground">členů</div>
                  </div>
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-base font-heading font-bold text-foreground">
                      {w.plan}
                    </div>
                    <div className="text-[11px] text-muted-foreground">plán</div>
                  </div>
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-base font-heading font-bold text-foreground truncate">
                      {w.slug}
                    </div>
                    <div className="text-[11px] text-muted-foreground">slug</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Vytvořeno {format(new Date(w.created_at), "d. M. yyyy", { locale: cs })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDetailWs(w)}
                  >
                    Detail
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-[#00abbd] hover:bg-[#00abbd]/90 text-white"
                    onClick={() => handleEnter(w.id, w.name)}
                  >
                    Vstoupit
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {detailWs && (
        <WorkspaceDetailModal
          workspace={{
            id: detailWs.id,
            name: detailWs.name,
            slug: detailWs.slug,
            status: detailWs.status,
            plan: detailWs.plan,
            invite_token: detailWs.invite_token,
            owner_user_id: detailWs.owner_user_id,
          }}
          open={!!detailWs}
          onClose={() => {
            setDetailWs(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function NewWorkspaceDialog({ onCreated }: { onCreated: () => void }) {
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [plan, setPlan] = useState("starter");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ inviteUrl: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("workspace_templates")
        .select("*")
        .order("created_at", { ascending: false });
      setTemplates((data ?? []) as TemplateOpt[]);
    })();
  }, []);

  const submit = async () => {
    if (!name.trim() || !templateId || !ownerEmail.trim()) {
      toast.error("Vyplň všechna pole");
      return;
    }
    setBusy(true);
    try {
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) throw new Error("Šablona nenalezena");

      const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);

      const { data: tokenData, error: tokErr } = await supabase.rpc("gen_invite_token");
      if (tokErr) throw tokErr;
      const invite_token = tokenData as unknown as string;

      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .insert({ name: name.trim(), slug, status: "active", plan, invite_token })
        .select()
        .single();
      if (wsErr) throw wsErr;

      const { error: cfgErr } = await supabase.from("workspace_config").insert({
        workspace_id: ws.id,
        modules: tpl.default_modules as never,
        meeting_types: tpl.default_meeting_types as never,
        follow_up_rules: tpl.default_follow_up_rules as never,
        metrics: tpl.default_metrics as never,
        promotion: {} as never,
        impersonation: { enabled: false } as never,
        ui_config: {} as never,
      });
      if (cfgErr) throw cfgErr;

      const roles = (tpl.default_roles as Array<{ key: string; label: string; level: number }>) ?? [];
      if (roles.length) {
        const { error: rErr } = await supabase.from("workspace_roles").insert(
          roles.map((r) => ({
            workspace_id: ws.id,
            key: r.key,
            label: r.label,
            level: r.level,
            permissions: {} as never,
          })),
        );
        if (rErr) throw rErr;
      }

      const pu = tpl.default_production_unit as
        | { key?: string; label?: string; value_multiplier?: number }
        | null;
      if (pu && pu.key) {
        await supabase.from("production_units").insert({
          workspace_id: ws.id,
          key: pu.key,
          label: pu.label ?? pu.key,
          value_multiplier: pu.value_multiplier ?? 1.0,
        });
      }

      const inviteUrl = `${window.location.origin}/join/${invite_token}`;
      toast.success("Workspace vytvořen. Pošli pozvánku ownerovi: " + ownerEmail);
      setCreated({ inviteUrl });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workspace vytvořen</DialogTitle>
          <DialogDescription>
            Pošli tento odkaz ownerovi {ownerEmail}. Po registraci dokončí setup.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Invite link</Label>
          <Input readOnly value={created.inviteUrl} onFocus={(e) => e.currentTarget.select()} />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(created.inviteUrl);
              toast.success("Zkopírováno");
            }}
          >
            Kopírovat
          </Button>
          <Button onClick={onCreated}>Hotovo</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nový workspace</DialogTitle>
        <DialogDescription>
          Vytvoří workspace ze šablony a vygeneruje invite link pro ownera.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ws-name">Název</Label>
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Šablona</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Vyber šablonu" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner-email">Email ownera</Label>
          <Input
            id="owner-email"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@firma.cz"
          />
        </div>
        <div className="space-y-2">
          <Label>Plán</Label>
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
      <DialogFooter>
        <Button onClick={submit} disabled={busy}>
          {busy ? "Vytvářím…" : "Vytvořit workspace"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
