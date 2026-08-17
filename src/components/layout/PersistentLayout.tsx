import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { cn } from "@/lib/utils";
import { SidebarMobileProvider } from "@/context/SidebarMobileContext";

export default function PersistentLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarMobileProvider>
      <div className="min-h-screen flex bg-background">
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={cn(
          "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300",
          "ml-0", // off canvas on mobile — the drawer overlays instead of pushing content
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        )}>
          <Outlet />
        </div>
      </div>
    </SidebarMobileProvider>
  );
}
