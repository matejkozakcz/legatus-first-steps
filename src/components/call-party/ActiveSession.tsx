import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar as CalIcon,
  CheckCircle2,
  Loader2,
  MapPin,
  PhoneOff,
  Repeat,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { createMeetingFromPending, type PendingMeeting } from "@/lib/callPartyMeetings";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Result = "no_answer" | "not_interested" | "callback" | "meeting";
export type FillMode = "immediate" | "deferred";

export const RESULTS: {
  key: Result;
  label: string;
  variant: "secondary" | "destructive" | "outline" | "default";
}[] = [
  { key: "no_answer", label: "Nezvedá", variant: "secondary" },
  { key: "not_interested", label: "Nemá zájem", variant: "destructive" },
  { key: "callback", label: "Zavolat zpět", variant: "outline" },
  { key: "meeting", label: "Schůzka", variant: "default" },
];

export function normalizeName(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export interface CallRow {
  id: string;
  contact_name: string;
  contact_name_normalized: string;
  result: string;
  note: string | null;
  called_at: string;
  meeting_id: string | null;
  session_id?: string;
  pending_meeting?: PendingMeeting | null;
}

export interface SessionRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  event_id?: string | null;
  user_id?: string;
}

export function Timer({ from }: { from: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = now - new Date(from).getTime();
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono text-2xl tabular-nums">
      {h > 0 ? `${pad(h)}:` : ""}
      {pad(m)}:{pad(s)}
    </span>
  );
}

