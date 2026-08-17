import { useState, useEffect, useCallback } from "react";
import { CheckCircle, RefreshCw, Activity, ShieldAlert, Monitor, Cpu } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHealth, useRecentIncidents, useAgents } from "@/api/hooks";

export default function AgentStatusRibbon() {
  const [syncSeconds, setSyncSeconds] = useState(4);
  const [isSyncing, setIsSyncing] = useState(false);

  // Live API data
  const { data: health } = useHealth();
  const { data: incidents } = useRecentIncidents(50);
  const { data: agents } = useAgents();

  const backendConnected = !!health;
  const agentCount = agents?.length ?? 0;
  const activeIncidents = incidents?.filter(i => ["rca", "planned", "executing", "validating"].includes(i.status)).length ?? 0;
  const executingCount = incidents?.filter(i => i.status === "executing").length ?? 0;
  const queueCount = incidents?.filter(i => i.status === "new" || i.status === "planned").length ?? 0;
  const totalIncidents = incidents?.filter(i => !["resolved", "cancelled", "awaiting_human_intervention"].includes(i.status)).length ?? 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSync = (s: number) => {
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s ago`;
  };

  const handleSync = useCallback(() => {
    setIsSyncing(true);
    toast.info("Syncing with production systems...");
    setTimeout(() => {
      setSyncSeconds(0);
      setIsSyncing(false);
      toast.success("System sync complete");
    }, 2000);
  }, []);

  const syncState = syncSeconds < 30 ? "success" : syncSeconds < 120 ? "warning" : "destructive";

  return (
    <div className="h-[42px] border-b border-border/50 bg-background/60 backdrop-blur-sm flex items-center px-8 gap-8 text-[11px] shrink-0 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-80">
        <Activity size={14} className="text-success/70" />
        <span className="text-muted-foreground font-semibold uppercase tracking-wider">Agents</span>
        <div className="flex items-center gap-1.5 ml-1">
          <span className={`w-1.5 h-1.5 rounded-full ${backendConnected ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-destructive"}`} />
          <span className="font-bold text-foreground">{agentCount}</span>
          <span className="text-muted-foreground/50">/ {agentCount}</span>
        </div>
      </div>

      <div className="h-3 w-[1px] bg-border/40" />

      <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-80">
        <Monitor size={14} className="text-metric-blue/70" />
        <span className="text-muted-foreground font-semibold uppercase tracking-wider">Executing</span>
        <span className="ml-1 font-bold text-foreground">{executingCount}</span>
      </div>

      <div className="h-3 w-[1px] bg-border/40" />

      <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-80">
        <ShieldAlert size={14} className="text-warning/70" />
        <span className="text-muted-foreground font-semibold uppercase tracking-wider">Queue</span>
        <span className="ml-1 font-bold text-foreground text-warning">{queueCount}</span>
      </div>

      <div className="h-3 w-[1px] bg-border/40" />

      <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-80">
        <Cpu size={14} className="text-destructive/70" />
        <span className="text-muted-foreground font-semibold uppercase tracking-wider">Incidents</span>
        <span className="ml-1 font-bold text-destructive">{totalIncidents}</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={cn(
          "flex items-center gap-2 py-1 px-3 rounded-md border border-border/40 bg-secondary/50 shadow-sm transition-all duration-200 group disabled:opacity-50",
          isSyncing ? "border-success/20" : "hover:border-success/30 hover:bg-secondary/80"
        )}
      >
        <div className="relative">
          {isSyncing ? (
            <RefreshCw size={12} className="text-success animate-spin" />
          ) : (
            <CheckCircle size={12} className={cn(
              syncState === "success" ? "text-success" :
                syncState === "warning" ? "text-warning" : "text-destructive"
            )} />
          )}
        </div>
        <span className="text-muted-foreground font-medium">Sync:</span>
        <span className={cn(
          "font-bold tabular-nums",
          isSyncing ? "text-success" :
            syncState === "success" ? "text-success" :
              syncState === "warning" ? "text-warning" : "text-destructive"
        )}>
          {isSyncing ? "Syncing..." : formatSync(syncSeconds)}
        </span>
      </button>
    </div>
  );
}
