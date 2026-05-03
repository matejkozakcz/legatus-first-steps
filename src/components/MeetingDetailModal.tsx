import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  User as UserIcon,
  X,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowUpMeetingModal } from "@/components/FollowUpMeetingModal";

interface MeetingFull {
  id: string;
  workspace_id: string;
  user_id: string;
  type_key: string;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  status: "scheduled" | "done" | "cancelled";
  result: Record<string, unknown> | null;
  notes: string | null;
  person_id: string | null;
  parent_meeting_id: string | null;
  person?: { id: string; full_name: string } | null;
  parent?: { id: string; type_key: string; scheduled_at: string } | null;
}
interface ChildMeeting {
  id: string;
  type_key: string;
  scheduled_at: string;
  status: MeetingFull["status"];
  location: string | null;
  person?: { full_name: string } | null;
}

const STATUS_LABEL: Record<MeetingFull["status"], string> = {
  scheduled: "Naplánováno",
  done: "Hotovo",
  cancelled: "Zrušeno",
};
const STATUS_VARIANT: Record<MeetingFull["status"], "default" | "secondary" | "destructive"> = {
  scheduled: "default",
  done: "secondary",
  cancelled: "destructive",
};

interface Ctx {
  open: (id: string) => void;
  close: () => void;
}
const MeetingDetailCtx = createContext<Ctx | null>(null);

export function useMeetingDetailModal() {
  const c = useContext(MeetingDetailCtx);
  if (!c) throw new Error("useMeetingDetailModal must be used within MeetingDetailModalProvider");
  return c;
}

export function MeetingDetailModalProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const value = useMemo<Ctx>(
    () => ({ open: (id) => setOpenId(id), close: () => setOpenId(null) }),
    [],
  );
  return (
    <MeetingDetailCtx.Provider value={value}>
      {children}
      <MeetingDetailModal id={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </MeetingDetailCtx.Provider>
  );
}

