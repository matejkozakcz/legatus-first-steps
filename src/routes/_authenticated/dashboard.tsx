import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GdprConsentModal, useGdprConsent } from "@/components/GdprConsentModal";
import { Plus, LogOut } from "lucide-react";
import { GaugeIndicator } from "@/components/dashboard/GaugeIndicator";
import { OrgChart } from "@/components/dashboard/OrgChart";
import { PeriodSwitcher, getPeriodRange, type PeriodMode } from "@/components/dashboard/PeriodSwitcher";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { signOut, user: authUser } = useAuth();
  const navigate = useNavigate();
  const { workspace, user, productionUnit } = useWorkspace();
  const { currentRole } = useRoles();
  const { meetingTypes } = useMeetingTypes();
  const { hasConsent } = useGdprConsent();
  const { effectiveUserId, isImpersonating, start: startImpersonate, state: impState } = useImpersonation();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // The user we're viewing data for (self or impersonated)
  const viewedUserId = effectiveUserId ?? user?.id ?? null;
  const viewedUserName = isImpersonating ? impState?.targetName : user?.full_name;

  const [mode, setMode] = useState<PeriodMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const period = useMemo(() => getPeriodRange(mode, anchor), [mode, anchor]);

  useEffect(() => {
    if (!authUser?.id) return;
    supabase.from("legatus_admins").select("id").eq("user_id", authUser.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [authUser?.id]);

  useEffect(() => {
    if (!workspace && isAdmin) navigate({ to: "/admin", replace: true });
  }, [workspace, isAdmin, navigate]);

  // Goals for viewed user (self or impersonated) + period
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", workspace?.id, viewedUserId, mode, period.startStr],
    queryFn: async () => {
      if (!workspace?.id || !viewedUserId) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("metric_key, target_value")
        .eq("workspace_id", workspace.id)
        .eq("user_id", viewedUserId)
        .eq("period_type", mode)
        .eq("period_start", period.startStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspace?.id && !!viewedUserId,
  });

  // Meetings in period (own + subtree per RLS)
  const { data: periodMeetings = [] } = useQuery({
    queryKey: ["dashboard_meetings", workspace?.id, period.startStr, period.endStr],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from("meetings")
        .select("id, user_id, type_key, status, scheduled_at, created_at, result")
        .eq("workspace_id", workspace.id)
        .gte("scheduled_at", period.startStr)
        .lte("scheduled_at", period.endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspace?.id,
  });

  const goalMap = useMemo(() => {
    const m = new Map<string, number>();
    goals.forEach((g: any) => m.set(g.metric_key, Number(g.target_value)));
    return m;
  }, [goals]);

  const personalBj = useMemo(() => {
    return periodMeetings
      .filter((m: any) => m.user_id === viewedUserId)
      .reduce((s: number, m: any) => s + Number(m.result?.bj ?? m.result?.podepsane_bj ?? 0), 0);
  }, [periodMeetings, viewedUserId]);

  const teamBj = useMemo(() => {
    return periodMeetings.reduce((s: number, m: any) => s + Number(m.result?.bj ?? m.result?.podepsane_bj ?? 0), 0);
  }, [periodMeetings]);

  const personalMeetingCount = useMemo(
    () => periodMeetings.filter((m: any) => m.user_id === viewedUserId && m.status !== "cancelled").length,
    [periodMeetings, viewedUserId]
  );

  // Activity per meeting type: scheduled vs completed in period
  const activityByType = useMemo(() => {
    const byType = new Map<string, { scheduled: number; completed: number }>();
    meetingTypes.forEach((t) => byType.set(t.key, { scheduled: 0, completed: 0 }));
    periodMeetings.forEach((m: any) => {
      const entry = byType.get(m.type_key);
      if (!entry) return;
      entry.scheduled += 1;
      if (m.status === "completed" || m.status === "done") entry.completed += 1;
    });
    return byType;
  }, [periodMeetings, meetingTypes]);

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{isAdmin ? "Přesměrovávám…" : "Žádný workspace"}</CardTitle>
            <CardDescription>
              {isAdmin ? "Otevírám Legatus Admin Panel." : "Tvůj účet zatím nemá přiřazený workspace. Kontaktuj Legatus admina."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {isAdmin && <Button asChild><Link to="/admin">Otevřít Admin</Link></Button>}
            <Button variant="outline" onClick={() => signOut()}>Odhlásit se</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unitLabel = productionUnit?.label ?? "BJ";

  return (
    <div className="min-h-screen bg-background">
      <GdprConsentModal />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{workspace.name}</h1>
            <p className="text-xs text-muted-foreground">
              {viewedUserName ?? user?.full_name} · {currentRole?.label ?? "—"}
              {isImpersonating && <span className="ml-2 text-amber-600 font-medium">(náhled)</span>}
            </p>
          </div>
          <PeriodSwitcher mode={mode} setMode={setMode} anchor={anchor} setAnchor={setAnchor} label={period.label} />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!hasConsent || isImpersonating}
              onClick={() => navigate({ to: "/schuzky/nova" })}
              title={isImpersonating ? "Pouze náhled" : !hasConsent ? "Nejprve potvrď GDPR souhlas" : undefined}
            >
              <Plus className="mr-1 h-4 w-4" /> Schůzka
            </Button>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cíle</CardTitle>
              <CardDescription>{period.label}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 pt-2">
              <GaugeIndicator
                label={`Týmové ${unitLabel}`}
                value={teamBj}
                target={goalMap.get("team_bj") ?? 0}
                color="hsl(var(--primary))"
                unit={unitLabel}
              />
              <GaugeIndicator
                label={`Osobní ${unitLabel}`}
                value={personalBj}
                target={goalMap.get("personal_bj") ?? 0}
                color="hsl(150 55% 42%)"
                unit={unitLabel}
              />
              <GaugeIndicator
                label="Schůzky"
                value={personalMeetingCount}
                target={goalMap.get("meetings_count") ?? 0}
                color="hsl(30 85% 55%)"
              />
            </CardContent>
          </Card>

          {/* Org Chart */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Tým</CardTitle>
              <CardDescription>Hierarchie a {unitLabel} týmu za období</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 520 }}>
                <OrgChart
                  periodStart={period.startStr}
                  periodEnd={period.endStr}
                  onImpersonate={(id, name) => void startImpersonate(id, name)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities row */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivity podle typů schůzek</CardTitle>
            <CardDescription>Domluvené vs. proběhlé za období</CardDescription>
          </CardHeader>
          <CardContent>
            {meetingTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné typy schůzek nejsou nakonfigurovány.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {meetingTypes.map((t) => {
                  const stats = activityByType.get(t.key) ?? { scheduled: 0, completed: 0 };
                  const pct = stats.scheduled > 0 ? stats.completed / stats.scheduled : 0;
                  return (
                    <div
                      key={t.key}
                      className="rounded-xl border bg-card px-4 py-3 space-y-2"
                      style={{ borderTop: `2px solid ${t.color}` }}
                    >
                      <div className="flex items-baseline justify-between">
                        <Badge style={{ backgroundColor: t.color }} className="text-primary-foreground">{t.key}</Badge>
                        <span>
                          <span style={{ color: t.color, fontWeight: 700, fontSize: 22 }}>{stats.completed}</span>
                          <span className="text-xs text-muted-foreground font-medium"> z {stats.scheduled}</span>
                        </span>
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                        {t.label}
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.round(pct * 100)}%`, background: t.color, transition: "width 0.4s" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
