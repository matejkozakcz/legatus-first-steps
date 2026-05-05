import type { ReactNode } from "react";
import { Moon, Sun, Settings } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NewMeetingModalProvider } from "@/components/NewMeetingModal";
import { MeetingDetailModalProvider } from "@/components/MeetingDetailModal";
import { SettingsModalProvider, useSettingsModal } from "@/components/SettingsModal";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsModalProvider>
      <NewMeetingModalProvider>
        <MeetingDetailModalProvider>
          <LayoutShell>{children}</LayoutShell>
        </MeetingDetailModalProvider>
      </NewMeetingModalProvider>
    </SettingsModalProvider>
  );
}

function LayoutShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const { open: openSettings } = useSettingsModal();
  const isDark = theme === "dark";

  if (isMobile) {
    const floatBtn: React.CSSProperties = {
      width: 38,
      height: 38,
      borderRadius: "50%",
      border: isDark
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(0,85,95,0.15)",
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.65)",
      backdropFilter: "blur(16px) saturate(1.8)",
      WebkitBackdropFilter: "blur(16px) saturate(1.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: isDark
        ? "0 2px 12px rgba(0,0,0,0.4)"
        : "0 2px 12px rgba(0,85,95,0.15)",
      transition: "all 0.25s ease",
    };

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: isDark ? "hsl(188,35%,7%)" : "#dde8ea",
          position: "relative",
          transition: "background 0.3s ease",
        }}
      >
        <div
          style={{
            position: "fixed",
            top: "max(14px, calc(env(safe-area-inset-top, 0px) + 10px))",
            right: 16,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <NotificationBell compact />
          <button
            onClick={() => openSettings()}
            aria-label="Nastavení"
            style={floatBtn}
          >
            <Settings size={17} color="var(--deep-hex)" />
          </button>
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Světlý režim" : "Tmavý režim"}
            style={floatBtn}
          >
            {isDark ? (
              <Sun size={17} color="#f5c842" />
            ) : (
              <Moon size={17} color="var(--deep-hex)" />
            )}
          </button>
        </div>

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: "calc(82px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b bg-card md:hidden">
            <SidebarTrigger className="ml-2" />
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