function MeetingDetailModal({
  id,
  onOpenChange,
}: {
  id: string | null;
  onOpenChange: (v: boolean) => void;
}) {
  const open = !!id;
  const { user } = useWorkspace();
  const { getMeetingType } = useMeetingTypes();

  const [meeting, setMeeting] = useState<MeetingFull | null>(null);
  const [children, setChildren] = useState<ChildMeeting[]>([]);
  const [source, setSource] = useState<{ session_id: string; event_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!open || !id) {
      setMeeting(null);
      setChildren([]);
      setSource(null);
      setEditing(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("meetings")
        .select(
          "id, workspace_id, user_id, type_key, scheduled_at, duration_minutes, location, status, result, notes, person_id, parent_meeting_id, person:people(id, full_name), parent:meetings!meetings_parent_meeting_id_fkey(id, type_key, scheduled_at)",
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (err) { setError(err.message); setLoading(false); return; }
      if (!data) { setError("Schůzka nenalezena"); setLoading(false); return; }
      setMeeting(data as unknown as MeetingFull);

      const { data: kids } = await supabase
        .from("meetings")
        .select("id, type_key, scheduled_at, status, location, person:people(full_name)")
        .eq("parent_meeting_id", id)
        .order("scheduled_at", { ascending: true });
      if (cancelled) return;
      setChildren((kids ?? []) as unknown as ChildMeeting[]);

      const { data: srcCall } = await supabase
        .from("calls")
        .select("session_id, call_party_sessions:session_id(event_id)")
        .eq("meeting_id", id)
        .maybeSingle();
      if (!cancelled && srcCall?.session_id) {
        const eventId =
          (srcCall as { call_party_sessions?: { event_id: string | null } | null })
            .call_party_sessions?.event_id ?? null;
        setSource({ session_id: srcCall.session_id, event_id: eventId });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, open, reloadTick]);

  const reload = () => setReloadTick((n) => n + 1);
  const type = meeting ? getMeetingType(meeting.type_key) : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="legatus-modal-glass max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 sm:rounded-[28px]">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/30 dark:border-white/10">
            <div className="flex items-center justify-between gap-3 pr-8">
              <DialogTitle className="font-heading text-xl tracking-wide text-[#00555f] dark:text-white">
                Detail schůzky
              </DialogTitle>
              {meeting && !editing && meeting.user_id === user?.id && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-4 w-4" /> Upravit
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {loading && <Skeleton className="h-48 w-full" />}
            {error && <div className="text-sm text-destructive">{error}</div>}

            {meeting && !editing && (
              <div
                className="rounded-2xl border-l-4 border bg-card/40 p-5 space-y-4"
                style={{ borderLeftColor: type?.color ?? "transparent" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: type?.color }} />
                  <span className="font-heading font-semibold text-base">{type?.label ?? meeting.type_key}</span>
                  <Badge variant={STATUS_VARIANT[meeting.status]}>{STATUS_LABEL[meeting.status]}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Field icon={<UserIcon className="h-3 w-3" />} label="Osoba" value={meeting.person?.full_name ?? "—"} />
                  <Field
                    icon={<CalendarIcon className="h-3 w-3" />}
                    label="Datum a čas"
                    value={format(new Date(meeting.scheduled_at), "dd.MM.yyyy HH:mm")}
                  />
                  <Field label="Délka" value={meeting.duration_minutes ? `${meeting.duration_minutes} min` : "—"} />
                  <Field icon={<MapPin className="h-3 w-3" />} label="Místo" value={meeting.location ?? "—"} />
                </div>

                {type?.result_fields?.length ? (
                  <div className="space-y-2 border-t border-white/30 dark:border-white/10 pt-3">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Výsledek</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {type.result_fields.map((f) => {
                        const v = (meeting.result ?? {})[f.key];
                        let display: string;
                        if (v == null || v === "") display = "—";
                        else if (f.type === "boolean") display = v ? "Ano" : "Ne";
                        else if (f.type === "number") display = `${v}${f.unit ? ` ${f.unit}` : ""}`;
                        else display = String(v);
                        return <Field key={f.key} label={f.label} value={display} />;
                      })}
                    </div>
                  </div>
                ) : null}

                {meeting.notes && (
                  <div className="space-y-1 border-t border-white/30 dark:border-white/10 pt-3">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Poznámka</div>
                    <p className="whitespace-pre-wrap text-sm">{meeting.notes}</p>
                  </div>
                )}
              </div>
            )}

            {meeting && editing && (
              <EditMeetingForm
                meeting={meeting}
                onCancel={() => setEditing(false)}
                onSaved={() => { setEditing(false); reload(); }}
              />
            )}

            {source && (
              <div className="rounded-xl border bg-card/40 p-4 text-sm">
                Schůzka vznikla z{" "}
                {source.event_id ? (
                  <Link to="/call-party/events/$id" params={{ id: source.event_id }} className="text-primary hover:underline" onClick={() => onOpenChange(false)}>
                    skupinové Call Party
                  </Link>
                ) : (
                  <Link to="/call-party" className="text-primary hover:underline" onClick={() => onOpenChange(false)}>
                    Call Party session
                  </Link>
                )}.
              </div>
            )}

            {meeting?.parent && (
              <div className="rounded-xl border bg-card/40 p-4">
                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Předchozí schůzka</div>
                <button
                  type="button"
                  onClick={() => meeting.parent && onOpenChange(true) /* keep dialog */ }
                  className="w-full"
                >
                  <ParentLink
                    parent={meeting.parent}
                    color={getMeetingType(meeting.parent.type_key)?.color}
                    label={getMeetingType(meeting.parent.type_key)?.label}
                    onOpen={(pid) => { /* swap to parent */
                      // use timeout to ensure state update sequence
                      setTimeout(() => {
                        onOpenChange(false);
                        setTimeout(() => {
                          // re-open with parent id
                          // we need access to context — use a custom event
                          window.dispatchEvent(new CustomEvent("open-meeting-detail", { detail: pid }));
                        }, 50);
                      }, 0);
                    }}
                  />
                </button>
              </div>
            )}

            {meeting && (
              <div className="rounded-xl border bg-card/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Návazné schůzky</div>
                  <Button size="sm" variant="outline" onClick={() => setFollowUpOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Follow-up
                  </Button>
                </div>
                {children.length === 0 && (
                  <p className="text-sm text-muted-foreground">Žádné návazné schůzky.</p>
                )}
                <div className="space-y-2">
                  {children.map((c) => {
                    const ct = getMeetingType(c.type_key);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("open-meeting-detail", { detail: c.id }));
                        }}
                        className="flex w-full items-center justify-between rounded-md border p-3 text-sm hover:bg-accent/40 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ct?.color }} />
                          <span className="font-medium">{ct?.label ?? c.type_key}</span>
                          <span className="text-muted-foreground">
                            · {format(new Date(c.scheduled_at), "dd.MM.yyyy HH:mm")}
                          </span>
                          {c.location && <span className="text-muted-foreground">· {c.location}</span>}
                        </span>
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FollowUpMeetingModal
        open={followUpOpen}
        onOpenChange={(o) => { setFollowUpOpen(o); if (!o) reload(); }}
        parent={
          meeting
            ? {
                id: meeting.id,
                type_key: meeting.type_key,
                scheduled_at: meeting.scheduled_at,
                person_id: meeting.person_id,
              }
            : null
        }
        onDone={() => { setFollowUpOpen(false); reload(); }}
      />
    </>
  );
}

function ParentLink({
  parent,
  color,
  label,
  onOpen,
}: {
  parent: { id: string; type_key: string; scheduled_at: string };
  color?: string;
  label?: string;
  onOpen: (id: string) => void;
}) {
  return (
    <span
      onClick={() => onOpen(parent.id)}
      className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent/40 cursor-pointer"
    >
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label ?? parent.type_key}
        <span className="text-muted-foreground">
          · {format(new Date(parent.scheduled_at), "dd.MM.yyyy HH:mm")}
        </span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-xs uppercase text-muted-foreground">{icon}{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function EditMeetingForm({
  meeting,
  onCancel,
  onSaved,
}: {
  meeting: MeetingFull;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { getMeetingType } = useMeetingTypes();
  const type = getMeetingType(meeting.type_key);
  const initialDate = useMemo(() => new Date(meeting.scheduled_at), [meeting]);

  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState(format(initialDate, "HH:mm"));
  const [duration, setDuration] = useState(meeting.duration_minutes != null ? String(meeting.duration_minutes) : "");
  const [location, setLocation] = useState(meeting.location ?? "");
  const [notes, setNotes] = useState(meeting.notes ?? "");
  const [status, setStatus] = useState<MeetingFull["status"]>(meeting.status);
  const [resultValues, setResultValues] = useState<Record<string, unknown>>(meeting.result ?? {});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!date || !time) { toast.error("Vyplň datum a čas"); return; }
    setSaving(true);
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    const scheduled = new Date(date);
    scheduled.setHours(hh || 0, mm || 0, 0, 0);
    const cancelled = status === "cancelled";
    const payload = {
      scheduled_at: scheduled.toISOString(),
      duration_minutes: cancelled ? null : duration ? parseInt(duration, 10) : null,
      location: cancelled ? null : location || null,
      status,
      result: cancelled || Object.keys(resultValues).length === 0 ? null : resultValues,
      notes: notes || null,
    };
    const { error } = await supabase.from("meetings").update(payload as never).eq("id", meeting.id);
    setSaving(false);
    if (error) { toast.error("Uložení selhalo", { description: error.message }); return; }
    toast.success("Schůzka aktualizována");
    onSaved();
  }

  const cancelled = status === "cancelled";

  return (
    <div className="rounded-2xl border-l-4 border bg-card/40 p-5 space-y-4" style={{ borderLeftColor: type?.color ?? "transparent" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-heading font-semibold">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: type?.color }} />
          Upravit: {type?.label ?? meeting.type_key}
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Datum *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "dd.MM.yyyy") : "Vyber datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Čas *</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      {!cancelled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Délka (min)</Label><Input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          <div className="space-y-2"><Label>Místo</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        </div>
      )}

      {!cancelled && type?.result_fields?.length ? (
        <div className="space-y-3 border-t border-white/30 dark:border-white/10 pt-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">Výsledek</div>
          {type.result_fields.map((field) => {
            if (field.type === "number") {
              return (
                <div key={field.key} className="space-y-1">
                  <Label>{field.label}{field.unit ? ` (${field.unit})` : ""}</Label>
                  <Input
                    type="number"
                    value={(resultValues[field.key] as string | number | undefined) ?? ""}
                    onChange={(e) => setResultValues((p) => ({ ...p, [field.key]: e.target.value === "" ? null : Number(e.target.value) }))}
                  />
                </div>
              );
            }
            if (field.type === "boolean") {
              return (
                <div key={field.key} className="flex items-center justify-between rounded-md border p-3">
                  <Label>{field.label}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{resultValues[field.key] ? "Ano" : "Ne"}</span>
                    <Switch checked={!!resultValues[field.key]} onCheckedChange={(v) => setResultValues((p) => ({ ...p, [field.key]: v }))} />
                  </div>
                </div>
              );
            }
            return (
              <div key={field.key} className="space-y-1">
                <Label>{field.label}</Label>
                <Input value={(resultValues[field.key] as string | undefined) ?? ""} onChange={(e) => setResultValues((p) => ({ ...p, [field.key]: e.target.value }))} />
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Poznámka</Label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/30 dark:border-white/10 pt-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={status === "scheduled" ? "default" : "outline"} size="sm" onClick={() => setStatus("scheduled")}>Naplánováno</Button>
          <Button type="button" variant={status === "done" ? "default" : "outline"} size="sm" onClick={() => setStatus("done")}>Hotovo</Button>
          <Button type="button" variant={status === "cancelled" ? "destructive" : "outline"} size="sm" onClick={() => setStatus("cancelled")}>Zrušit</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Zpět</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit změny
          </Button>
        </div>
      </div>
    </div>
  );
}
