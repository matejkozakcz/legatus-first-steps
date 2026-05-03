import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NewMeetingModalProvider } from "@/components/NewMeetingModal";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <NewMeetingModalProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex items-center border-b bg-card md:hidden">
              <SidebarTrigger className="ml-2" />
            </header>
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </NewMeetingModalProvider>
    </SidebarProvider>
  );
}
