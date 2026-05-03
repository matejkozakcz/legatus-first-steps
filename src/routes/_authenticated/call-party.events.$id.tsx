import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { ChevronLeft, Copy, Loader2, PhoneOff, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  ActiveSession,
  RESULTS,
  SessionSummary,
  type CallRow,
  type SessionRow,
} from "@/components/call-party/ActiveSession";

export const Route = createFileRoute("/_authenticated/call-party/events/$id")({
  component: EventDetailPage,
});

interface EventRow {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  organizer_id: string;
  workspace_id: string;
}

function EventDetailPage() {
  const { id } = useParams({ from: "/_authenticated/call-party/events/$id" });
  const { workspace, user, config } = useWorkspace();
  const fillMode =
    ((config?.uiConfig as { meeting_fill_mode?: "immediate" | "deferred" })?.meeting_fill_mode ===
    "deferred"
      ? "deferred"
      : "immediate") as "immediate" | "deferred";

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [mySession, setMySession] = useState<SessionRow | null>(null);
  const [myCalls, setMyCalls] = useState<CallRow[]>([]);
  const [joining, setJoining] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<{ session: SessionRow; calls: CallRow[] } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase
        .from("call_party_events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setEvent((ev as EventRow) ?? null);
      if (user) {
        const { data: s } = await supabase
          .from("call_party_sessions")
          .select("*")
          .eq("event_id", id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (s) {
          setMySession(s as SessionRow);
          const { data: cs } = await supabase
            .from("calls")
            .select("*")
            .eq("session_id", s.id)
            .order("called_at", { ascending: false });
          setMyCalls((cs ?? []) as CallRow[]);
        }
      }
      setLoading(false);
    })();
  }, [id, user]);

  const join = async () => {
    if (!workspace || !user || !event) return;
    setJoining(true);
    const { data, error } = await supabase
      .from("call_party_sessions")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        event_id: event.id,
        status: "active",
      })
      .select()
      .single();
    setJoining(false);
    if (error) {
      toast.error("Nelze se připojit: " + error.message);
      return;
    }
    setMySession(data as SessionRow);
    setMyCalls([]);
  };

  const finish = async () => {
    if (!mySession) return;
    setFinishing(true);
    const { data, error } = await supabase
      .from("call_party_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", mySession.id)
      .select()
      .single();
    setFinishing(false);
    if (error) {
      toast.error("Nelze ukončit: " + error.message);
      return;
    }
    setSummary({ session: data as SessionRow, calls: myCalls });
    setMySession(null);
    setMyCalls([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">Event nenalezen.</p>
        <Link to="/call-party" className="text-sm text-primary hover:underline">
          Zpět
        </Link>
      </div>
    );
  }

  const isOrganizer = user?.id === event.organizer_id;
  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/call-party/events/${event.id}` : "";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/call-party"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Call Party
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(event.scheduled_at), "d. M. yyyy HH:mm")} ·{" "}
          <Badge variant="secondary">{event.status}</Badge>
        </p>
      </div>

      {isOrganizer && <OrganizerPanel event={event} joinUrl={joinUrl} />}

      <LiveStats eventId={event.id} />

      {summary ? (
        <SessionSummary
          data={summary}
          workspaceId={workspace!.id}
          userId={user!.id}
          onReset={() => setSummary(null)}
        />
      ) : mySession ? (
        <ActiveSession
          session={mySession}
          calls={myCalls}
          setCalls={setMyCalls}
          workspaceId={workspace!.id}
          userId={user!.id}
          onFinish={finish}
          finishing={finishing}
          fillMode={fillMode}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Users className="h-10 w-10 text-primary" />
            <p className="text-center text-muted-foreground">
              Připoj se k eventu a začni přidávat hovory.
            </p>
            <Button size="lg" onClick={join} disabled={joining}>
              {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Připojit se
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OrganizerPanel({ event, joinUrl }: { event: EventRow; joinUrl: string }) {
  const copy = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Link zkopírován");
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pozvat členy týmu</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-lg border bg-white p-3">
          <QRCodeSVG value={joinUrl} size={160} />
        </div>
        <div className="flex-1 space-y-3">
          <p className="text-sm text-muted-foreground">
            Naskenuj QR kód nebo sdílej tento odkaz s týmem:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
              {joinUrl}
            </code>
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MemberStat {
  user_id: string;
  full_name: string;
  total: number;
  by_result: Record<string, number>;
}

function LiveStats({ eventId }: { eventId: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});

  const reload = async () => {
    const { data: ss } = await supabase
      .from("call_party_sessions")
      .select("*")
      .eq("event_id", eventId);
    const sessions = (ss ?? []) as SessionRow[];
    setSessions(sessions);
    const ids = sessions.map((s) => s.id);
    if (ids.length === 0) {
      setCalls([]);
      return;
    }
    const { data: cs } = await supabase
      .from("calls")
      .select("*")
      .in("session_id", ids)
      .order("called_at", { ascending: false });
    setCalls((cs ?? []) as CallRow[]);
    const userIds = Array.from(new Set(sessions.map((s) => s.user_id!).filter(Boolean)));
    if (userIds.length) {
      const { data: us } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);
      const map: Record<string, string> = {};
      for (const u of us ?? []) map[u.id] = u.full_name || u.email || "Uživatel";
      setUsers(map);
    }
  };

  useEffect(() => {
    void reload();
    const ch = supabase
      .channel(`event-stats-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_party_sessions", filter: `event_id=eq.${eventId}` },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const memberStats: MemberStat[] = useMemo(() => {
    const m = new Map<string, MemberStat>();
    for (const s of sessions) {
      if (!s.user_id) continue;
      if (!m.has(s.user_id)) {
        m.set(s.user_id, {
          user_id: s.user_id,
          full_name: users[s.user_id] ?? "…",
          total: 0,
          by_result: {},
        });
      }
    }
    const sessionToUser = new Map(sessions.map((s) => [s.id, s.user_id!]));
    for (const c of calls) {
      const uid = sessionToUser.get(c.session_id!);
      if (!uid) continue;
      const stat = m.get(uid);
      if (!stat) continue;
      stat.total += 1;
      stat.by_result[c.result] = (stat.by_result[c.result] ?? 0) + 1;
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [sessions, calls, users]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of calls) t[c.result] = (t[c.result] ?? 0) + 1;
    return t;
  }, [calls]);

  const repeats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; sessions: Set<string> }>();
    for (const c of calls) {
      const key = c.contact_name_normalized;
      const sid = c.session_id ?? "";
      if (!map.has(key)) {
        map.set(key, { name: c.contact_name, count: 0, sessions: new Set() });
      }
      const e = map.get(key)!;
      e.count += 1;
      e.sessions.add(sid);
    }
    return Array.from(map.values())
      .filter((e) => e.sessions.size >= 2)
      .sort((a, b) => b.count - a.count);
  }, [calls]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Souhrn (live)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-md border p-3 text-center">
              <div className="text-2xl font-bold">{calls.length}</div>
              <div className="text-xs text-muted-foreground">Celkem hovorů</div>
            </div>
            {RESULTS.map((r) => (
              <div key={r.key} className="rounded-md border p-3 text-center">
                <div className="text-2xl font-bold">{totals[r.key] ?? 0}</div>
                <div className="text-xs text-muted-foreground">{r.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Připojení členové ({memberStats.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím nikdo nepřipojen.</p>
          ) : (
            <ul className="divide-y">
              {memberStats.map((m) => {
                const active = sessions.find(
                  (s) => s.user_id === m.user_id && s.status === "active",
                );
                return (
                  <li key={m.user_id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{m.full_name}</span>
                        {active ? (
                          <Badge variant="default" className="text-[10px]">
                            online
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <PhoneOff className="mr-1 h-3 w-3" /> ukončeno
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {RESULTS.map((r) => (
                          <span key={r.key}>
                            {r.label}:{" "}
                            <strong className="text-foreground">{m.by_result[r.key] ?? 0}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{m.total}</div>
                      <div className="text-xs text-muted-foreground">hovorů</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {repeats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opakující se kontakty</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {repeats.map((r) => (
                <li
                  key={r.name}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">
                    volán {r.count}× ve {r.sessions.size} sessions
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
