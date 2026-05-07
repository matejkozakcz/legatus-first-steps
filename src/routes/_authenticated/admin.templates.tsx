import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  TemplateEditor,
  DEFAULT_TEMPLATE,
  normalizeTemplate,
  templateToDb,
  type TemplateData,
} from "@/components/admin/TemplateEditor";

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

function TemplatesList() {
  const [items, setItems] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Nová šablona</Button>
          </DialogTrigger>
          <TemplateDialog
            mode="create"
            onDone={() => {
              setCreateOpen(false);
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  {t.description && (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  Upravit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <div>
                Role: {Array.isArray(t.default_roles) ? (t.default_roles as unknown[]).length : 0}
              </div>
              <div>
                Typy schůzek:{" "}
                {Array.isArray(t.default_meeting_types) ? (t.default_meeting_types as unknown[]).length : 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <TemplateDialog
            mode="edit"
            template={editing}
            onDone={() => {
              setEditing(null);
              void load();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function TemplateDialog({
  mode,
  template,
  onDone,
}: {
  mode: "create" | "edit";
  template?: Template;
  onDone: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [data, setData] = useState<TemplateData>(
    template ? normalizeTemplate(template) : DEFAULT_TEMPLATE,
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Zadej název");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        description: description?.trim() || null,
        ...templateToDb(data),
      } as never;
      if (mode === "create") {
        const { error } = await supabase.from("workspace_templates").insert(payload);
        if (error) throw error;
        toast.success("Šablona vytvořena");
      } else if (template) {
        const { error } = await supabase
          .from("workspace_templates")
          .update(payload)
          .eq("id", template.id);
        if (error) throw error;
        toast.success("Šablona uložena");
      }
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Nová šablona" : "Upravit šablonu"}</DialogTitle>
        <DialogDescription>
          Definuj výchozí konfiguraci pro nové workspaces.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="t-name">Název</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-desc">Popis</Label>
            <Input
              id="t-desc"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <TemplateEditor value={data} onChange={setData} />
      </div>
      <DialogFooter className="sm:justify-between">
        {mode === "edit" && template ? (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (!confirm(`Opravdu smazat šablonu "${template.name}"?`)) return;
              setBusy(true);
              try {
                const { error } = await supabase
                  .from("workspace_templates")
                  .delete()
                  .eq("id", template.id);
                if (error) throw error;
                toast.success("Šablona smazána");
                onDone();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Smazat
          </Button>
        ) : <span />}
        <Button onClick={submit} disabled={busy}>
          {busy ? "Ukládám…" : mode === "create" ? "Vytvořit šablonu" : "Uložit"}
        </Button>
      </DialogFooter>

    </DialogContent>
  );
}
