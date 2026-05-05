import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { PeriodNavigator } from "@/components/dashboard/PeriodNavigator";
import type { PeriodMode } from "@/components/dashboard/PeriodSwitcher";

interface DashboardHeaderProps {
  mode: PeriodMode;
  setMode: (m: PeriodMode) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
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

  const firstName = useMemo(() => {
    const full = displayName ?? "";
    return full.split(" ")[0] || full;
  }, [displayName]);

  if (isMobile) {
    return (
      <header
        style={{
          padding: "max(14px, calc(env(safe-area-inset-top, 0px) + 10px)) 16px 12px",
          // Reserve space for floating notification/settings/theme buttons (top-right)
          paddingRight: "calc(16px + 130px)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div
            className="font-heading"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--deep-hex)",
              opacity: 0.75,
            }}
          >
            Dashboard
          </div>
          <div
            className="font-heading font-bold"
            style={{
              fontSize: 22,
              lineHeight: 1.15,
              color: "var(--deep-hex)",
              marginTop: 2,
            }}
          >
            Ahoj, {firstName}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 4,
              color: "var(--text-muted, #8aadb3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
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

        <div style={{ display: "flex", justifyContent: "center" }}>
          <PeriodNavigator mode={mode} setMode={setMode} label={label} onPrev={onPrev} onNext={onNext} />
        </div>
      </header>
    );
  }

  // Desktop
  return (
    <header className="border-b bg-card">
      <div className="px-6 py-4 flex items-center gap-4 flex-wrap">
        <div className="min-w-0">
          <div
            className="font-heading font-bold tracking-[0.18em] text-[color:var(--deep-hex)]"
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            DASHBOARD
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted, #8aadb3)" }}>
            {displayName} · {currentRole?.label ?? "—"}
            {isImpersonating && (
              <span className="ml-2 text-amber-600 font-medium">(náhled)</span>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <PeriodNavigator mode={mode} setMode={setMode} label={label} onPrev={onPrev} onNext={onNext} />
        </div>

        <div className="flex items-center gap-2">
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
              className="bg-[#fc7c71] hover:bg-[#e05a50] text-white"
            >
              <Plus className="mr-1 h-4 w-4" /> Schůzka
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
