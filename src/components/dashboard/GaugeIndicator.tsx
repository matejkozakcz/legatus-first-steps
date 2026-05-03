import { useTheme } from "@/contexts/ThemeContext";

interface GaugeIndicatorProps {
  value: number;
  target: number;
  label: string;
  /** Legacy override; ignored — color now scales by progress */
  color?: string;
  unit?: string;
  /** Compact variant for smaller layouts */
  compact?: boolean;
}

/**
 * Semi-circular gauge with a dynamic color scale:
 * red → orange → yellow → green based on value/target ratio.
 */
export function GaugeIndicator({ value, target, label, unit, compact = false }: GaugeIndicatorProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const radius = compact ? 48 : 70;
  const stroke = compact ? 9 : 12;
  const cx = compact ? 60 : 90;
  const cy = compact ? 60 : 85;
  const w = compact ? 120 : 180;
  const h = compact ? 70 : 100;

  const placeholder = target === 0 && value === 0;
  const ratio = placeholder || target === 0 ? 0 : Math.min(1, value / target);
  const isDone = !placeholder && target > 0 && value >= target;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  const bgArc = dark ? "rgba(255,255,255,0.18)" : "#e2eaec";

  const colors = (() => {
    if (placeholder) return { start: dark ? "rgba(255,255,255,0.3)" : "#cbd5d8", end: dark ? "rgba(255,255,255,0.4)" : "#b8cfd4" };
    if (isDone) return { start: "#22c55e", end: "#16a34a" };
    if (ratio >= 0.66) return { start: "#84cc16", end: "#22c55e" };
    if (ratio >= 0.33) return { start: "#f59e0b", end: "#eab308" };
    return { start: "#ef4444", end: "#f97316" };
  })();

  const valueColor = placeholder
    ? (dark ? "rgba(255,255,255,0.4)" : "#b8cfd4")
    : isDone
      ? (dark ? "#86efac" : "#15803d")
      : (dark ? "#ffffff" : "var(--text-primary)");

  const maxColor = isDone
    ? (dark ? "#86efac" : "#15803d")
    : dark ? "rgba(255,255,255,0.7)" : "var(--text-muted)";

  const labelColor = dark ? "rgba(255,255,255,0.85)" : "var(--text-secondary)";

  const bucket = placeholder ? "ph" : isDone ? "done" : ratio >= 0.66 ? "high" : ratio >= 0.33 ? "mid" : "low";
  const gradId = `gaugeGrad${dark ? "Dark" : ""}${bucket}-${label.replace(/\s/g, "")}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={bgArc}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {!placeholder && (
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        )}
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        <text
          x={cx}
          y={cy - (compact ? 11 : 16)}
          textAnchor="middle"
          style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: compact ? 22 : 32, fill: valueColor }}
        >
          {placeholder ? "—" : value.toLocaleString("cs-CZ")}
        </text>
        {!placeholder && target > 0 && (
          <text
            x={cx}
            y={cy + (compact ? 3 : 4)}
            textAnchor="middle"
            style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: compact ? 11 : 14, fill: maxColor }}
          >
            z {target.toLocaleString("cs-CZ")}{unit ? ` ${unit}` : ""}
          </text>
        )}
      </svg>
      <span
        style={{
          fontFamily: "Open Sans, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: labelColor,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  );
}
