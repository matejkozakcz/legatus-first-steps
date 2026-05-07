import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cs } from "date-fns/locale";

export interface PeriodNavigatorProps {
  /** Top eyebrow label (e.g. "Aktuální období", "Týden") */
  label: string;
  /** Big title (e.g. "Květen 2026" or "1.–7. 4.") */
  title: string;
  onPrev: () => void;
  onNext: () => void;
  /** Date the calendar should be anchored to / highlighted */
  selectedDate?: Date;
  /** Called when user picks a date in the calendar */
  onSelectDate?: (date: Date) => void;
  /** "day" → Calendar grid; "month" → year + month grid */
  pickerMode?: "day" | "month";
  widthScale?: number;
}

const MONTH_NAMES_SHORT = [
  "Led", "Úno", "Bře", "Dub", "Kvě", "Čer",
  "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro",
];

export function PeriodNavigator({
  label,
  title,
  onPrev,
  onNext,
  selectedDate,
  onSelectDate,
  pickerMode = "day",
  widthScale = 1,
}: PeriodNavigatorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isMobile = useIsMobile();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(
    (selectedDate ?? new Date()).getFullYear(),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendarOpen && pickerMode === "month") {
      setPickerYear((selectedDate ?? new Date()).getFullYear());
    }
  }, [calendarOpen, pickerMode, selectedDate]);

  useEffect(() => {
    if (!calendarOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calendarOpen]);

  const btnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: isDark ? "rgba(255,255,255,0.1)" : "#dde8ea",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const chevronColor = isDark ? "#4dd8e8" : "#00555f";
  const selectedYear = (selectedDate ?? new Date()).getFullYear();
  const selectedMonth = (selectedDate ?? new Date()).getMonth();
  const baseWidth = isMobile ? 240 : 320;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
          borderRadius: 16,
          padding: "10px 16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e1e9eb",
          width: Math.round(baseWidth * widthScale),
          maxWidth: "100%",
          margin: "0 auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <button onClick={onPrev} style={btnStyle} aria-label="Předchozí">
          <ChevronLeft size={15} color={chevronColor} />
        </button>
        <button
          onClick={() => onSelectDate && setCalendarOpen((o) => !o)}
          disabled={!onSelectDate}
          style={{
            textAlign: "center",
            background: "none",
            border: "none",
            cursor: onSelectDate ? "pointer" : "default",
            padding: "4px 8px",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#00abbd", fontWeight: 600 }}>{label}</div>
          <div
            className="font-heading"
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--deep-hex)",
            }}
          >
            {title}
          </div>
        </button>
        <button onClick={onNext} style={btnStyle} aria-label="Další">
          <ChevronRight size={15} color={chevronColor} />
        </button>
      </div>

      {calendarOpen && onSelectDate && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            background: isDark ? "#0a1f23" : "#fff",
            borderRadius: 14,
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e1e9eb",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          {pickerMode === "month" ? (
            <div style={{ padding: 12, width: 260 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <button onClick={() => setPickerYear((y) => y - 1)} style={btnStyle} aria-label="Předchozí rok">
                  <ChevronLeft size={15} color={chevronColor} />
                </button>
                <div className="font-heading" style={{ fontWeight: 700, fontSize: 15, color: "var(--deep-hex)" }}>
                  {pickerYear}
                </div>
                <button onClick={() => setPickerYear((y) => y + 1)} style={btnStyle} aria-label="Další rok">
                  <ChevronRight size={15} color={chevronColor} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {MONTH_NAMES_SHORT.map((mName, idx) => {
                  const isSelected = pickerYear === selectedYear && idx === selectedMonth;
                  return (
                    <button
                      key={mName}
                      onClick={() => {
                        onSelectDate(new Date(pickerYear, idx, 1));
                        setCalendarOpen(false);
                      }}
                      style={{
                        padding: "10px 0",
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 13,
                        background: isSelected
                          ? "#00abbd"
                          : isDark ? "rgba(255,255,255,0.06)" : "#f1f5f6",
                        color: isSelected
                          ? "#fff"
                          : isDark ? "#e6f7f9" : "#00555f",
                      }}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onSelectDate(date);
                  setCalendarOpen(false);
                }
              }}
              locale={cs}
              weekStartsOn={1}
              className="p-3 pointer-events-auto"
            />
          )}
        </div>
      )}
    </div>
  );
}
