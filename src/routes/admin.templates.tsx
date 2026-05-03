import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  useEffect(() => {
    (async () => {
      const { data, error: e } = await supabase
        .from("workspace_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (e) setError(e.message);
      else setItems((data ?? []) as Template[]);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold">Workspace Templates</h1>
      </div>

      {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
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
