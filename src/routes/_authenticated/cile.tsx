import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PeriodSwitcher, getPeriodRange, type PeriodMode } from "@/components/dashboard/PeriodSwitcher";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";
import { format, endOfWeek, endOfMonth } from "date-fns";

export const Route = createFileRoute("/_authenticated/cile")({
  component: CilePage,
});

interface GoalRow {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string | null;
  metric_key: string;
  target_value: number;
  current_value: number;
  goal_type: string;
  period_type: string;
  period_start: string;
  period_end: string | null;
}

function CilePage() {
  const { workspace, user } = useWorkspace();
  const { canAccessLevel } = useRoles();
  const qc = useQueryClient();
  const isLeader = canAccessLevel(2);

  const [mode, setMode] = useState<PeriodMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const period = useMemo(() => getPeriodRange(mode, anchor), [mode, anchor]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    goal_type: "personal",
    target_value: "",
    target_user_id: "",
  });

  // Team members for leader assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("workspace_id", workspace.id)
        .order("full_name");
      return data ?? [];
    },
    enabled: !!workspace?.id && isLeader,
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals-list", workspace?.id, user?.id, mode, period.startStr, isLeader],
    queryFn: async () => {
      if (!workspace?.id || !user?.id) return [];
      let q = supabase
        .from("goals")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("period_type", mode)
        .eq("period_start", period.startStr);
      if (!isLeader) q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
    enabled: !!workspace?.id && !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !user?.id) throw new Error("No workspace");
      const target = Number(form.target_value);
      if (!form.title.trim() || !target) throw new Error("Vyplň název a cílovou hodnotu");
      const targetUserId = isLeader && form.target_user_id ? form.target_user_id : user.id;
      const periodEnd = mode === "week" ? endOfWeek(anchor, { weekStartsOn: 1 }) : endOfMonth(anchor);
      const { error } = await supabase.from("goals").insert({
        workspace_id: workspace.id,
        user_id: targetUserId,
        title: form.title.trim(),
        metric_key: form.title.trim().toLowerCase().replace(/\s+/g, "_"),
        target_value: target,
        goal_type: form.goal_type,
        period_type: mode,
        period_start: period.startStr,
        period_end: format(periodEnd, "yyyy-MM-dd"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cíl vytvořen");
      setOpen(false);
      setForm({ title: "", goal_type: "personal", target_value: "", target_user_id: "" });
      qc.invalidateQueries({ queryKey: ["goals-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const userById = useMemo(() => {
    const m = new Map<string, string>();
    teamMembers.forEach((u) => m.set(u.id, u.full_name || u.email));
    if (user) m.set(user.id, user.full_name || user.email);
    return m;
  }, [teamMembers, user]);

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7" /> Cíle
          </h1>
          <p className="text-muted-foreground">Přehled cílů pro {period.label}</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSwitcher mode={mode} setMode={setMode} anchor={anchor} setAnchor={setAnchor} label={period.label} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nový cíl</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nový cíl</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Název</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Např. Týdenní BJ" />
                </div>
                <div>
                  <Label>Typ</Label>
                  <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Osobní</SelectItem>
                      <SelectItem value="team">Týmový</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cílová hodnota</Label>
                  <Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
                </div>
                <div>
                  <Label>Období</Label>
                  <p className="text-sm text-muted-foreground">{mode === "week" ? "Týden" : "Měsíc"}: {period.label}</p>
                </div>
                {isLeader && (
                  <div>
                    <Label>Přiřadit členovi (volitelné)</Label>
                    <Select value={form.target_user_id || "self"} onValueChange={(v) => setForm({ ...form, target_user_id: v === "self" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Sobě</SelectItem>
                        {teamMembers.filter((m) => m.id !== user?.id).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>Vytvořit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Načítám…</p>
      ) : goals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Žádné cíle pro toto období. Vytvoř první pomocí tlačítka „Nový cíl".
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
            const ownerName = userById.get(g.user_id) ?? "—";
            return (
              <Card key={g.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{g.title || g.metric_key}</CardTitle>
                    <Badge variant={g.goal_type === "team" ? "default" : "secondary"}>
                      {g.goal_type === "team" ? "Týmový" : "Osobní"}
                    </Badge>
                  </div>
                  {isLeader && g.user_id !== user?.id && (
                    <p className="text-xs text-muted-foreground">{ownerName}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={pct} />
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{Number(g.current_value)}</span>
                    <span className="text-muted-foreground">/ {Number(g.target_value)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.round(pct)}% splněno</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
