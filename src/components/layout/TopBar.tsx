import { Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";
import { ThemeToggle } from "../theme-toggle";

const DEFAULT_AVATAR = "https://j2wdevstorage01.blob.core.windows.net/autoopscontainer/e8b531f5d8524c2da6644c71ab79583d_UserAvatar.svg";

interface TopBarProps {
  title: string;
  subtitle: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth();
  
  return (
    <header className="h-[76px] border-b border-border/60 flex items-center justify-between px-8 bg-background sticky top-0 z-40 shrink-0">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-bold text-foreground leading-tight tracking-wide">{title}</h1>
        <p className="text-[12px] text-muted-foreground/80 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors" />
          <input
            placeholder="Search agents, actions, patterns..."
            className="h-[38px] w-[340px] rounded-md bg-secondary/50 border border-border/40 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border transition-colors shadow-inner"
          />
        </div>

        <div className="flex items-center gap-5">
          <ThemeToggle />
          <NotificationDropdown />

          <Link to="/profile" className="flex items-center justify-center w-8 h-8 rounded-full border border-border/50 bg-secondary/50 text-muted-foreground hover:text-foreground transition-all duration-200 overflow-hidden">
            <img 
              src={user?.profile_url || DEFAULT_AVATAR} 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
