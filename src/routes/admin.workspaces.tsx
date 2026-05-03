import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  created_at: string;
  owner_user_id: string | null;
  owner_email: string | null;
  member_count: number;
}

export const Route = createFileRoute("/admin/workspaces")({
  component: WorkspacesList,
});

function WorkspacesList() {
  const [rows, setRows] = useState<WorkspaceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
            owner_user_id: w.owner_user_id,
            owner_email: w.owner_user_id ? ownerEmails.get(w.owner_user_id) ?? null : null,
            member_count: counts.get(w.id) ?? 0,
          })),
        );
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold">Workspaces</h1>
      </div>

      {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

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
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/workspaces/$id"
                      params={{ id: w.id }}
                      className="font-medium hover:underline"
                    >
                      {w.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{w.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{w.owner_email ?? "—"}</td>
                  <td className="px-4 py-3">{w.member_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.plan}</td>
                  <td className="px-4 py-3">
                    <Badge variant={w.status === "active" ? "default" : "secondary"}>
                      {w.status === "active" ? "Aktivní" : "Neaktivní"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString("cs-CZ")}
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
