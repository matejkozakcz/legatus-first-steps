import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMeetingTypes } from "@/hooks/useMeetingTypes";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MeetingType } from "@/types/workspace";

type Track = "client_track" | "recruitment_track";

interface ParentMeeting {
  id: string;
  type_key: string;
  scheduled_at: string;
  person_id: string | null;
}

interface FollowUpMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: ParentMeeting | null;
  onDone?: () => void;
}

interface DraftState {
  date: Date | undefined;
  time: string;
  duration: string;
  location: string;
}

function emptyDraft(parentDate: Date): DraftState {
  return {
    date: parentDate,
    time: format(parentDate, "HH:mm"),
    duration: "60",
    location: "",
  };
}

export function FollowUpMeetingModal({
  open,
  onOpenChange,
  parent,
  onDone,
}: FollowUpMeetingModalProps) {
  const { workspace, user } = useWorkspace();
  const { getMeetingType, getFollowUpsFor } = useMeetingTypes();

  const parentDate = useMemo(
    () => (parent ? new Date(parent.scheduled_at) : new Date()),
    [parent],
  );

  const clientFollowUps = useMemo<MeetingType[]>(
    () => (parent ? getFollowUpsFor(parent.type_key, "client_track") : []),
    [parent, getFollowUpsFor],
  );
  const recruitmentFollowUps = useMemo<MeetingType[]>(
    () => (parent ? getFollowUpsFor(parent.type_key, "recruitment_track") : []),
    [parent, getFollowUpsFor],
  );

  // Map: `${track}:${type_key}` -> draft (or undefined if not opened yet)
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [skipped, setSkipped] = useState<Record<Track, boolean>>({
    client_track: false,
    recruitment_track: false,
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  function draftKey(track: Track, typeKey: string) {
    return `${track}:${typeKey}`;
  }

  function openDraft(track: Track, typeKey: string) {
    const k = draftKey(track, typeKey);
    setDrafts((prev) => ({
      ...prev,
      [k]: prev[k] ?? emptyDraft(parentDate),
    }));
  }

  function closeDraft(track: Track, typeKey: string) {
    const k = draftKey(track, typeKey);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }

  function updateDraft(track: Track, typeKey: string, patch: Partial<DraftState>) {
    const k = draftKey(track, typeKey);
    setDrafts((prev) => ({
      ...prev,
      [k]: { ...(prev[k] ?? emptyDraft(parentDate)), ...patch },
    }));
  }

  async function saveDraft(track: Track, type: MeetingType) {
    if (!workspace || !user || !parent) return;
    const k = draftKey(track, type.key);
    const d = drafts[k];
    if (!d || !d.date || !d.time) {
      toast.error("Vyplň datum a čas");
      return;
    }
    const [hh, mm] = d.time.split(":").map((n) => parseInt(n, 10));
    const scheduled = new Date(d.date);
    scheduled.setHours(hh || 0, mm || 0, 0, 0);

    if (scheduled.getTime() < parentDate.getTime()) {
      toast.error("Datum musí být po rodičovské schůzce");
      return;
    }

    setSavingKey(k);
    const payload = {
      workspace_id: workspace.id,
      user_id: user.id,
      person_id: parent.person_id,
      type_key: type.key,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: d.duration ? parseInt(d.duration, 10) : null,
      location: d.location || null,
      status: "scheduled",
      parent_meeting_id: parent.id,
    };
    const { error } = await supabase
      .from("meetings")
      .insert([payload as never]);
    setSavingKey(null);
    if (error) {
      toast.error("Uložení selhalo", { description: error.message });
      return;
    }
    toast.success(`Naplánováno: ${type.label}`);
    setSavedKeys((prev) => new Set(prev).add(k));
    closeDraft(track, type.key);
  }

  function renderSection(track: Track, options: MeetingType[], title: string) {
    const isSkipped = skipped[track];
    return (
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          {!isSkipped && options.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSkipped((prev) => ({ ...prev, [track]: true }))
              }
            >
              Přeskočit
            </Button>
          )}
          {isSkipped && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSkipped((prev) => ({ ...prev, [track]: false }))
              }
            >
              Obnovit
            </Button>
          )}
        </div>

        {options.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pro tuto stopu nejsou definovány follow-upy.
          </p>
        )}

        {!isSkipped &&
          options.map((type) => {
            const k = draftKey(track, type.key);
            const draft = drafts[k];
            const isOpen = !!draft;
            const isSaved = savedKeys.has(k);
            const isSaving = savingKey === k;

            if (isSaved) {
              return (
                <div
                  key={type.key}
                  className="flex items-center justify-between rounded-md border border-dashed p-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    {type.label}
                  </span>
                  <Badge variant="secondary">Naplánováno</Badge>
                </div>
              );
            }

            if (!isOpen) {
              return (
                <Button
                  key={type.key}
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openDraft(track, type.key)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.label}
                </Button>
              );
            }

            return (
              <div
                key={type.key}
                className="space-y-3 rounded-md border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    {type.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => closeDraft(track, type.key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Datum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !draft.date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {draft.date
                            ? format(draft.date, "dd.MM.yyyy")
                            : "Vyber datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={draft.date}
                          onSelect={(d) =>
                            updateDraft(track, type.key, { date: d })
                          }
                          disabled={(date) => {
                            const day = new Date(date);
                            day.setHours(23, 59, 59, 999);
                            return day.getTime() < parentDate.getTime();
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Čas</Label>
                    <Input
                      type="time"
                      value={draft.time}
                      onChange={(e) =>
                        updateDraft(track, type.key, { time: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Délka (min)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft.duration}
                      onChange={(e) =>
                        updateDraft(track, type.key, {
                          duration: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Místo</Label>
                    <Input
                      value={draft.location}
                      onChange={(e) =>
                        updateDraft(track, type.key, {
                          location: e.target.value,
                        })
                      }
                      placeholder="Adresa, online, …"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => saveDraft(track, type)}
                    disabled={isSaving}
                  >
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Uložit follow-up
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    );
  }

  const parentType = parent ? getMeetingType(parent.type_key) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Naplánovat follow-up</DialogTitle>
          <DialogDescription>
            {parentType
              ? `Po schůzce ${parentType.label} (${format(parentDate, "dd.MM.yyyy HH:mm")})`
              : "Po uložené schůzce"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {renderSection("client_track", clientFollowUps, "Klientská stopa")}
          {renderSection(
            "recruitment_track",
            recruitmentFollowUps,
            "Náborová stopa",
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onDone?.()}>
            Hotovo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
