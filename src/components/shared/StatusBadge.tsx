import { cn } from "@/lib/utils";

type BadgeVariant = "active" | "idle" | "error" | "learning" | "disabled" | "pending" | "in-progress" | "resolved" | "escalated" | "executing" | "analyzing" | "planning" | "validating" | "queued" | "completed" | "failed" | "refining" | "proposed" | "warning" | "connected" | "human-intervention";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20",
  idle: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20",
  error: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20",
  learning: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/20",
  disabled: "bg-muted/10 text-muted-foreground border-border/20",
  pending: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20",
  "in-progress": "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/20",
  resolved: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30",
  escalated: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20",
  executing: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
  analyzing: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
  planning: "bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20",
  validating: "bg-[#14b8a6]/10 text-[#14b8a6] border-[#14b8a6]/20",
  queued: "bg-[#64748b]/15 text-[#64748b] border-[#64748b]/20",
  completed: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20",
  failed: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20",
  refining: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20",
  proposed: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
  warning: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20",
  connected: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20",
  "human-intervention": "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/20",
};

export default function StatusBadge({ variant, label, className }: { variant: BadgeVariant; label?: string; className?: string }) {
  const displayLabel = label || variant.charAt(0).toUpperCase() + variant.slice(1).replace("-", " ");
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap", 
      variantStyles[variant], 
      className
    )}>
      {displayLabel}
    </span>
  );
}
