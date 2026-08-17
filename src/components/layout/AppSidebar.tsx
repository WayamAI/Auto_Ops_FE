import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Radar, Bot, Zap, Wrench, Brain, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, User, ShieldCheck, Server,
  Compass, Activity, Database
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import logo from "@/assets/j2w wh logo.png";
import { usePendingApprovals } from "@/api/hooks";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_AVATAR = "https://j2wdevstorage01.blob.core.windows.net/autoopscontainer/e8b531f5d8524c2da6644c71ab79583d_UserAvatar.svg";

const navItems = [
  { path: "/", label: "Control Tower", icon: Radar, code: "CONTROL_TOWER" },
  { path: "/agents", label: "Agents", icon: Bot, code: "AGENTS" },
  { path: "/actions", label: "Actions", icon: Zap, code: "ACTIONS" },
  { path: "/health", label: "Health Monitor", icon: Server, code: "HEALTH_MONITOR" },
  { path: "/approvals", label: "Approval Queue", icon: ShieldCheck, code: "APPROVAL_QUEUE" },
  { path: "/tools", label: "Tool Registry", icon: Wrench, code: "TOOL_REGISTRY" },
  { path: "/knowledge", label: "Knowledge Engine", icon: Brain, code: "KNOWLEDGE_ENGINE" },
  { path: "/analytics", label: "Analytics", icon: BarChart3, code: "ANALYTICS" },
];

const secondaryNavItems = [
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean, onToggle: () => void }) {
  const location = useLocation();
  const { data: pendingApprovals } = usePendingApprovals();
  const { user, logout, authorizedModules } = useAuth();

  const authorizedNavItems = navItems.filter(item => authorizedModules.includes(item.code));
  const approvalCount = pendingApprovals?.length || 0;

  const isInitialMount = useRef(true);
  const prevCountRef = useRef(approvalCount);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevCountRef.current = approvalCount;
      return;
    }
    if (approvalCount > prevCountRef.current) {
      const newApprovals = approvalCount - prevCountRef.current;
      toast.warning("Approval Required", {
        description: `${newApprovals} new pipeline${newApprovals > 1 ? 's are' : ' is'} paused and awaiting human review.`,
      });
    }
    prevCountRef.current = approvalCount;
  }, [approvalCount]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Section */}
      <div className={cn(
        "flex flex-col items-center justify-center pt-8 pb-6 border-b border-sidebar-border transition-all duration-300",
        collapsed ? "h-20" : "h-32"
      )}>
        {!collapsed ? (
          <div className="flex flex-col items-center gap-2 select-none px-4">
            <img src={logo} alt="JoulesToWatts AutoOps" className="h-12 w-auto object-contain" />
            <div className="flex flex-col items-center">
              <span className="font-bold text-foreground text-xs tracking-widest">Auto Ops</span>
              <span className="text-[8px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">Intelligent IT Automation</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <img src={logo} alt="JW" className="h-8 w-auto object-contain" />
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <section className="px-3">
          <nav className="space-y-1">
            {authorizedNavItems.map((item) => {
              const isActive = item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "bg-secondary text-success font-semibold"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-transform duration-200",
                    isActive ? "text-success" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  {!collapsed && <span>{item.label}</span>}

                  {item.path === "/approvals" && approvalCount > 0 && (
                    <span className={cn(
                      "flex items-center justify-center bg-warning text-warning-foreground font-bold rounded-full",
                      collapsed ? "absolute top-1 right-1 w-4 h-4 text-[9px]" : "ml-auto w-5 h-5 text-[10px]"
                    )}>
                      {approvalCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </section>

        <section className="px-3 mt-auto">
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "bg-secondary text-success font-semibold"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  {item.icon === Settings && !collapsed && <item.icon className="w-[18px] h-[18px] shrink-0 text-muted-foreground transition-transform duration-200 group-hover:rotate-90" />}
                  {item.icon !== Settings && <item.icon className="w-[18px] h-[18px] shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground" />}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </section>
      </div>

      {/* User & Footer Section */}
      <div className="p-4 border-t border-border/30">
        <div className={cn("flex items-center justify-between gap-3", collapsed ? "flex-col" : "")}>
          <NavLink 
            to="/profile"
            className="flex items-center gap-3 cursor-pointer hover:bg-secondary/40 p-2 -m-2 rounded-lg transition-colors border border-transparent hover:border-border/30"
          >
            <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                src={user?.profile_url || DEFAULT_AVATAR} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : "AutoOps User"}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email || "user@joulestowatts.com"}</span>
              </div>
            )}
          </NavLink>

        </div>
        <div className={cn("mt-4 flex items-center justify-between text-muted-foreground", collapsed ? "flex-col gap-4" : "")}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center text-xs hover:text-foreground transition-colors gap-1.5 px-1 font-mono uppercase tracking-wider">
                <LogOut size={14} />
                {!collapsed && "Logout"}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-popover border border-border/60">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Confirm Logout</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Are you sure you want to log out? You will need to log back in to access your autonomous fleet.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80 border-border/40">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={logout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none">
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button onClick={onToggle} className="hover:text-foreground transition-colors p-1 rounded hover:bg-secondary">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
