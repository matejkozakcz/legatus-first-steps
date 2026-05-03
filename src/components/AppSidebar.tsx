import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Search,
  Shield,
  Moon,
  Sun,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import legatusLogo from "@/assets/legatus-logo-white.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { user: authUser, signOut } = useAuth();
  const { user: profile } = useWorkspace();
  const { currentRole } = useRoles();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!authUser?.id) return;
    supabase
      .from("legatus_admins")
      .select("id")
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [authUser?.id]);

  const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Můj byznys", url: "/schuzky", icon: Briefcase },
    { title: "Správa týmu", url: "/nastaveni/tym", icon: Users },
  ];

  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === url : pathname.startsWith(url);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <Sidebar
      collapsible="icon"
      className="sidebar-glass border-r-0"
      style={{ width: collapsed ? undefined : "220px" }}
    >
      <SidebarContent style={{ padding: "20px 12px" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src={legatusLogo}
            alt="Legatus"
            className="h-10 w-10 object-contain flex-shrink-0 dark:block hidden"
          />
          <img
            src={legatusLogo}
            alt="Legatus"
            className="h-10 w-10 object-contain flex-shrink-0 dark:hidden block"
            style={{ filter: "brightness(0) saturate(100%) invert(22%) sepia(35%) saturate(1500%) hue-rotate(155deg) brightness(95%) contrast(101%)" }}
          />
          {!collapsed && (
            <span className="font-heading font-bold text-[20px] leading-tight tracking-[0.2em] truncate text-[#00555f] dark:text-white">
              LEGATUS
            </span>
          )}
        </div>

        {/* Search */}
        <div className="mb-3">
          {collapsed ? (
            <button className="nav-item justify-center w-full" title="Hledat">
              <Search className="h-[18px] w-[18px]" />
            </button>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0a3540]/40 dark:text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hledat…"
                className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-[rgba(0,85,95,0.06)] dark:bg-white/10 text-[#0a3540] dark:text-white placeholder:text-[#0a3540]/40 dark:placeholder:text-white/40 border border-[rgba(0,85,95,0.08)] dark:border-white/10 focus:outline-none focus:bg-[rgba(0,85,95,0.1)] dark:focus:bg-white/15 transition-colors"
              />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={`nav-item ${isActive(item.url) ? "active" : ""}`}
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin"
                      className={`nav-item ${pathname.startsWith("/admin") ? "active" : ""}`}
                    >
                      <div className="relative flex-shrink-0">
                        <Shield className="h-[18px] w-[18px]" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-background" />
                      </div>
                      {!collapsed && <span>Admin</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom actions */}
        <div className="mt-auto pt-2 space-y-1">
          <button
            onClick={toggleTheme}
            className="nav-item w-full"
            title={theme === "dark" ? "Světlý režim" : "Tmavý režim"}
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px] flex-shrink-0" />
            ) : (
              <Moon className="h-[18px] w-[18px] flex-shrink-0" />
            )}
            {!collapsed && <span>{theme === "dark" ? "Světlý režim" : "Tmavý režim"}</span>}
          </button>
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="nav-item w-full"
            title="Nastavení"
          >
            <Settings className="h-[18px] w-[18px] flex-shrink-0" />
            {!collapsed && <span>Nastavení</span>}
          </button>
          <button onClick={() => signOut()} className="nav-item w-full" title="Odhlásit">
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            {!collapsed && <span>Odhlásit</span>}
          </button>
        </div>
      </SidebarContent>

      <SidebarFooter
        className="p-4"
        style={{ borderTop: "0.5px solid rgba(0,85,95,0.1)" }}
      >
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? ""}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-[rgba(0,85,95,0.1)] dark:bg-white/10">
              <span className="text-[13px] font-heading font-semibold text-[#00555f] dark:text-white/85">
                {initials}
              </span>
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-heading font-semibold truncate text-[#0a3540] dark:text-white/90">
                {profile?.full_name ?? "—"}
              </p>
              {currentRole?.label && (
                <p className="text-[11px] truncate text-[#0a3540]/55 dark:text-white/50">
                  {currentRole.label}
                </p>
              )}
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
