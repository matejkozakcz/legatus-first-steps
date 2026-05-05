import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Briefcase, Users, LayoutDashboard, Plus, Phone } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNewMeetingModal } from "@/components/NewMeetingModal";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function MobileBottomNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { open: openNewMeeting } = useNewMeetingModal();
  const { isImpersonating } = useImpersonation();

  // Context-aware FAB
  const fab = (() => {
    if (pathname.startsWith("/call-party")) {
      return {
        icon: Phone,
        label: "Hovor",
        onClick: () => navigate({ to: "/call-party" }),
        disabled: false,
      };
    }
    return {
      icon: Plus,
      label: "Schůzka",
      onClick: () => openNewMeeting(),
      disabled: isImpersonating,
    };
  })();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "0 20px 18px",
        paddingBottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 64,
          background: isDark ? "rgba(9,29,33,0.82)" : "rgba(255,255,255,0.55)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          borderRadius: 40,
          border: isDark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(255,255,255,0.7)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)"
            : "0 8px 32px rgba(0,85,95,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          position: "relative",
          pointerEvents: "all",
        }}
      >
        <NavButton
          icon={Users}
          label="Tým"
          active={pathname.startsWith("/nastaveni/tym")}
          onClick={() => navigate({ to: "/nastaveni/tym" })}
          isDark={isDark}
        />
        <NavButton
          icon={LayoutDashboard}
          label="Dashboard"
          active={pathname === "/dashboard"}
          onClick={() => navigate({ to: "/dashboard" })}
          isDark={isDark}
        />
        <NavButton
          icon={Briefcase}
          label="Byznys"
          active={pathname.startsWith("/schuzky")}
          onClick={() => navigate({ to: "/schuzky" })}
          isDark={isDark}
        />

        {/* Floating context-aware FAB */}
        <div
          style={{
            position: "absolute",
            right: 8,
            top: -22,
            pointerEvents: "all",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={fab.onClick}
            disabled={fab.disabled}
            aria-label={fab.label}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              background: fab.disabled ? "#9aa6a8" : "#fc7c71",
              color: "white",
              boxShadow: "0 6px 20px rgba(252,124,113,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: fab.disabled ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: fab.disabled ? 0.6 : 1,
            }}
          >
            <fab.icon size={26} />
          </button>
          <div
            style={{
              textAlign: "center",
              marginTop: 5,
              fontSize: 10,
              fontWeight: 600,
              color: isDark ? "#4a7a80" : "#8aadb3",
              letterSpacing: "0.02em",
              fontFamily: "Open Sans, sans-serif",
            }}
          >
            {fab.label}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  isDark = false,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  isDark?: boolean;
}) {
  const activeColor = "#00abbd";
  const inactiveColor = isDark ? "#4a7a80" : "#8aadb3";
  const color = active ? activeColor : inactiveColor;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        cursor: "pointer",
        padding: "8px 12px",
        borderRadius: 30,
        border: "none",
        background: "transparent",
        flex: 1,
      }}
    >
      <Icon size={22} color={color} style={{ transition: "color 0.2s" }} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color,
          letterSpacing: "0.02em",
          fontFamily: "Open Sans, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  );
}
