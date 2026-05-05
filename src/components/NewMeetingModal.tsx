import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { useGdprConsent } from "@/components/GdprConsentModal";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FollowUpMeetingModal } from "@/components/FollowUpMeetingModal";

interface PersonOption { id: string; full_name: string }

interface NewMeetingCtx {
  open: () => void;
  close: () => void;
}
const Ctx = createContext<NewMeetingCtx | null>(null);

export function useNewMeetingModal() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNewMeetingModal must be used within NewMeetingModalProvider");
  return c;
}

export function NewMeetingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<NewMeetingCtx>(() => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      <NewMeetingModal open={isOpen} onOpenChange={setIsOpen} />
    </Ctx.Provider>
  );
}

function NewMeetingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { workspace, user } = useWorkspace();
  const { meetingTypes, getMeetingType } = useMeetingTypes();
  const { hasConsent } = useGdprConsent();

  const [typeKey, setTypeKey] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"));
  const [duration, setDuration] = useState<string>("60");
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [cancelled, setCancelled] = useState(false);
  const [resultValues, setResultValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  const [personOpen, setPersonOpen] = useState(false);
  const [personQuery, setPersonQuery] = useState("");
  const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [creatingPerson, setCreatingPerson] = useState(false);

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<{
    id: string; type_key: string; scheduled_at: string; person_id: string | null;
  } | null>(null);

  const selectedType = typeKey ? getMeetingType(typeKey) : undefined;

  // Reset form when opened
  useEffect(() => {
    if (!open) return;
    setTypeKey("");
    setDate(new Date());
    setTime(format(new Date(), "HH:mm"));
    setDuration("60");
    setLocation("");
    setNotes("");
    setCancelled(false);
    setResultValues({});
    setSelectedPerson(null);
    setPersonQuery("");
  }, [open]);

  useEffect(() => { setResultValues({}); }, [typeKey]);

  useEffect(() => {
    if (!workspace || !open) return;
    let cancel = false;
    const t = setTimeout(async () => {
      setSearching(true);
      const q = personQuery.trim();
      let query = supabase
        .from("people")
        .select("id, full_name")
        .eq("workspace_id", workspace.id)
        .order("full_name", { ascending: true })
        .limit(20);
      if (q.length > 0) query = query.ilike("full_name", `%${q}%`);
      const { data, error } = await query;
      if (cancel) return;
      if (error) console.error(error);
      else setPersonOptions((data ?? []) as PersonOption[]);
      setSearching(false);
    }, 200);
    return () => { cancel = true; clearTimeout(t); };
  }, [personQuery, workspace, open]);

  const canSubmit = useMemo(() => {
    if (!hasConsent || !workspace || !user) return false;
    if (!typeKey || !date || !time) return false;
    return true;
  }, [hasConsent, workspace, user, typeKey, date, time]);

  async function handleCreatePerson(name: string) {
    if (!workspace || !user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreatingPerson(true);
    const { data, error } = await supabase
      .from("people")
      .insert({ workspace_id: workspace.id, created_by: user.id, full_name: trimmed })
      .select("id, full_name")
      .single();
    setCreatingPerson(false);
    if (error) {
      toast.error("Nepodařilo se přidat osobu", { description: error.message });
      return;
    }
    const p = data as PersonOption;
    setSelectedPerson(p);
    setPersonOptions((prev) => [p, ...prev]);
    setPersonOpen(false);
    setPersonQuery("");
  }

  async function handleSubmit() {
    if (!canSubmit || !workspace || !user || !date) return;
    setSubmitting(true);
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    const scheduled = new Date(date);
    scheduled.setHours(hh || 0, mm || 0, 0, 0);

    const payload = {
      workspace_id: workspace.id,
      user_id: user.id,
      person_id: selectedPerson?.id ?? null,
      type_key: typeKey,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: cancelled ? null : duration ? parseInt(duration, 10) : null,
      location: cancelled ? null : location || null,
      status: cancelled ? "cancelled" : "scheduled",
      result: cancelled ? null : Object.keys(resultValues).length ? resultValues : null,
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from("meetings")
      .insert([payload as never])
      .select("id")
      .single();

    setSubmitting(false);
    if (error) {
      toast.error("Uložení selhalo", { description: error.message });
      return;
    }

    toast.success(cancelled ? "Schůzka uložena jako zrušená" : "Schůzka vytvořena");
    const created = data as { id: string };
    onOpenChange(false);
    if (!cancelled) {
      setCreatedMeeting({
        id: created.id,
        type_key: typeKey,
        scheduled_at: payload.scheduled_at,
        person_id: payload.person_id,
      });
      setFollowUpOpen(true);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="legatus-modal-glass max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 sm:rounded-[28px]"
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="font-heading text-xl tracking-wide text-[color:var(--deep-hex)]">
                Nová schůzka
              </DialogTitle>
              {cancelled && <Badge variant="destructive">ZRUŠENA</Badge>}
            </div>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-5">
            {!hasConsent && (
              <div className="rounded-xl border bg-card/60 p-3 text-sm text-muted-foreground">
                Nejprve potvrď GDPR souhlas na dashboardu.
              </div>
            )}

            <div className="space-y-2">
              <Label>Typ schůzky *</Label>
              <Select value={typeKey} onValueChange={setTypeKey}>
                <SelectTrigger><SelectValue placeholder="Vyber typ schůzky" /></SelectTrigger>
                <SelectContent>
                  {meetingTypes.length === 0 && (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      Žádné typy nejsou v workspace nakonfigurované.
                    </div>
                  )}
                  {meetingTypes.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
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
                <div className="space-y-2">
                  <Label>Délka (minuty)</Label>
                  <Input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Místo</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Adresa, online, …" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Člověk</Label>
              <Popover open={personOpen} onOpenChange={setPersonOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedPerson ? selectedPerson.full_name : "Vyber nebo přidej osobu"}
                    <Plus className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Hledej jméno…" value={personQuery} onValueChange={setPersonQuery} />
                    <CommandList>
                      {searching && (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Hledám…
                        </div>
                      )}
                      {!searching && personOptions.length === 0 && <CommandEmpty>Nenalezeno.</CommandEmpty>}
                      <CommandGroup>
                        {personOptions.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.id}
                            onSelect={() => { setSelectedPerson(p); setPersonOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedPerson?.id === p.id ? "opacity-100" : "opacity-0")} />
                            {p.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {personQuery.trim().length > 0 &&
                        !personOptions.some((p) => p.full_name.toLowerCase() === personQuery.trim().toLowerCase()) && (
                          <CommandGroup heading="Přidat nového">
                            <CommandItem
                              value={`__create__${personQuery}`}
                              onSelect={() => handleCreatePerson(personQuery)}
                              disabled={creatingPerson}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Přidat „{personQuery.trim()}"
                            </CommandItem>
                          </CommandGroup>
                        )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedPerson && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setSelectedPerson(null)}
                >
                  Zrušit výběr osoby
                </button>
              )}
            </div>

            {!cancelled && selectedType && selectedType.result_fields?.length > 0 && (
              <div className="space-y-3 rounded-xl border bg-card/40 p-4">
                <div className="text-sm font-heading font-semibold text-[color:var(--deep-hex)]">
                  Výsledek schůzky
                </div>
                {selectedType.result_fields.map((field) => {
                  if (field.type === "number") {
                    return (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}{field.unit ? ` (${field.unit})` : ""}</Label>
                        <Input
                          type="number"
                          value={(resultValues[field.key] as string | undefined) ?? ""}
                          onChange={(e) =>
                            setResultValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value === "" ? null : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    );
                  }
                  if (field.type === "boolean") {
                    return (
                      <div key={field.key} className="flex items-center justify-between rounded-md border p-3">
                        <Label>{field.label}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {resultValues[field.key] ? "Ano" : "Ne"}
                          </span>
                          <Switch
                            checked={!!resultValues[field.key]}
                            onCheckedChange={(v) =>
                              setResultValues((prev) => ({ ...prev, [field.key]: v }))
                            }
                          />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      <Input
                        value={(resultValues[field.key] as string | undefined) ?? ""}
                        onChange={(e) =>
                          setResultValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <Label>Poznámka</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Volitelná poznámka…" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button
                type="button"
                variant={cancelled ? "secondary" : "outline"}
                onClick={() => setCancelled((v) => !v)}
              >
                {cancelled ? "Obnovit schůzku" : "Schůzka zrušena"}
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Zrušit</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="bg-[#fc7c71] hover:bg-[#e05a50] text-white"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Uložit schůzku
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FollowUpMeetingModal
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        parent={createdMeeting}
        onDone={() => setFollowUpOpen(false)}
      />
    </>
  );
}
