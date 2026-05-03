import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  default_roles: unknown;
  default_meeting_types: unknown;
  default_metrics: unknown;
  default_modules: unknown;
  default_follow_up_rules: unknown;
  default_production_unit: unknown;
}

export const Route = createFileRoute("/admin/templates")({
  component: TemplatesList,
});

const DEFAULTS = {
  modules: { meetings: true, people: true, team: true, production: true },
  roles: [
    { key: "agent", label: "Agent", level: 3 },
    { key: "manager", label: "Manažer", level: 2 },
    { key: "director", label: "Ředitel", level: 1 },
  ],
  meetingTypes: [
    { key: "intro", label: "Úvodní schůzka", color: "#3b82f6" },
    { key: "closing", label: "Uzavírací schůzka", color: "#10b981" },
  ],
  metrics: [{ key: "smlouvy", label: "Smlouvy" }],
  followUpRules: { intro_to_closing: 7 },
  productionUnit: { key: "smlouva", label: "Smlouva", value_multiplier: 1.0 },
};

function TemplatesList() {
  const [items, setItems] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data, error: e } = await supabase
      .from("workspace_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (e) setError(e.message);
    else setItems((data ?? []) as Template[]);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold">Workspace Templates</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ Nová šablona</Button>
          </DialogTrigger>
          <NewTemplateDialog
            onCreated={() => {
              setOpen(false);
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
      {!items && !error && <p className="text-sm text-muted-foreground">Načítám…</p>}
      {items && items.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">Žádné šablony.</Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items?.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-base">{t.name}</CardTitle>
              {t.description && (
                <p className="text-sm text-muted-foreground">{t.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <Preview label="Roles" value={t.default_roles} />
              <Preview label="Meeting Types" value={t.default_meeting_types} />
              <Preview label="Metrics" value={t.default_metrics} />
              <Preview label="Modules" value={t.default_modules} />
              <Preview label="Follow-Up Rules" value={t.default_follow_up_rules} />
              <Preview label="Production Unit" value={t.default_production_unit} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Preview({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="border-t py-2 text-sm">
      <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </summary>
      <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/30 p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function NewTemplateDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [json, setJson] = useState(JSON.stringify(DEFAULTS, null, 2));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Zadej název");
      return;
    }
    setBusy(true);
    try {
      const parsed = JSON.parse(json);
      const { error } = await supabase.from("workspace_templates").insert({
        name: name.trim(),
        description: description.trim() || null,
        default_modules: parsed.modules ?? {},
        default_roles: parsed.roles ?? [],
        default_meeting_types: parsed.meetingTypes ?? [],
        default_metrics: parsed.metrics ?? [],
        default_follow_up_rules: parsed.followUpRules ?? {},
        default_production_unit: parsed.productionUnit ?? {},
      });
      if (error) throw error;
      toast.success("Šablona vytvořena");
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Nová šablona</DialogTitle>
        <DialogDescription>
          Definuj výchozí konfiguraci pro nové workspaces.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="t-name">Název</Label>
          <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-desc">Popis</Label>
          <Input
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-json">Konfigurace (JSON)</Label>
          <Textarea
            id="t-json"
            rows={14}
            className="font-mono text-xs"
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={busy}>
          {busy ? "Vytvářím…" : "Vytvořit šablonu"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
