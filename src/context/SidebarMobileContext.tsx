import { createContext, useContext, useState, type ReactNode } from "react";

interface SidebarMobileContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SidebarMobileContext = createContext<SidebarMobileContextType | undefined>(undefined);

/**
 * Tracks whether the off-canvas mobile sidebar drawer is open. Lives above
 * PersistentLayout's Outlet so both AppSidebar (renders the drawer) and
 * TopBar (renders the hamburger toggle, several component levels away with
 * no direct parent/child relationship) can share state without prop drilling
 * through every page's AppLayout call.
 */
export function SidebarMobileProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarMobileContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </SidebarMobileContext.Provider>
  );
}

export function useSidebarMobile() {
  const context = useContext(SidebarMobileContext);
  if (context === undefined) {
    throw new Error("useSidebarMobile must be used within a SidebarMobileProvider");
  }
  return context;
}
