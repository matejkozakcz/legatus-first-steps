import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2, Phone, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ActiveSession,
  SessionSummary,
  type CallRow,
  type FillMode,
  type SessionRow,
} from "@/components/call-party/ActiveSession";

function useFillMode(): FillMode {
  const { config } = useWorkspace();
  const ui = (config?.uiConfig ?? {}) as { meeting_fill_mode?: FillMode };
  return ui.meeting_fill_mode === "deferred" ? "deferred" : "immediate";
}

export const Route = createFileRoute("/_authenticated/call-party")({
  component: CallPartyPage,
});

function CallPartyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Call Party</h1>
      <Tabs defaultValue="solo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="solo">
            <Phone className="mr-2 h-4 w-4" /> Solo
          </TabsTrigger>
          <TabsTrigger value="group">
            <Users className="mr-2 h-4 w-4" /> Skupinová CP
          </TabsTrigger>
        </TabsList>
        <TabsContent value="solo">
          <SoloTab />
        </TabsContent>
        <TabsContent value="group">
          <GroupTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SoloTab() {
  const { workspace, user } = useWorkspace();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<{ session: SessionRow; calls: CallRow[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("call_party_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .is("event_id", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setSession(data as SessionRow);
        const { data: cs } = await supabase
          .from("calls")
          .select("*")
          .eq("session_id", data.id)
          .order("called_at", { ascending: false });
        setCalls((cs ?? []) as CallRow[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const startSession = async () => {
    if (!workspace || !user) return;
    setStarting(true);
    const { data, error } = await supabase
      .from("call_party_sessions")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        status: "active",
        event_id: null,
      })
      .select()
      .single();
    setStarting(false);
    if (error) {
      toast.error("Nelze zahájit Call Party: " + error.message);
      return;
    }
    setSession(data as SessionRow);
    setCalls([]);
    setSummary(null);
  };

  const finishSession = async () => {
    if (!session) return;
    setFinishing(true);
    const { data, error } = await supabase
      .from("call_party_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", session.id)
      .select()
      .single();
    setFinishing(false);
    if (error) {
      toast.error("Nelze ukončit: " + error.message);
      return;
    }
    setSummary({ session: data as SessionRow, calls });
    setSession(null);
    setCalls([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summary) return <SessionSummary data={summary} onReset={() => setSummary(null)} />;

  if (!session) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Phone className="h-12 w-12 text-primary" />
          <p className="text-center text-muted-foreground">
            Spusť solo Call Party a začni přidávat hovory.
          </p>
          <Button size="lg" onClick={startSession} disabled={starting}>
            {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zahájit Call Party
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ActiveSession
      session={session}
      calls={calls}
      setCalls={setCalls}
      workspaceId={workspace!.id}
      userId={user!.id}
      onFinish={finishSession}
      finishing={finishing}
    />
  );
}

interface EventRow {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  organizer_id: string;
}

function GroupTab() {
  const { workspace, user } = useWorkspace();
  const { currentLevel } = useRoles();
  const navigate = useNavigate();

  const isLeader = currentLevel != null && currentLevel <= 2;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from("call_party_events")
      .select("*")
      .eq("workspace_id", workspace.id)
      .in("status", ["planned", "active"])
      .order("scheduled_at", { ascending: true });
    setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    if (!workspace) return;
    const ch = supabase
      .channel(`cp-events-${workspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_party_events",
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const create = async () => {
    if (!workspace || !user) return;
    if (!title.trim() || !date || !time) {
      toast.error("Vyplň název, datum a čas.");
      return;
    }
    setCreating(true);
    const scheduled = new Date(`${date}T${time}:00`).toISOString();
    const { data, error } = await supabase
      .from("call_party_events")
      .insert({
        workspace_id: workspace.id,
        organizer_id: user.id,
        title: title.trim(),
        scheduled_at: scheduled,
        status: "active",
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error("Nelze vytvořit event: " + error.message);
      return;
    }
    setTitle("");
    navigate({ to: "/call-party/events/$id", params: { id: data.id } });
  };

  return (
    <div className="space-y-6">
      {isLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vytvořit nový event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ev-title">Název</Label>
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pondělní call session"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Čas</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <Button onClick={create} disabled={creating} className="w-full">
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Vytvořit event
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktivní eventy</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné aktivní eventy.</p>
          ) : (
            <ul className="divide-y">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(ev.scheduled_at), "d. M. yyyy HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{ev.status}</Badge>
                    <Link
                      to="/call-party/events/$id"
                      params={{ id: ev.id }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Otevřít
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
