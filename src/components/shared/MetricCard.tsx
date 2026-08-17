import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

interface MetricCardProps {
  value: string;
  label: string;
  subText?: string;
  accentColor?: "blue" | "green" | "amber" | "red" | "purple";
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  pulse?: boolean;
}

const accentColors: Record<string, string> = {
  blue: "text-info",
  green: "text-success",
  amber: "text-warning",
  red: "text-destructive",
  purple: "text-[hsl(var(--metric-purple))]",
};

// Theme-aware backgrounds and borders
const cardStyles: Record<string, string> = {
  blue: "bg-card border-info/20 shadow-sm",
  green: "bg-card border-success/20 shadow-sm",
  amber: "bg-card border-warning/20 shadow-sm",
  red: "bg-card border-destructive/20 shadow-sm",
  purple: "bg-card border-[hsl(var(--metric-purple)/0.2)] shadow-sm",
};

const iconStyles: Record<string, string> = {
  blue: "bg-info/15 text-info",
  green: "bg-success/15 text-success",
  amber: "bg-warning/15 text-warning",
  red: "bg-destructive/15 text-destructive",
  purple: "bg-[hsl(var(--metric-purple)/0.15)] text-[hsl(var(--metric-purple))]",
};

export default function MetricCard({ 
  value, 
  label, 
  subText, 
  accentColor = "blue", 
  icon, 
  className, 
  children, 
  pulse 
}: MetricCardProps) {
  return (
    <div className={cn(
      "relative rounded-xl border p-5 transition-all duration-300 hover:shadow-md group overflow-hidden flex h-[140px] items-center",
      cardStyles[accentColor],
      pulse && "animate-pulse-glow shadow-[0_0_30px_rgba(var(--warning),0.12)]",
      className
    )}>
      {/* Background Subtle Glow on Hover */}
      <div className={cn(
        "absolute -right-10 -top-10 w-40 h-40 blur-[60px] opacity-[0.03] transition-opacity duration-500 group-hover:opacity-[0.08]",
        accentColor === "green" ? "bg-success" : 
        accentColor === "red" ? "bg-destructive" : 
        accentColor === "amber" ? "bg-warning" : "bg-info"
      )} />

      <div className="flex-1 flex flex-col justify-center z-10">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-1">
          {label}
        </p>
        <p className={cn(
          "text-3xl font-bold tracking-tight leading-none mb-1 mt-1",
          accentColors[accentColor]
        )}>
          {value}
        </p>
        
        <div className="mt-auto pt-2">
          {subText && (
            <p className="text-[11px] text-muted-foreground/70 font-medium leading-tight">
              {subText}
            </p>
          )}
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
      
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ml-4 transition-transform duration-300 group-hover:scale-110 z-10",
        iconStyles[accentColor]
      )}>
        {icon || <ArrowUpRight size={24} strokeWidth={2.5} />}
      </div>
    </div>
  );
}
