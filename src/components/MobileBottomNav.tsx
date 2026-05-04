import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Briefcase, Users } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTheme } from "@/contexts/ThemeContext";

export function MobileBottomNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user: profile } = useWorkspace();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const isDashboardActive = pathname === "/dashboard";
  const avatarBorder = isDashboardActive ? "3px solid #00abbd" : "3px solid white";
  const avatarShadow = isDashboardActive
    ? "0 4px 20px rgba(0,171,189,0.4)"
    : "0 4px 20px rgba(0,85,95,0.25)";

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

        <div style={{ flex: 1 }} />

        <NavButton
          icon={Briefcase}
          label="Byznys"
          active={pathname.startsWith("/schuzky")}
          onClick={() => navigate({ to: "/schuzky" })}
          isDark={isDark}
        />

        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: -22,
            pointerEvents: "all",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: avatarBorder,
              boxShadow: avatarShadow,
              overflow: "hidden",
              cursor: "pointer",
              background: "#00555f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.25s",
              WebkitTapHighlightColor: "transparent",
              userSelect: "none",
            }}
            aria-label="Dashboard"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={initials}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "white",
                  lineHeight: 1,
                }}
              >
                {initials}
              </span>
            )}
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
            Dashboard
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
        padding: "8px 20px",
        borderRadius: 30,
        border: "none",
        background: "transparent",
        flex: 1,
        position: "relative",
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
