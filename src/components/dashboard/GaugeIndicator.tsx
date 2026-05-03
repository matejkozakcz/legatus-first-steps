interface GaugeIndicatorProps {
  value: number;
  target: number;
  label: string;
  color?: string;
  unit?: string;
}

export function GaugeIndicator({ value, target, label, color = "hsl(var(--primary))", unit }: GaugeIndicatorProps) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const angle = pct * 180; // semi-circle
  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 10 }}>
        <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
          />
        </svg>
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center"
          style={{ paddingBottom: 2 }}
        >
          <div className="text-2xl font-bold leading-none" style={{ color }}>
            {value.toLocaleString("cs-CZ")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            z {target.toLocaleString("cs-CZ")} {unit ?? ""}
          </div>
        </div>
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2 text-center">
        {label}
      </div>
    </div>
  );
}
