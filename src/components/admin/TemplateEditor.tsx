import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export interface TemplateRole {
  key: string;
  label: string;
  level: number;
}

export interface ResultField {
  key: string;
  label: string;
  type: "number" | "boolean" | "text";
}

export interface TemplateMeetingType {
  key: string;
  label: string;
  color: string;
  track: "client" | "recruitment";
  result_fields: ResultField[];
}

export type FollowUpRules = Record<
  string,
  { client_track: string[]; recruitment_track: string[] }
>;

export interface ModuleSettings {
  meetings: { enabled: boolean };
  call_party: { enabled: boolean };
  goals: { enabled: boolean };
  calendar: { enabled: boolean };
  notifications: { enabled: boolean };
  reports: { enabled: boolean; visible_to_levels: number[] };
}

export interface ProductionUnit {
  key: string;
  label: string;
}

export interface TemplateData {
  roles: TemplateRole[];
  meetingTypes: TemplateMeetingType[];
  followUpRules: FollowUpRules;
  productionUnit: ProductionUnit;
  modules: ModuleSettings;
}

export const DEFAULT_TEMPLATE: TemplateData = {
  roles: [
    { key: "agent", label: "Agent", level: 3 },
    { key: "manager", label: "Manažer", level: 2 },
    { key: "director", label: "Ředitel", level: 1 },
  ],
  meetingTypes: [
    {
      key: "intro",
      label: "Úvodní schůzka",
      color: "#3b82f6",
      track: "client",
      result_fields: [{ key: "zajem", label: "Zájem", type: "boolean" }],
    },
    {
      key: "closing",
      label: "Uzavírací schůzka",
      color: "#10b981",
      track: "client",
      result_fields: [{ key: "smlouvy", label: "Počet smluv", type: "number" }],
    },
  ],
  followUpRules: {},
  productionUnit: { key: "BJ", label: "Bod jistoty" },
  modules: {
    meetings: { enabled: true },
    call_party: { enabled: true },
    goals: { enabled: true },
    calendar: { enabled: true },
    notifications: { enabled: true },
    reports: { enabled: true, visible_to_levels: [1, 2] },
  },
};

const MODULE_LABELS: Array<{ key: keyof Omit<ModuleSettings, "reports">; label: string }> = [
  { key: "meetings", label: "Schůzky" },
  { key: "call_party", label: "Call Party" },
  { key: "goals", label: "Cíle" },
  { key: "calendar", label: "Kalendář" },
  { key: "notifications", label: "Notifikace" },
];

export function normalizeTemplate(raw: {
  default_roles?: unknown;
  default_meeting_types?: unknown;
  default_follow_up_rules?: unknown;
  default_modules?: unknown;
  default_production_unit?: unknown;
}): TemplateData {
  const roles = Array.isArray(raw.default_roles) ? (raw.default_roles as TemplateRole[]) : DEFAULT_TEMPLATE.roles;
  const meetingTypes = Array.isArray(raw.default_meeting_types)
    ? (raw.default_meeting_types as TemplateMeetingType[]).map((m) => ({
        key: m.key ?? "",
        label: m.label ?? "",
        color: m.color ?? "#3b82f6",
        track: (m.track as "client" | "recruitment") ?? "client",
        result_fields: Array.isArray(m.result_fields) ? m.result_fields : [],
      }))
    : DEFAULT_TEMPLATE.meetingTypes;
  const followUpRules = (raw.default_follow_up_rules && typeof raw.default_follow_up_rules === "object"
    ? (raw.default_follow_up_rules as FollowUpRules)
    : {}) as FollowUpRules;
  const modulesRaw = (raw.default_modules ?? {}) as Partial<ModuleSettings> & Record<string, { enabled?: boolean; visible_to_levels?: number[] }>;
  const modules: ModuleSettings = {
    meetings: { enabled: !!modulesRaw.meetings?.enabled },
    call_party: { enabled: !!modulesRaw.call_party?.enabled },
    goals: { enabled: !!modulesRaw.goals?.enabled },
    calendar: { enabled: !!modulesRaw.calendar?.enabled },
    notifications: { enabled: !!modulesRaw.notifications?.enabled },
    reports: {
      enabled: !!modulesRaw.reports?.enabled,
      visible_to_levels: Array.isArray(modulesRaw.reports?.visible_to_levels)
        ? (modulesRaw.reports!.visible_to_levels as number[])
        : [],
    },
  };
  const pu = (raw.default_production_unit ?? {}) as Partial<ProductionUnit>;
  return {
    roles,
    meetingTypes,
    followUpRules,
    productionUnit: { key: pu.key ?? "BJ", label: pu.label ?? "Bod jistoty" },
    modules,
  };
}

