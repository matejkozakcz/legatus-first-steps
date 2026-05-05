import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addWeeks, addMonths } from "date-fns";
import {
  getProductionPeriod,
  getWeekPeriod,
  type PeriodRange,
  type ProductionPeriodConfig,
} from "@/lib/productionPeriod";

export type PeriodMode = "week" | "month";
export type { PeriodRange } from "@/lib/productionPeriod";

/**
 * Compute the active period range. The "month" mode uses the workspace
 * production period config (workspace_config.ui_config.production_period).
 */
export function getPeriodRange(
  mode: PeriodMode,
  anchor: Date,
  productionConfig?: ProductionPeriodConfig | null,
): PeriodRange {
  if (mode === "week") return getWeekPeriod(anchor);
  return getProductionPeriod(anchor, productionConfig);
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
