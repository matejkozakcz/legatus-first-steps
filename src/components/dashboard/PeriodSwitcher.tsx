import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cs } from "date-fns/locale";

export type PeriodMode = "week" | "month";

export interface PeriodRange {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  label: string;
}

export function getPeriodRange(mode: PeriodMode, anchor: Date): PeriodRange {
  if (mode === "week") {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    return {
      start,
      end,
      startStr: format(start, "yyyy-MM-dd"),
      endStr: format(end, "yyyy-MM-dd") + "T23:59:59",
      label: `${format(start, "d. M.", { locale: cs })} – ${format(end, "d. M. yyyy", { locale: cs })}`,
    };
  }
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  return {
    start,
    end,
    startStr: format(start, "yyyy-MM-dd"),
    endStr: format(end, "yyyy-MM-dd") + "T23:59:59",
    label: format(anchor, "LLLL yyyy", { locale: cs }).replace(/^\w/, (c) => c.toUpperCase()),
  };
}

interface PeriodSwitcherProps {
  mode: PeriodMode;
  setMode: (m: PeriodMode) => void;
  anchor: Date;
  setAnchor: (d: Date) => void;
  label: string;
}

export function PeriodSwitcher({ mode, setMode, anchor, setAnchor, label }: PeriodSwitcherProps) {
  const shift = (dir: -1 | 1) => {
    setAnchor(mode === "week" ? addWeeks(anchor, dir) : addMonths(anchor, dir));
  };

  return (
    <div className="flex items-center gap-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as PeriodMode)}>
        <TabsList>
          <TabsTrigger value="week">Týden</TabsTrigger>
          <TabsTrigger value="month">Měsíc</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => shift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[180px] text-center text-sm font-medium">{label}</span>
        <Button size="icon" variant="ghost" onClick={() => shift(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
