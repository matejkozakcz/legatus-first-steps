import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shield, Building2, FileCode } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTheme } from "@/contexts/ThemeContext";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const TABS = [
  { key: "workspaces", to: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { key: "templates", to: "/admin/templates", label: "Šablony", icon: FileCode },
] as const;

function AdminLayout() {
  const { isLegatusAdmin, isLoading } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!isLoading && !isLegatusAdmin) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoading, isLegatusAdmin, navigate]);

  if (isLoading || !isLegatusAdmin) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Načítám…</div>
    );
  }

  const activeColor = "#00abbd";
  const inactiveColor = isDark ? "#4a7a80" : "#8aadb3";
  const path = location.pathname;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Admin Dashboard
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          borderRadius: 12,
          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,85,95,0.06)",
          padding: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {TABS.map((t) => {
          const isActive = path.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              to={t.to}
              style={{
                flex: "1 1 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: isActive ? 600 : 500,
                fontSize: 12.5,
                color: isActive ? (isDark ? "#fff" : "#00555f") : inactiveColor,
                background: isActive ? (isDark ? "rgba(0,171,189,0.2)" : "#fff") : "transparent",
                borderRadius: 10,
                boxShadow: isActive
                  ? isDark
                    ? "0 1px 4px rgba(0,0,0,0.3)"
                    : "0 1px 4px rgba(0,85,95,0.1)"
                  : "none",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              <Icon size={14} color={isActive ? activeColor : inactiveColor} />
              {t.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
