import { useMemo } from "react";
import { Plus, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { PeriodNavigator } from "@/components/dashboard/PeriodNavigator";
import { NotificationBell } from "@/components/NotificationBell";
import type { PeriodMode } from "@/components/dashboard/PeriodSwitcher";

interface DashboardHeaderProps {
  mode: PeriodMode;
  setMode: (m: PeriodMode) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  onNewMeeting?: () => void;
  canCreateMeeting?: boolean;
  newMeetingDisabledReason?: string;
}

export function DashboardHeader({
  mode,
  setMode,
  label,
  onPrev,
  onNext,
  selectedDate,
  onSelectDate,
  onNewMeeting,
  canCreateMeeting = true,
  newMeetingDisabledReason,
}: DashboardHeaderProps) {
  const isMobile = useIsMobile();
  const { user } = useWorkspace();
  const { currentRole } = useRoles();
  const { isImpersonating, state: impState } = useImpersonation();

  const displayName = useMemo(() => {
    if (isImpersonating && impState?.targetName) return impState.targetName;
    return user?.full_name ?? user?.email ?? "—";
  }, [isImpersonating, impState, user]);

  const firstName = useMemo(() => displayName.split(" ")[0] || displayName, [displayName]);

  const eyebrow = mode === "week" ? "Aktuální týden" : "Aktuální období";

  if (isMobile) {
    return (
      <header
        style={{
          padding: "max(14px, calc(env(safe-area-inset-top, 0px) + 10px)) 16px 12px",
          paddingRight: "calc(16px + 130px)",
          background: "transparent",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-[color:var(--deep-hex)]" />
            <h1
              className="font-heading font-bold tracking-[0.16em] text-[color:var(--deep-hex)]"
              style={{ fontSize: 20, lineHeight: 1 }}
            >
              DASHBOARD
            </h1>
          </div>
          <div
            className="font-heading font-bold"
            style={{ fontSize: 18, color: "var(--deep-hex)", marginTop: 6 }}
          >
            Ahoj, {firstName}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 2,
              color: "var(--text-muted, #8aadb3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{currentRole?.label ?? "—"}</span>
            {isImpersonating && (
              <span
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "#b45309",
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "1px 8px",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                náhled
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ViewModeDropdown mode={mode} setMode={setMode} />
          <div className="flex-1 flex justify-center">
            <PeriodNavigator
              label={eyebrow}
              title={label}
              onPrev={onPrev}
              onNext={onNext}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              pickerMode={mode === "month" ? "month" : "day"}
            />
          </div>
        </div>
      </header>
    );
  }

  // Desktop — transparent header, single row
  return (
    <header
      className="px-6 pt-5 pb-4"
      style={{ background: "transparent" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
          minHeight: 56,
        }}
      >
        {/* Left: title + view mode dropdown */}
        <div className="flex items-center gap-4 flex-wrap" style={{ justifySelf: "start" }}>
          <LayoutDashboard className="h-6 w-6 text-[color:var(--deep-hex)]" />
          <h1
            className="font-heading font-bold tracking-[0.04em] text-[color:var(--deep-hex)]"
            style={{ fontSize: 28, lineHeight: 1 }}
          >
            DASHBOARD
          </h1>
          <ViewModeDropdown mode={mode} setMode={setMode} />
        </div>

        {/* Center: period navigator */}
        <div style={{ justifySelf: "center" }}>
          <PeriodNavigator
            label={eyebrow}
            title={label}
            onPrev={onPrev}
            onNext={onNext}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            pickerMode={mode === "month" ? "month" : "day"}
            widthScale={1.3}
          />
        </div>

        {/* Right: Schůzka + bell */}
        <div className="flex items-center gap-2" style={{ justifySelf: "end" }}>
          {onNewMeeting && (
            <Button
              disabled={!canCreateMeeting || isImpersonating}
              onClick={onNewMeeting}
              title={
                isImpersonating
                  ? "Pouze náhled"
                  : !canCreateMeeting
                    ? newMeetingDisabledReason
                    : undefined
              }
              className="bg-[#fc7c71] hover:bg-[#e05a50] text-white rounded-xl px-4"
            >
              <Plus className="mr-1 h-4 w-4" /> Schůzka
            </Button>
          )}
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}

function ViewModeDropdown({ mode, setMode }: { mode: PeriodMode; setMode: (m: PeriodMode) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-2 font-heading font-bold text-[color:var(--deep-hex)] transition-colors"
          style={{
            padding: "10px 16px",
            border: "1px solid #e1e9eb",
            borderRadius: 16,
            background: "#ffffff",
            fontSize: 15,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <span>{mode === "month" ? "Měsíc" : "Týden"}</span>
          <ChevronDown size={15} className="text-[#00abbd]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuItem
          onClick={() => setMode("month")}
          className={mode === "month" ? "font-bold text-[#00abbd]" : ""}
        >
          Měsíc
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setMode("week")}
          className={mode === "week" ? "font-bold text-[#00abbd]" : ""}
        >
          Týden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
