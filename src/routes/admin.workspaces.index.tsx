import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/admin/workspaces/")({
  component: WorkspacesList,
});

function WorkspacesList() {
  const [rows, setRows] = useState<WorkspaceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const navigate = useNavigate();
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
        .select("id, email, workspace_id");
      if (uErr) throw uErr;

      const counts = new Map<string, number>();
      const ownerEmails = new Map<string, string>();
      for (const u of users ?? []) {
        if (u.workspace_id) counts.set(u.workspace_id, (counts.get(u.workspace_id) ?? 0) + 1);
        ownerEmails.set(u.id, u.email);
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

  const handleEnter = async (workspaceId: string) => {
    try {
      const { error: rpcErr } = await supabase.rpc("admin_start_impersonation", {
        _workspace_id: workspaceId,
      });
      if (rpcErr) throw rpcErr;
      window.localStorage.setItem(IMPERSONATION_KEY, workspaceId);
      await refresh();
      toast.success("Vstupuji do workspace…");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>+ Nový workspace</Button>
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
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!rows && !error && <p className="text-sm text-muted-foreground">Načítám…</p>}

      {rows && rows.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">Žádné workspaces.</Card>
      )}

      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Název</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Členů</th>
                <th className="px-4 py-3">Plán</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Vytvořeno</th>
                <th className="px-4 py-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{w.owner_email ?? "—"}</td>
                  <td className="px-4 py-3">{w.member_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.plan}</td>
                  <td className="px-4 py-3">
                    <Badge variant={w.status === "active" ? "default" : "secondary"}>
                      {w.status === "active" ? "Aktivní" : w.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString("cs-CZ")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/workspaces/$id" params={{ id: w.id }}>
                          Detail
                        </Link>
                      </Button>
                      <Button size="sm" onClick={() => handleEnter(w.id)}>
                        Vstoupit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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

      // Config
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

      // Roles
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

      // Production unit
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
