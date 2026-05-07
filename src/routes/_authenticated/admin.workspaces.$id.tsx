import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/workspaces/$id")({
  component: WorkspaceDetail,
});

const FIELDS = [
  { key: "meeting_types", label: "Meeting Types" },
  { key: "follow_up_rules", label: "Follow-Up Rules" },
  { key: "modules", label: "Modules" },
  { key: "promotion", label: "Promotion" },
  { key: "metrics", label: "Metrics" },
  { key: "impersonation", label: "Impersonation" },
  { key: "ui_config", label: "UI Config" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

interface Workspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  created_at: string;
  invite_token: string | null;
}

interface ConfigRow {
  id: string;
  workspace_id: string;
  meeting_types: unknown;
  follow_up_rules: unknown;
  modules: unknown;
  promotion: unknown;
  metrics: unknown;
  impersonation: unknown;
  ui_config: unknown;
}

interface ProductionUnit {
  id: string;
  key: string;
  label: string;
  value_multiplier: number;
}

function WorkspaceDetail() {
  const { id } = useParams({ from: "/admin/workspaces/$id" });
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [prodUnits, setProdUnits] = useState<ProductionUnit[]>([]);
  const [drafts, setDrafts] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState<FieldKey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rotatingToken, setRotatingToken] = useState(false);

  const inviteUrl = workspace?.invite_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${workspace.invite_token}`
    : "";

  const rotateToken = async () => {
    if (!workspace) return;
    setRotatingToken(true);
    const { data, error } = await supabase.rpc("rotate_workspace_invite_token", {
      _workspace_id: workspace.id,
    });
    setRotatingToken(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Token rotován");
    setWorkspace({ ...workspace, invite_token: data as string });
  };

  const copyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Zkopírováno");
  };

  const reload = async () => {
    try {
      const [{ data: ws }, { data: cfg }, { data: units }] = await Promise.all([
        supabase.from("workspaces").select("*").eq("id", id).maybeSingle(),
        supabase.from("workspace_config").select("*").eq("workspace_id", id).maybeSingle(),
        supabase.from("production_units").select("*").eq("workspace_id", id),
      ]);
      setWorkspace(ws as Workspace | null);
      setConfig(cfg as ConfigRow | null);
      setProdUnits((units as ProductionUnit[]) ?? []);
      if (cfg) {
        const next = {} as Record<FieldKey, string>;
        for (const f of FIELDS) {
          next[f.key] = JSON.stringify((cfg as unknown as Record<string, unknown>)[f.key] ?? null, null, 2);
        }
        setDrafts(next);
      }
    } catch (e) {
      setLoadError((e as Error).message);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async (field: FieldKey) => {
    setErrors((p) => ({ ...p, [field]: undefined }));
    let parsed: unknown;
    try {
      parsed = JSON.parse(drafts[field]);
    } catch (e) {
      setErrors((p) => ({ ...p, [field]: (e as Error).message }));
      return;
    }
    setSaving(field);
    try {
      if (!config) throw new Error("Workspace nemá záznam v workspace_config.");
      const previous = (config as unknown as Record<string, unknown>)[field];
      const { error } = await supabase
        .from("workspace_config")
        .update({ [field]: parsed as never })
        .eq("id", config.id);
      if (error) throw error;

      await supabase.from("workspace_config_log").insert({
        workspace_id: id,
        change_type: field,
        previous_value: previous as never,
        new_value: parsed as never,
      });

      toast.success(`${field} uloženo`);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  if (loadError) {
    return <div className="text-sm text-destructive">{loadError}</div>;
  }
  if (!workspace) {
    return <p className="text-sm text-muted-foreground">Načítám…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/admin/workspaces"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Zpět na workspaces
        </Link>
        <div className="text-xs text-muted-foreground">
          Admin / Workspaces / <span className="text-foreground">{workspace.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
          <Badge variant={workspace.status === "active" ? "default" : "secondary"}>
            {workspace.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <Meta label="Slug" value={workspace.slug} />
          <Meta label="Plan" value={workspace.plan} />
          <Meta label="Vytvořeno" value={new Date(workspace.created_at).toLocaleDateString("cs-CZ")} />
          <Meta label="Production Units" value={String(prodUnits.length)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pozvánka</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Token
              </p>
              <Input
                value={workspace.invite_token ?? ""}
                readOnly
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Plný odkaz
              </p>
              <Input value={inviteUrl} readOnly />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={copyInvite}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={rotateToken}
                disabled={rotatingToken}
              >
                {rotatingToken ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Rotovat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!config && (
        <Card className="border-dashed p-6 text-sm text-muted-foreground">
          Tento workspace nemá záznam v <code>workspace_config</code>.
        </Card>
      )}

      {config &&
        FIELDS.map((f) => (
          <Card key={f.key}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="text-base">{f.label}</CardTitle>
              <Button size="sm" disabled={saving === f.key} onClick={() => save(f.key)}>
                {saving === f.key ? "Ukládám…" : "Uložit"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                className="h-64 w-full rounded-md border bg-muted/20 p-3 font-mono text-xs"
                value={drafts[f.key] ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [f.key]: e.target.value }))}
                spellCheck={false}
              />
              {errors[f.key] && (
                <p className="text-xs text-destructive">JSON chyba: {errors[f.key]}</p>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