export function templateToDb(data: TemplateData) {
  return {
    default_roles: data.roles,
    default_meeting_types: data.meetingTypes,
    default_follow_up_rules: data.followUpRules,
    default_modules: data.modules,
    default_production_unit: data.productionUnit,
    default_metrics: [],
  };
}

interface Props {
  value: TemplateData;
  onChange: (v: TemplateData) => void;
}

export function TemplateEditor({ value, onChange }: Props) {
  const update = (patch: Partial<TemplateData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-8">
      <RolesSection
        roles={value.roles}
        onChange={(roles) => update({ roles })}
      />
      <MeetingTypesSection
        meetingTypes={value.meetingTypes}
        onChange={(meetingTypes) => update({ meetingTypes })}
      />
      <FollowUpSection
        meetingTypes={value.meetingTypes}
        rules={value.followUpRules}
        onChange={(followUpRules) => update({ followUpRules })}
      />
      <ProductionUnitSection
        unit={value.productionUnit}
        onChange={(productionUnit) => update({ productionUnit })}
      />
      <ModulesSection
        modules={value.modules}
        roles={value.roles}
        onChange={(modules) => update({ modules })}
      />
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function RolesSection({ roles, onChange }: { roles: TemplateRole[]; onChange: (r: TemplateRole[]) => void }) {
  const add = () =>
    onChange([...roles, { key: `role_${roles.length + 1}`, label: "Nová role", level: roles.length + 1 }]);
  const update = (i: number, patch: Partial<TemplateRole>) =>
    onChange(roles.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(roles.filter((_, idx) => idx !== i));

  return (
    <Section
      title="Role"
      action={
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1 h-3 w-3" /> Přidat roli
        </Button>
      }
    >
      <div className="space-y-2">
        {roles.map((r, i) => (
          <Card key={i}>
            <CardContent className="flex items-end gap-3 p-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Název role</Label>
                <Input
                  value={r.label}
                  onChange={(e) => update(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Level</Label>
                <Input
                  type="number"
                  min={1}
                  value={r.level}
                  onChange={(e) => update(i, { level: parseInt(e.target.value) || 1 })}
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function MeetingTypesSection({
  meetingTypes,
  onChange,
}: {
  meetingTypes: TemplateMeetingType[];
  onChange: (m: TemplateMeetingType[]) => void;
}) {
  const add = () =>
    onChange([
      ...meetingTypes,
      {
        key: `meeting_${meetingTypes.length + 1}`,
        label: "Nový typ",
        color: "#3b82f6",
        track: "client",
        result_fields: [],
      },
    ]);
  const update = (i: number, patch: Partial<TemplateMeetingType>) =>
    onChange(meetingTypes.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => onChange(meetingTypes.filter((_, idx) => idx !== i));

  const updateField = (mIdx: number, fIdx: number, patch: Partial<ResultField>) => {
    const m = meetingTypes[mIdx];
    update(mIdx, {
      result_fields: m.result_fields.map((f, idx) => (idx === fIdx ? { ...f, ...patch } : f)),
    });
  };
  const addField = (mIdx: number) => {
    const m = meetingTypes[mIdx];
    update(mIdx, {
      result_fields: [
        ...m.result_fields,
        { key: `field_${m.result_fields.length + 1}`, label: "Nové pole", type: "number" },
      ],
    });
  };
  const removeField = (mIdx: number, fIdx: number) => {
    const m = meetingTypes[mIdx];
    update(mIdx, { result_fields: m.result_fields.filter((_, idx) => idx !== fIdx) });
  };

  return (
    <Section
      title="Typy schůzek"
      action={
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1 h-3 w-3" /> Přidat typ schůzky
        </Button>
      }
    >
      <div className="space-y-3">
        {meetingTypes.map((m, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-4">
              <div className="grid grid-cols-12 items-end gap-3">
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">Název</Label>
                  <Input value={m.label} onChange={(e) => update(i, { label: e.target.value })} />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Klíč</Label>
                  <Input value={m.key} onChange={(e) => update(i, { key: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Barva</Label>
                  <Input
                    type="color"
                    value={m.color}
                    onChange={(e) => update(i, { color: e.target.value })}
                    className="h-9 p-1"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Track</Label>
                  <Select
                    value={m.track}
                    onValueChange={(v) => update(i, { track: v as "client" | "recruitment" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Klient</SelectItem>
                      <SelectItem value="recruitment">Nábor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-md border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Výsledková pole
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => addField(i)}>
                    <Plus className="mr-1 h-3 w-3" /> Přidat pole
                  </Button>
                </div>
                <div className="space-y-2">
                  {m.result_fields.length === 0 && (
                    <p className="text-xs text-muted-foreground">Žádná pole.</p>
                  )}
                  {m.result_fields.map((f, fi) => (
                    <div key={fi} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Název</Label>
                        <Input
                          value={f.label}
                          onChange={(e) =>
                            updateField(i, fi, {
                              label: e.target.value,
                              key: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                            })
                          }
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs">Typ</Label>
                        <Select
                          value={f.type}
                          onValueChange={(v) => updateField(i, fi, { type: v as ResultField["type"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Číslo</SelectItem>
                            <SelectItem value="boolean">Ano/Ne</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeField(i, fi)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function FollowUpSection({
  meetingTypes,
  rules,
  onChange,
}: {
  meetingTypes: TemplateMeetingType[];
  rules: FollowUpRules;
  onChange: (r: FollowUpRules) => void;
}) {
  const toggle = (sourceKey: string, track: "client_track" | "recruitment_track", targetKey: string) => {
    const current = rules[sourceKey] ?? { client_track: [], recruitment_track: [] };
    const list = current[track] ?? [];
    const next = list.includes(targetKey) ? list.filter((k) => k !== targetKey) : [...list, targetKey];
    onChange({
      ...rules,
      [sourceKey]: { ...current, [track]: next },
    });
  };

  const [previewKey, setPreviewKey] = useState<string | null>(meetingTypes[0]?.key ?? null);

  return (
    <Section title="Follow-up pravidla">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Co to je?</p>
        <p>
          Po dokončení schůzky systém uživateli nabídne <strong>další navazující schůzku</strong>.
          Tady určíš, které typy schůzek se nabídnou — zvlášť pro klientskou a náborovou větev.
        </p>
        <ul className="mt-2 space-y-1">
          <li>
            <strong className="text-foreground">Klientská stopa</strong> = práce s klientem
            (prodej, servis). Po schůzce se nabídnou tyto typy, pokud agent označí kontakt jako
            klienta.
          </li>
          <li>
            <strong className="text-foreground">Náborová stopa</strong> = práce s potenciálním
            členem týmu. Nabídne se, když agent označí kontakt jako rekruta.
          </li>
        </ul>
        <p className="mt-2">
          Když necháš obě stopy prázdné, žádný follow-up se po této schůzce nenabídne.
        </p>
      </div>

      {meetingTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nejprve přidej typy schůzek.</p>
      ) : (
        <>
          <div className="space-y-3">
            {meetingTypes.map((m) => {
              const current = rules[m.key] ?? { client_track: [], recruitment_track: [] };
              return (
                <Card key={m.key}>
                  <CardContent className="space-y-3 p-4">
                    <div className="font-medium">{m.label}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                          Klientská stopa
                        </p>
                        <p className="mb-2 text-xs text-muted-foreground/80">
                          Co nabídnout po schůzce s klientem
                        </p>
                        <div className="space-y-1">
                          {meetingTypes.map((t) => (
                            <label key={t.key} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={(current.client_track ?? []).includes(t.key)}
                                onCheckedChange={() => toggle(m.key, "client_track", t.key)}
                              />
                              {t.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                          Náborová stopa
                        </p>
                        <p className="mb-2 text-xs text-muted-foreground/80">
                          Co nabídnout po schůzce s rekrutem
                        </p>
                        <div className="space-y-1">
                          {meetingTypes.map((t) => (
                            <label key={t.key} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={(current.recruitment_track ?? []).includes(t.key)}
                                onCheckedChange={() => toggle(m.key, "recruitment_track", t.key)}
                              />
                              {t.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <FlowPreview
            meetingTypes={meetingTypes}
            rules={rules}
            selectedKey={previewKey}
            onSelect={setPreviewKey}
          />
        </>
      )}
    </Section>
  );
}

function FlowPreview({
  meetingTypes,
  rules,
  selectedKey,
  onSelect,
}: {
  meetingTypes: TemplateMeetingType[];
  rules: FollowUpRules;
  selectedKey: string | null;
  onSelect: (k: string) => void;
}) {
  const selected = meetingTypes.find((m) => m.key === selectedKey) ?? meetingTypes[0];
  if (!selected) return null;
  const current = rules[selected.key] ?? { client_track: [], recruitment_track: [] };
  const labelOf = (k: string) => meetingTypes.find((m) => m.key === k)?.label ?? k;

  const Track = ({ title, items }: { title: string; items: string[] }) => (
    <div className="flex-1">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Žádný follow-up — proces tady končí.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {items.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: meetingTypes.find((m) => m.key === k)?.color ?? "#888" }}
              />
              {labelOf(k)}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Náhled — jak to funguje
            </p>
            <p className="text-xs text-muted-foreground">
              Co se uživateli nabídne po dokončení vybrané schůzky.
            </p>
          </div>
          <Select value={selected.key} onValueChange={onSelect}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meetingTypes.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 rounded-md border bg-background p-3">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: selected.color }}
            />
            {selected.label}
          </span>
          <span className="text-muted-foreground">→</span>
          <div className="flex flex-1 gap-6">
            <Track title="Klient" items={current.client_track ?? []} />
            <Track title="Rekrut" items={current.recruitment_track ?? []} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function ProductionUnitSection({
  unit,
  onChange,
}: {
  unit: ProductionUnit;
  onChange: (u: ProductionUnit) => void;
}) {
  return (
    <Section title="Produkční jednotka">
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          <div className="space-y-1">
            <Label className="text-xs">Klíč</Label>
            <Input
              value={unit.key}
              onChange={(e) => onChange({ ...unit, key: e.target.value })}
              placeholder="BJ"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Název</Label>
            <Input
              value={unit.label}
              onChange={(e) => onChange({ ...unit, label: e.target.value })}
              placeholder="Bod jistoty"
            />
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

function ModulesSection({
  modules,
  roles,
  onChange,
}: {
  modules: ModuleSettings;
  roles: TemplateRole[];
  onChange: (m: ModuleSettings) => void;
}) {
  const setEnabled = (key: keyof ModuleSettings, enabled: boolean) => {
    if (key === "reports") {
      onChange({ ...modules, reports: { ...modules.reports, enabled } });
    } else {
      onChange({ ...modules, [key]: { enabled } });
    }
  };

  const toggleLevel = (level: number) => {
    const current = modules.reports.visible_to_levels;
    const next = current.includes(level) ? current.filter((l) => l !== level) : [...current, level];
    onChange({ ...modules, reports: { ...modules.reports, visible_to_levels: next } });
  };

  return (
    <Section title="Moduly">
      <Card>
        <CardContent className="space-y-3 p-4">
          {MODULE_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch
                checked={modules[key].enabled}
                onCheckedChange={(v) => setEnabled(key, v)}
              />
            </div>
          ))}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Reporty</span>
              <Switch
                checked={modules.reports.enabled}
                onCheckedChange={(v) => setEnabled("reports", v)}
              />
            </div>
            {modules.reports.enabled && (
              <div className="pl-2">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Viditelné pro levely
                </p>
                <div className="flex flex-wrap gap-3">
                  {roles.map((r) => (
                    <label key={r.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={modules.reports.visible_to_levels.includes(r.level)}
                        onCheckedChange={() => toggleLevel(r.level)}
                      />
                      {r.label} ({r.level})
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}
