import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PeriodMode } from "./PeriodSwitcher";

interface PeriodNavigatorProps {
  mode: PeriodMode;
  setMode: (m: PeriodMode) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export function PeriodNavigator({ mode, setMode, label, onPrev, onNext }: PeriodNavigatorProps) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDark = theme === "dark";

  const btn = {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: isDark ? "rgba(255,255,255,0.1)" : "#dde8ea",
    border: "none" as const,
    cursor: "pointer" as const,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  const chevronColor = "var(--deep-hex)";

  return (
    <div className={isMobile ? "flex flex-col-reverse items-center gap-2 w-full" : "flex items-center gap-3"}>
      <div
        className="inline-flex rounded-xl p-1"
        style={{
          background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e1e9eb",
        }}
      >
        {(["week", "month"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
            style={
              mode === m
                ? { background: "#00abbd", color: "#fff" }
                : { color: isDark ? "rgba(255,255,255,0.6)" : "#4a6b70", background: "transparent" }
            }
          >
            {m === "week" ? "Týden" : "Měsíc"}
          </button>
        ))}
      </div>

      <div
        className="flex items-center justify-between"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
          borderRadius: 16,
          padding: "6px 10px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e1e9eb",
          minWidth: isMobile ? 220 : 280,
          gap: 8,
        }}
      >
        <button onClick={onPrev} style={btn} aria-label="Předchozí">
          <ChevronLeft size={15} color={chevronColor} />
        </button>
        <div className="text-center px-2">
          <div style={{ fontSize: 11, color: "#00abbd", fontWeight: 600 }}>
            {mode === "week" ? "Týden" : "Měsíc"}
          </div>
          <div
            className="font-heading font-bold text-foreground"
            style={{ fontSize: 14, lineHeight: 1.2 }}
          >
            {label}
          </div>
        </div>
        <button onClick={onNext} style={btn} aria-label="Další">
          <ChevronRight size={15} color={chevronColor} />
        </button>
      </div>
    </div>
  );
}
