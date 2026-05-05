import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  addDays,
  setDate,
  subMonths,
  addMonths,
  isBefore,
} from "date-fns";
import { cs } from "date-fns/locale";

/**
 * Production period configuration stored under
 * workspace_config.ui_config.production_period.
 *
 * Examples:
 *  { type: "calendar_month" }                                  → 1.→last day of calendar month
 *  { type: "monthly", start_day: 26, label_format: "LLLL yyyy" } → 26.→25. cycle
 */
export type ProductionPeriodConfig =
  | { type: "calendar_month"; label_format?: string }
  | { type: "monthly"; start_day: number; label_format?: string };

export interface PeriodRange {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  label: string;
}

const DEFAULT_PRODUCTION: ProductionPeriodConfig = {
  type: "calendar_month",
  label_format: "LLLL yyyy",
};

function capitalize(s: string) {
  return s.replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Compute the production period (a "month" in business sense) that contains
 * the given anchor date, based on workspace config.
 */
export function getProductionPeriod(
  anchor: Date,
  cfg: ProductionPeriodConfig | null | undefined,
): PeriodRange {
  const c = cfg ?? DEFAULT_PRODUCTION;
  const labelFormat = c.label_format || "LLLL yyyy";

  if (c.type === "calendar_month") {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    return {
      start,
      end,
      startStr: format(start, "yyyy-MM-dd"),
      endStr: format(end, "yyyy-MM-dd") + "T23:59:59",
      label: capitalize(format(anchor, labelFormat, { locale: cs })),
    };
  }

  // monthly with custom start day (e.g. 26 → 25)
  const day = Math.max(1, Math.min(28, c.start_day));
  // Period start: this month's start_day if anchor is on/after, else previous month's
  const thisMonthStart = setDate(anchor, day);
  const start = isBefore(anchor, thisMonthStart)
    ? setDate(subMonths(anchor, 1), day)
    : thisMonthStart;
  const end = addDays(setDate(addMonths(start, 1), day), -1);
  // Use period END month for label (e.g. period 26.10.→25.11. = "Listopad")
  return {
    start,
    end,
    startStr: format(start, "yyyy-MM-dd"),
    endStr: format(end, "yyyy-MM-dd") + "T23:59:59",
    label: capitalize(format(end, labelFormat, { locale: cs })),
  };
}

/**
 * Week period (Mon–Sun, ISO).
 */
export function getWeekPeriod(anchor: Date): PeriodRange {
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
