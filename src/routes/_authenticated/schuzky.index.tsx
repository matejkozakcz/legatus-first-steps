import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Plus, MapPin, User as UserIcon, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { useRoles } from "@/hooks/useRoles";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/schuzky/")({
  component: MeetingsListPage,
});

type RangeFilter = "all" | "week" | "month";
type ScopeFilter = "mine" | "team";

interface MeetingRow {
  id: string;
  type_key: string;
  scheduled_at: string;
  location: string | null;
  status: "scheduled" | "done" | "cancelled";
  user_id: string;
  person_id: string | null;
  person?: { full_name: string } | null;
  user?: { full_name: string | null } | null;
}

function startOfWeek(d: Date): Date {
  const day = new Date(d);
  const dow = (day.getDay() + 6) % 7; // Monday=0
  day.setDate(day.getDate() - dow);
  day.setHours(0, 0, 0, 0);
  return day;
}

function startOfMonth(d: Date): Date {
  const day = new Date(d.getFullYear(), d.getMonth(), 1);
  day.setHours(0, 0, 0, 0);
  return day;
}

const STATUS_LABEL: Record<MeetingRow["status"], string> = {
  scheduled: "Naplánováno",
  done: "Hotovo",
  cancelled: "Zrušeno",
};

const STATUS_VARIANT: Record<
  MeetingRow["status"],
  "default" | "secondary" | "destructive"
> = {
  scheduled: "default",
  done: "secondary",
  cancelled: "destructive",
};

function MeetingsListPage() {
  const { workspace, user } = useWorkspace();
  const { getMeetingType } = useMeetingTypes();
  const { currentLevel } = useRoles();

  const isLeader = currentLevel != null && currentLevel <= 2;

  const [range, setRange] = useState<RangeFilter>("all");
  const [scope, setScope] = useState<ScopeFilter>("mine");
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("meetings")
        .select(
          "id, type_key, scheduled_at, location, status, user_id, person_id, person:people(full_name), user:users!meetings_user_id_fkey(full_name)",
        )
        .eq("workspace_id", workspace.id)
        .order("scheduled_at", { ascending: false })
        .limit(200);

      if (scope === "mine" || !isLeader) {
        query = query.eq("user_id", user.id);
      }

      if (range === "week") {
        query = query.gte("scheduled_at", startOfWeek(new Date()).toISOString());
      } else if (range === "month") {
        query = query.gte(
          "scheduled_at",
          startOfMonth(new Date()).toISOString(),
        );
      }

      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setMeetings([]);
      } else {
        setMeetings((data ?? []) as unknown as MeetingRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace, user, range, scope, isLeader]);

  const effectiveScope: ScopeFilter = isLeader ? scope : "mine";

  const cards = useMemo(() => {
    return meetings.map((m) => {
      const t = getMeetingType(m.type_key);
      const color = t?.color ?? "hsl(var(--muted-foreground))";
      const label = t?.label ?? m.type_key;
      const date = new Date(m.scheduled_at);
      return {
        ...m,
        color,
        label,
        date,
      };
    });
  }, [meetings, getMeetingType]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Schůzky</h1>
            <p className="text-xs text-muted-foreground">
              {workspace?.name ?? "—"}
            </p>
          </div>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/schuzky/nova">
              <Plus className="mr-1 h-4 w-4" /> Nová schůzka
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeFilter)}>
            <TabsList>
              <TabsTrigger value="all">Všechny</TabsTrigger>
              <TabsTrigger value="week">Tento týden</TabsTrigger>
              <TabsTrigger value="month">Tento měsíc</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLeader && (
            <Tabs
              value={effectiveScope}
              onValueChange={(v) => setScope(v as ScopeFilter)}
            >
              <TabsList>
                <TabsTrigger value="mine">Moje</TabsTrigger>
                <TabsTrigger value="team">Tým</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">
              Chyba: {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && cards.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Žádné schůzky pro zvolený filtr.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {cards.map((m) => (
            <Link
              key={m.id}
              to="/schuzky/$id"
              params={{ id: m.id }}
              className="block"
            >
              <Card
                className="overflow-hidden border-l-4 transition-colors hover:bg-accent/40"
                style={{ borderLeftColor: m.color }}
              >
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="font-medium">{m.label}</span>
                      {effectiveScope === "team" && m.user?.full_name && (
                        <span className="text-xs text-muted-foreground">
                          · {m.user.full_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {m.person?.full_name ?? "—"}
                      </span>
                      <span>{format(m.date, "dd.MM.yyyy HH:mm")}</span>
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {m.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[m.status]}>
                    {STATUS_LABEL[m.status]}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Button
        asChild
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden"
      >
        <Link to="/schuzky/nova">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
