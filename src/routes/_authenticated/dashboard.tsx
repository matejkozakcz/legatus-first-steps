import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GdprConsentModal, useGdprConsent } from "@/components/GdprConsentModal";
import { Plus, FileDown, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { GaugeIndicator } from "@/components/dashboard/GaugeIndicator";
import { OrgChart } from "@/components/dashboard/OrgChart";
import { getPeriodRange, type PeriodMode } from "@/components/dashboard/PeriodSwitcher";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNewMeetingModal } from "@/components/NewMeetingModal";
import { addWeeks, addMonths } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { workspace, user, productionUnit } = useWorkspace();
  const { currentRole } = useRoles();
  const { meetingTypes } = useMeetingTypes();
  const { hasConsent } = useGdprConsent();
  const { effectiveUserId, isImpersonating, start: startImpersonate, state: impState } = useImpersonation();
  const { open: openNewMeeting } = useNewMeetingModal();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [mode, setMode] = useState<PeriodMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const period = useMemo(() => getPeriodRange(mode, anchor), [mode, anchor]);

  const viewedUserId = effectiveUserId ?? user?.id ?? null;
  const viewedUserName = isImpersonating ? impState?.targetName : user?.full_name;

  useEffect(() => {
    if (!authUser?.id) return;
    supabase.from("legatus_admins").select("id").eq("user_id", authUser.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [authUser?.id]);

  useEffect(() => {
    if (!workspace && isAdmin) navigate({ to: "/admin", replace: true });
  }, [workspace, isAdmin, navigate]);

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", workspace?.id, viewedUserId, mode, period.startStr],
    queryFn: async () => {
      if (!workspace?.id || !viewedUserId) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("metric_key, target_value, title")
        .eq("workspace_id", workspace.id)
        .eq("user_id", viewedUserId)
        .eq("period_type", mode)
        .eq("period_start", period.startStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspace?.id && !!viewedUserId,
  });

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
    const m = new Map<string, { target: number; title: string | null }>();
    goals.forEach((g: any) => m.set(g.metric_key, { target: Number(g.target_value), title: g.title }));
    return m;
  }, [goals]);

  const personalBj = useMemo(
    () => periodMeetings
      .filter((m: any) => m.user_id === viewedUserId)
      .reduce((s, m: any) => s + Number(m.result?.bj ?? m.result?.podepsane_bj ?? 0), 0),
    [periodMeetings, viewedUserId]
  );

  const teamBj = useMemo(
    () => periodMeetings.reduce((s, m: any) => s + Number(m.result?.bj ?? m.result?.podepsane_bj ?? 0), 0),
    [periodMeetings]
  );

  const personalMeetingCount = useMemo(
    () => periodMeetings.filter((m: any) => m.user_id === viewedUserId && m.status !== "cancelled").length,
    [periodMeetings, viewedUserId]
  );

  // Activity per type: scheduled vs completed (domluvené vs proběhlé)
  const activityByType = useMemo(() => {
    const byType = new Map<string, { scheduled: number; completed: number; referrals: number }>();
    meetingTypes.forEach((t) => byType.set(t.key, { scheduled: 0, completed: 0, referrals: 0 }));
    periodMeetings.forEach((m: any) => {
      const entry = byType.get(m.type_key);
      if (!entry) return;
      entry.scheduled += 1;
      if (m.status === "completed" || m.status === "done") entry.completed += 1;
      const ref = Number(m.result?.referrals ?? m.result?.doporuceni ?? 0);
      if (ref > 0) entry.referrals += ref;
    });
    return byType;
  }, [periodMeetings, meetingTypes]);

  const totalReferrals = useMemo(() => {
    let t = 0;
    activityByType.forEach((v) => (t += v.referrals));
    return t;
  }, [activityByType]);

  const shift = (dir: -1 | 1) => setAnchor(mode === "week" ? addWeeks(anchor, dir) : addMonths(anchor, dir));

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{isAdmin ? "Přesměrovávám…" : "Žádný workspace"}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {isAdmin && <Button asChild><Link to="/admin">Otevřít Admin</Link></Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const unitLabel = productionUnit?.label ?? "BJ";

  // Build gauges from goals + smart fallbacks
  const gauges: Array<{ label: string; value: number; target: number; color: string; unit?: string }> = [];
  const teamGoal = goalMap.get("team_bj");
  const personalGoal = goalMap.get("personal_bj");
  const meetingsGoal = goalMap.get("meetings_count");

  if (teamGoal || teamBj > 0) {
    gauges.push({
      label: teamGoal?.title || `Týmové ${unitLabel}`,
      value: teamBj,
      target: teamGoal?.target ?? 0,
      color: "hsl(var(--primary))",
      unit: unitLabel,
    });
  }
  if (personalGoal || personalBj > 0) {
    gauges.push({
      label: personalGoal?.title || `Osobní ${unitLabel}`,
      value: personalBj,
      target: personalGoal?.target ?? 0,
      color: "hsl(186 100% 37%)",
      unit: unitLabel,
    });
  }
  gauges.push({
    label: meetingsGoal?.title || "Schůzky",
    value: personalMeetingCount,
    target: meetingsGoal?.target ?? 0,
    color: "hsl(30 85% 55%)",
  });

  return (
    <div className="min-h-screen bg-background">
      <GdprConsentModal />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="px-6 py-4 flex items-center gap-4 flex-wrap">
          {/* Left: title + week/month tabs */}
          <div className="flex items-center gap-4">
            <h1
              className="font-heading font-bold tracking-[0.2em] text-[#00555f] dark:text-white"
              style={{ fontSize: 22 }}
            >
              DASHBOARD
            </h1>
            <div className="inline-flex rounded-xl border bg-card p-1">
              {(["week", "month"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                    mode === m
                      ? "bg-[#00abbd] text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "week" ? "Týden" : "Měsíc"}
                </button>
              ))}
            </div>
          </div>

          {/* Center: period navigator */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[180px] text-center text-sm font-heading font-semibold text-foreground">
              {period.label}
            </span>
            <Button size="icon" variant="ghost" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Button
              disabled={!hasConsent || isImpersonating}
              onClick={() => openNewMeeting()}
              title={isImpersonating ? "Pouze náhled" : !hasConsent ? "Nejprve potvrď GDPR souhlas" : undefined}
              className="bg-[#fc7c71] hover:bg-[#e05a50] text-white"
            >
              <Plus className="mr-1 h-4 w-4" /> Schůzka
            </Button>
            <Button variant="outline" size="sm" disabled title="Brzy">
              <FileDown className="mr-1 h-4 w-4" /> Export PDF
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifikace">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="px-6 pb-3 text-xs text-muted-foreground">
          {viewedUserName ?? user?.full_name} · {currentRole?.label ?? "—"}
          {isImpersonating && <span className="ml-2 text-amber-600 font-medium">(náhled)</span>}
        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Goals + Org Chart */}
        <div className="grid gap-6 lg:grid-cols-[35%_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Cíle</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 pt-2">
              {gauges.map((g) => (
                <GaugeIndicator
                  key={g.label}
                  label={g.label}
                  value={g.value}
                  target={g.target}
                  color={g.color}
                  unit={g.unit}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Tým</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 560 }}>
                <OrgChart
                  periodStart={period.startStr}
                  periodEnd={period.endStr}
                  onImpersonate={(id, name) => void startImpersonate(id, name)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity cards by meeting type */}
        {meetingTypes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {meetingTypes.map((t) => {
              const stats = activityByType.get(t.key) ?? { scheduled: 0, completed: 0, referrals: 0 };
              return (
                <Card key={t.key} style={{ borderTop: `3px solid ${t.color}` }}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: t.color }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Domluvené
                        </div>
                        <div className="font-heading font-bold text-2xl text-foreground mt-1">
                          {stats.scheduled}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Proběhlé
                        </div>
                        <div className="font-heading font-bold text-2xl mt-1" style={{ color: t.color }}>
                          {stats.completed}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Doporučení breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-lg font-heading">Doporučení</CardTitle>
              <div className="font-heading font-bold text-3xl text-[#00555f] dark:text-white">
                {totalReferrals}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {meetingTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné typy schůzek nejsou nakonfigurovány.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {meetingTypes.map((t) => {
                  const stats = activityByType.get(t.key) ?? { scheduled: 0, completed: 0, referrals: 0 };
                  const pct = totalReferrals > 0 ? Math.round((stats.referrals / totalReferrals) * 100) : 0;
                  return (
                    <div key={t.key} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: t.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                          {t.label}
                        </div>
                        <div className="text-sm font-heading font-bold text-foreground">
                          {stats.referrals}{" "}
                          <span className="text-xs text-muted-foreground font-normal">({pct}%)</span>
                        </div>
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
