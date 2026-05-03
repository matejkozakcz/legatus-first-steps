import type { WorkspaceRole } from "@/types/workspace";

/**
 * Generic palette by role.level (lower = more senior).
 * level 1 = teal-deep, 2 = teal, 3 = purple, 4 = green, 5+ = neutral
 */
const PALETTE: Array<{ bg: string; fg: string; dot: string }> = [
  { bg: "#e6f0f1", fg: "#00555f", dot: "#00555f" }, // 1
  { bg: "#e6f7f9", fg: "#008fa0", dot: "#00abbd" }, // 2
  { bg: "#eeebf7", fg: "#7c6fcd", dot: "#7c6fcd" }, // 3
  { bg: "#e6f7ec", fg: "#2da44e", dot: "#3FC55D" }, // 4
  { bg: "#dde8ea", fg: "#4a6b70", dot: "#89ADB4" }, // 5+
];

export function paletteForLevel(level: number | null | undefined) {
  if (!level || level < 1) return PALETTE[PALETTE.length - 1];
  return PALETTE[Math.min(level - 1, PALETTE.length - 1)];
}

interface RoleBadgeProps {
  role?: Pick<WorkspaceRole, "label" | "level"> | null;
  /** Solid filled variant (white text on dot color) — used for org chart chip */
  variant?: "soft" | "solid";
  className?: string;
}

export function RoleBadge({ role, variant = "soft", className = "" }: RoleBadgeProps) {
  if (!role?.label) return null;
  const p = paletteForLevel(role.level);
  if (variant === "solid") {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${className}`}
        style={{ background: p.dot }}
      >
        {role.label}
      </span>
    );
  }
  return (
    <span
      className={`role-badge ${className}`}
      style={{ background: p.bg, color: p.fg }}
    >
      {role.label}
    </span>
  );
}