export function ActiveSession({
  session,
  calls,
  setCalls,
  workspaceId,
  userId,
  onFinish,
  finishing,
  fillMode = "immediate",
}: {
  session: SessionRow;
  calls: CallRow[];
  setCalls: React.Dispatch<React.SetStateAction<CallRow[]>>;
  workspaceId: string;
  userId: string;
  onFinish: () => void;
  finishing: boolean;
  fillMode?: FillMode;
}) {
  const { meetingTypes } = useMeetingTypes();
  const [name, setName] = useState("");
  const [result, setResult] = useState<Result | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState<{ id: string; full_name: string }[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  const [duplicate, setDuplicate] = useState(false);
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mTypeKey, setMTypeKey] = useState("");
  const [mDate, setMDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mTime, setMTime] = useState(format(new Date(), "HH:mm"));
  const [mLocation, setMLocation] = useState("");

  useEffect(() => {
    const ch = supabase
      .channel(`calls-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const row = payload.new as CallRow;
          setCalls((prev) => (prev.find((c) => c.id === row.id) ? prev : [row, ...prev]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session.id, setCalls]);

  useEffect(() => {
    if (dupTimer.current) clearTimeout(dupTimer.current);
    if (!name.trim()) {
      setSuggestions([]);
      setDuplicate(false);
      return;
    }
    dupTimer.current = setTimeout(async () => {
      const norm = normalizeName(name);
      const [{ data: ppl }, { data: dups }] = await Promise.all([
        supabase
          .from("people")
          .select("id, full_name")
          .eq("workspace_id", workspaceId)
          .ilike("full_name", `%${name.trim()}%`)
          .limit(5),
        supabase
          .from("calls")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("contact_name_normalized", norm)
          .limit(1),
      ]);
      setSuggestions(ppl ?? []);
      setDuplicate((dups ?? []).length > 0);
    }, 250);
    return () => {
      if (dupTimer.current) clearTimeout(dupTimer.current);
    };
  }, [name, workspaceId]);

  const reset = () => {
    setName("");
    setResult("");
    setNote("");
    setMTypeKey("");
    setMLocation("");
    setSuggestions([]);
    setDuplicate(false);
  };

  const submit = async () => {
    if (!name.trim() || !result) {
      toast.error("Vyplň jméno a výsledek.");
      return;
    }
    if (result === "meeting" && (!mTypeKey || !mDate || !mTime)) {
      toast.error("Vyplň typ schůzky, datum a čas.");
      return;
    }
    setSubmitting(true);
    let meetingId: string | null = null;
    let pending: PendingMeeting | null = null;

    try {
      const trimmedName = name.trim();
      if (result === "meeting") {
        const scheduledAt = new Date(`${mDate}T${mTime}:00`).toISOString();
        const pm: PendingMeeting = {
          type_key: mTypeKey,
          scheduled_at: scheduledAt,
          location: mLocation.trim() || null,
          contact_name: trimmedName,
        };
        if (fillMode === "immediate") {
          meetingId = await createMeetingFromPending(workspaceId, userId, pm);
        } else {
          pending = pm;
        }
      }

      const { data: c, error: ce } = await supabase
        .from("calls")
        .insert({
          workspace_id: workspaceId,
          session_id: session.id,
          contact_name: trimmedName,
          contact_name_normalized: normalizeName(name),
          result,
          note: note.trim() || null,
          meeting_id: meetingId,
          pending_meeting: pending as never,
        })
        .select()
        .single();
      if (ce) throw ce;
      setCalls((prev) =>
        prev.find((x) => x.id === c.id) ? prev : [c as CallRow, ...prev],
      );
      toast.success(
        result === "meeting" && fillMode === "deferred"
          ? "Hovor přidán — schůzku potvrdíš na konci"
          : "Hovor přidán",
      );
      reset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "neznámá";
      toast.error("Chyba: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of calls) c[x.result] = (c[x.result] ?? 0) + 1;
    return c;
  }, [calls]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Aktivní session</CardTitle>
            <Timer from={session.started_at} />
          </div>
          <Button variant="destructive" onClick={onFinish} disabled={finishing}>
            {finishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PhoneOff className="mr-2 h-4 w-4" />
            )}
            Ukončit
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0 text-xs text-muted-foreground">
          {RESULTS.map((r) => (
            <span key={r.key}>
              {r.label}: <strong className="text-foreground">{counts[r.key] ?? 0}</strong>
            </span>
          ))}
          <span className="ml-auto">
            Celkem: <strong className="text-foreground">{calls.length}</strong>
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nový hovor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-name">Jméno a příjmení</Label>
            <div className="relative">
              <Input
                id="cp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                placeholder="Jan Novák"
                autoComplete="off"
              />
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={() => {
                        setName(s.full_name);
                        setShowSuggest(false);
                      }}
                    >
                      {s.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {duplicate && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Již voláno
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label>Výsledek</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RESULTS.map((r) => (
                <Button
                  key={r.key}
                  type="button"
                  size="lg"
                  variant={result === r.key ? "default" : "outline"}
                  onClick={() => setResult(r.key)}
                  className="w-full min-h-14 text-base"
                >
                  {r.key === "callback" && <Repeat className="mr-1 h-4 w-4" />}
                  {r.key === "meeting" && <CalIcon className="mr-1 h-4 w-4" />}
                  {r.key === "no_answer" && <PhoneOff className="mr-1 h-4 w-4" />}
                  {r.key === "not_interested" && <X className="mr-1 h-4 w-4" />}
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {result === "meeting" && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              {fillMode === "deferred" && (
                <p className="text-xs text-muted-foreground">
                  Schůzka se vytvoří až po ukončení Call Party (potvrdíš ve shrnutí).
                </p>
              )}
              <div className="space-y-2">
                <Label>Typ schůzky</Label>
                <Select value={mTypeKey} onValueChange={setMTypeKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyber typ" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingTypes.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Čas</Label>
                  <Input type="time" value={mTime} onChange={(e) => setMTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Místo (nepovinné)</Label>
                <Input
                  value={mLocation}
                  onChange={(e) => setMLocation(e.target.value)}
                  placeholder="Kavárna, online..."
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cp-note">Poznámka (nepovinná)</Label>
            <Textarea id="cp-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Přidat
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hovory v této session ({calls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím žádné hovory.</p>
          ) : (
            <ul className="divide-y">
              {calls.map((c) => {
                const r = RESULTS.find((x) => x.key === c.result);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.contact_name}</div>
                      {c.note && (
                        <div className="truncate text-xs text-muted-foreground">{c.note}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.pending_meeting && !c.meeting_id && (
                        <Badge variant="outline" className="text-[10px]">
                          čeká na potvrzení
                        </Badge>
                      )}
                      <Badge variant={r?.variant ?? "secondary"}>{r?.label ?? c.result}</Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(c.called_at), "HH:mm")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SessionSummary({
  data,
  workspaceId,
  userId,
  onReset,
}: {
  data: { session: SessionRow; calls: CallRow[] };
  workspaceId: string;
  userId: string;
  onReset: () => void;
}) {
  const { getMeetingType } = useMeetingTypes();
  const [pendingCalls, setPendingCalls] = useState<CallRow[]>(
    data.calls.filter((c) => c.pending_meeting && !c.meeting_id),
  );
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});

  const counts: Record<string, number> = {};
  for (const c of data.calls) counts[c.result] = (counts[c.result] ?? 0) + 1;
  const ms =
    new Date(data.session.finished_at ?? Date.now()).getTime() -
    new Date(data.session.started_at).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));

  const confirm = async (call: CallRow) => {
    if (!call.pending_meeting) return;
    setConfirming((s) => ({ ...s, [call.id]: true }));
    try {
      const meetingId = await createMeetingFromPending(
        workspaceId,
        userId,
        call.pending_meeting,
      );
      const { error } = await supabase
        .from("calls")
        .update({ meeting_id: meetingId, pending_meeting: null })
        .eq("id", call.id);
      if (error) throw error;
      setPendingCalls((prev) => prev.filter((c) => c.id !== call.id));
      toast.success("Schůzka vytvořena");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "neznámá";
      toast.error("Chyba: " + msg);
    } finally {
      setConfirming((s) => ({ ...s, [call.id]: false }));
    }
  };

  const skip = async (call: CallRow) => {
    setConfirming((s) => ({ ...s, [call.id]: true }));
    const { error } = await supabase
      .from("calls")
      .update({ pending_meeting: null })
      .eq("id", call.id);
    setConfirming((s) => ({ ...s, [call.id]: false }));
    if (error) {
      toast.error("Chyba: " + error.message);
      return;
    }
    setPendingCalls((prev) => prev.filter((c) => c.id !== call.id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Shrnutí Call Party</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Délka: <strong className="text-foreground">{mins} min</strong> · Celkem hovorů:{" "}
            <strong className="text-foreground">{data.calls.length}</strong>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RESULTS.map((r) => (
              <div key={r.key} className="rounded-md border p-3 text-center">
                <div className="text-2xl font-bold">{counts[r.key] ?? 0}</div>
                <div className="text-xs text-muted-foreground">{r.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pendingCalls.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">
              Potvrď schůzky ({pendingCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tyto hovory skončily domluvenou schůzkou. Potvrď je pro vytvoření v kalendáři.
            </p>
            <ul className="divide-y">
              {pendingCalls.map((c) => {
                const pm = c.pending_meeting!;
                const t = getMeetingType(pm.type_key);
                return (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium">{c.contact_name}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: t?.color }}
                          />
                          {t?.label ?? pm.type_key}
                        </span>
                        <span>·</span>
                        <span>{format(new Date(pm.scheduled_at), "d. M. yyyy HH:mm")}</span>
                        {pm.location && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {pm.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => skip(c)}
                        disabled={confirming[c.id]}
                      >
                        Zahodit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => confirm(c)}
                        disabled={confirming[c.id]}
                      >
                        {confirming[c.id] ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                        )}
                        Vytvořit
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button onClick={onReset} className="w-full">
        Zavřít
      </Button>
    </div>
  );
}
