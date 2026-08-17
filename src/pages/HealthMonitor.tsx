import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { X, CheckCircle, AlertTriangle, Clock, Loader2, Server, Shield, ChevronRight, Activity } from "lucide-react";
import { toast } from "sonner";
import { useMidServers } from "@/api/hooks";
import type { MidServerResponse } from "@/api/types";

type MidStatus = "operational" | "degraded" | "unreachable" | "upgrading";
type CredStatus = "valid" | "expiring" | "locked" | "expired" | "unknown";
type DrawerTab = "overview" | "timeline" | "patterns" | "history";

interface MidServer {
  name: string;
  os: string;
  version: string;
  status: MidStatus;
  heartbeat: string;
  heartbeatSec: number;
  eccReady: number;
  eccError: number;
  eccProcessing: number;
  activeJobs: number;
  credStatus: CredStatus;
  credExpiry?: string;
  agent: string;
  lastAction: string;
  incidentId?: string;
  hostName?: string;
  sysId?: string;
  validated?: string;
}

// Mock servers — commented out, replaced by live ServiceNow data from GET /midservers
// const servers: MidServer[] = [ ... ];

function apiToMidServer(r: MidServerResponse): MidServer {
  return {
    name: r.name,
    os: r.os,
    version: r.version,
    status: r.status as MidStatus,
    heartbeat: r.heartbeat,
    heartbeatSec: r.heartbeatSec,
    eccReady: r.eccReady,
    eccError: r.eccError,
    eccProcessing: r.eccProcessing ?? 0,
    activeJobs: r.activeJobs,
    credStatus: r.credStatus as CredStatus,
    credExpiry: r.credExpiry || undefined,
    agent: r.agent,
    lastAction: r.lastAction,
    incidentId: r.incidentId || undefined,
    hostName: r.hostName,
    sysId: r.sysId,
    validated: r.validated,
  };
}

const statusColor: Record<MidStatus, "active" | "warning" | "error" | "in-progress"> = {
  operational: "active",
  degraded: "warning",
  unreachable: "error",
  upgrading: "in-progress",
};

const statusDot: Record<MidStatus, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  unreachable: "bg-destructive",
  upgrading: "bg-info",
};

const credVariant: Record<CredStatus, string> = {
  valid: "text-success",
  expiring: "text-warning",
  locked: "text-destructive",
  expired: "text-destructive",
  unknown: "text-muted-foreground",
};

// credExpiringServers computed inside component from live data

// Drawer data for prod-mid-09
const drawerTimeline = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const eccErrors = hour < 8 ? Math.floor(Math.random() * 3) : hour === 8 ? 14 : hour < 11 ? 12 + Math.floor(Math.random() * 5) : 10 + Math.floor(Math.random() * 4);
  const jvmHeap = 65 + (hour / 24) * 24 + Math.random() * 3;
  const heartbeatOk = hour < 10.75;
  return { hour: `${String(hour).padStart(2, "0")}:00`, eccErrors: hour < 8 ? eccErrors : eccErrors, jvmHeap: Math.min(Math.round(jvmHeap), 89), heartbeatOk };
});

const remediationHistory = [
  { date: "18 Mar", issue: "JVM heap at 87%", action: "Increased -Xmx to 2048m, restarted service", outcome: "Resolved", duration: "4m 12s" },
  { date: "11 Mar", issue: "ECC queue backlog 28 tasks", action: "Cleared error queue, restarted ECC poller", outcome: "Resolved", duration: "2m 48s" },
  { date: "04 Mar", issue: "Discovery schedule missed × 3", action: "Triggered manual discovery rerun", outcome: "Resolved", duration: "1m 20s" },
  { date: "27 Feb", issue: "MID service unresponsive (heartbeat lost)", action: "Restarted MIDServer Windows service", outcome: "Resolved", duration: "3m 05s" },
  { date: "19 Feb", issue: "Wrapper.conf misconfiguration post patch", action: "Restored from config backup", outcome: "Resolved", duration: "6m 44s" },
];

const relatedPatterns = [
  { name: "ECC Queue Backlog → Thread Config Increase + Queue Flush", source: "Mined from ServiceNow", confidence: 94, applied: 11, success: "90.9%", disabled: false },
  { name: "JVM Heap Pressure → Memory Allocation Increase", source: "Mined from ServiceNow", confidence: 91, applied: 18, success: "94.4%", disabled: true },
  { name: "JDBC Probe Timeout → Integration Credential Revalidation", source: "Learned Autonomously", confidence: 78, applied: 4, success: "75%", disabled: false },
];

export default function HealthMonitor() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<MidStatus | "all">("all");
  const [drawerServer, setDrawerServer] = useState<MidServer | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const [refreshModal, setRefreshModal] = useState<string | null>(null);

  // Fetch MID Servers from ServiceNow via backend API
  const { data: apiMidServers, isLoading: midLoading } = useMidServers();

  // Map API response to local MidServer type
  const servers: MidServer[] = apiMidServers ? apiMidServers.map(apiToMidServer) : [];

  const credExpiringServers = servers.filter(s => s.credStatus === "expiring");

  const filtered = statusFilter === "all" ? servers : servers.filter(s => s.status === statusFilter);

  const counts = {
    total: servers.length,
    operational: servers.filter(s => s.status === "operational").length,
    degraded: servers.filter(s => s.status === "degraded").length,
    unreachable: servers.filter(s => s.status === "unreachable").length,
    eccErrors: servers.reduce((s, sv) => s + sv.eccError, 0),
  };

  const windowsCount = servers.filter(s => s.os.toLowerCase().includes("windows")).length;
  const linuxCount = servers.filter(s => !s.os.toLowerCase().includes("windows")).length;

  const kpis = [
    { value: String(counts.total), label: "Total MID Servers", sub: `${windowsCount} Windows · ${linuxCount} Linux`, color: "blue" as const, filter: "all" as const, icon: <Server size={24} /> },
    { value: String(counts.operational), label: "Operational", sub: "Heartbeat < 60s", color: "green" as const, filter: "operational" as MidStatus, icon: <CheckCircle size={24} /> },
    { value: String(counts.degraded), label: "Degraded", sub: "Heartbeat 60–300s", color: "amber" as const, filter: "degraded" as MidStatus, icon: <AlertTriangle size={24} /> },
    { value: String(counts.unreachable), label: "Unreachable", sub: "No heartbeat > 5 min", color: "red" as const, filter: "unreachable" as MidStatus, icon: <X size={24} /> },
    { value: String(counts.eccErrors), label: "ECC Queue Errors", sub: "Across all nodes", color: "red" as const, filter: "all" as const, icon: <Activity size={24} /> },
  ];

  const isP3 = (s: MidServer) => s.version.includes("Patch 3");

  return (
    <AppLayout title="Health Monitor" subtitle="Real time visibility across all nodes">
      {/* KPI Tiles */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="cursor-pointer" onClick={() => setStatusFilter(k.filter)}>
            <MetricCard value={k.value} label={k.label} subText={k.sub} accentColor={k.color} icon={k.icon} />
          </div>
        ))}
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="status-dot-green animate-pulse-soft" />
          <span className="text-[10px] text-muted-foreground">Auto-refresh ON · 5s interval</span>
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")} className="text-[10px] text-primary hover:underline ml-2">Clear filter</button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={`bg-card rounded-md border border-border/40 overflow-hidden shadow-sm transition-all ${drawerServer ? "flex-1" : "w-full"}`}>
          {midLoading && (
            <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2"><Loader2 size={16} className="animate-spin" /> Loading MID Servers from ServiceNow...</div>
          )}
          {!midLoading && servers.length === 0 && (
            <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">No MID Servers found. The ServiceNow instance may be hibernating or no MID Servers are registered.</div>
          )}
          {!midLoading && servers.length > 0 && <table className="w-full">
            <thead>
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Server Name</th>
                <th className="px-3 py-2 text-left">Host OS</th>
                <th className="px-3 py-2 text-left">MID Version</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Heartbeat</th>
                <th className="px-3 py-2 text-left">ECC Queue</th>
                <th className="px-3 py-2 text-right">Jobs</th>
                <th className="px-3 py-2 text-left">Credential</th>
                <th className="px-3 py-2 text-left">Last Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/50 cursor-pointer transition-colors ${drawerServer?.name === s.name ? "bg-primary/5" : "hover:bg-secondary/30"}`}
                  onClick={() => { setDrawerServer(s); setDrawerTab("overview"); }}
                >
                  <td className="px-3 py-2 text-xs font-mono text-foreground">{s.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {s.os.includes("Windows") ? "🪟" : "🐧"} {s.os.includes("Windows") ? "Win 2019" : "RHEL 8.4"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{s.version.replace("Quebec ", "Q ")}</td>
                  <td className="px-3 py-2"><StatusBadge variant={statusColor[s.status] as any} label={s.status.charAt(0).toUpperCase() + s.status.slice(1)} /></td>
                  <td className={`px-3 py-2 text-xs font-mono ${s.heartbeatSec > 120 ? "text-destructive" : "text-muted-foreground"}`}>{s.heartbeat}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Ready:{s.eccReady}</span>
                    {s.eccError > 0 && <span className="text-destructive ml-1">· Error:{s.eccError}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-right text-muted-foreground">{s.activeJobs}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs ${credVariant[s.credStatus]}`}>
                      {s.credStatus === "valid" ? "Valid" : s.credStatus === "expiring" ? `Expiring ${s.credExpiry}` : s.credStatus === "unknown" ? "Unknown" : s.credStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[180px] truncate">
                    {s.incidentId ? (
                      <span>{s.lastAction} (<a href={`/incident/${s.incidentId}`} className="incident-id hover:underline" onClick={e => e.stopPropagation()}>{s.incidentId}</a>)</span>
                    ) : s.lastAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>

        {/* Detail Drawer */}
        {drawerServer && (
          <div className="w-[480px] shrink-0 bg-card rounded-md border border-border/60 overflow-y-auto max-h-[calc(100vh-200px)] animate-in slide-in-from-right duration-300 shadow-2xl z-20">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold font-mono text-foreground">{drawerServer.name}</h3>
                <div className="flex items-center gap-2">
                  <StatusBadge variant={statusColor[drawerServer.status] as any} label={drawerServer.status.charAt(0).toUpperCase() + drawerServer.status.slice(1)} />
                  <button onClick={() => setDrawerServer(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{drawerServer.os} · {drawerServer.version}</p>
              <p className="text-[10px] text-muted-foreground">{drawerServer.agent} monitoring{drawerServer.incidentId && <> · <a href={`/incident/${drawerServer.incidentId}`} className="incident-id hover:underline">{drawerServer.incidentId}</a> open</>}</p>

              {/* P3 upgrade banner */}
              {isP3(drawerServer) && (
                <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20 text-[10px] text-warning">
                  <p className="font-medium">⚠ Quebec Patch 3 detected — Patch 4 available</p>
                  <p className="text-muted-foreground mt-0.5">Known issues on P3: wrapper.exe binary lock during auto-upgrade on Windows GPO environments · ECC thread pool cap at 25 (increased to 50 in P4)</p>
                  <button onClick={() => toast.info("Upgrade schedule sent to MID Server Agent")} className="mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30">
                    Schedule Upgrade via Agent →
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["overview", "timeline", "patterns", "history"] as DrawerTab[]).map(t => (
                <button key={t} onClick={() => setDrawerTab(t)} className={`flex-1 px-3 py-2 text-[10px] font-medium border-b-2 transition-colors ${drawerTab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
                  {t === "overview" ? "Overview" : t === "timeline" ? "Health Timeline" : t === "patterns" ? "Related Patterns" : "Remediation History"}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Overview Tab */}
              {drawerTab === "overview" && (
                <div className="space-y-4">
                  <div className="bg-secondary/30 rounded-lg p-3 border border-border space-y-2">
                    <h4 className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Node Details</h4>
                    {[
                      ["Hostname", drawerServer.hostName || `${drawerServer.name}.corp.internal`],
                      ["Host OS", drawerServer.os],
                      ["MID Version", `${drawerServer.version}${isP3(drawerServer) ? " (upgrade available)" : ""}`],
                      ["Status", drawerServer.status.charAt(0).toUpperCase() + drawerServer.status.slice(1)],
                      ["Heartbeat", drawerServer.heartbeat],
                      ["Validated", drawerServer.validated || "—"],
                      ["Sys ID", drawerServer.sysId || "—"],
                      ["Wrapper Config", drawerServer.os.includes("Windows") ? "C:\\ServiceNow\\MID\\conf\\wrapper-override.conf" : "/opt/servicenow/mid/conf/wrapper-override.conf"],
                      ["Agent", drawerServer.agent],
                      ["Last Action", drawerServer.lastAction],
                    ].map(([k, v], i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className={`text-foreground text-right max-w-[260px] font-mono text-[10px] ${k === "Wrapper Config" ? "break-all" : ""}`}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-secondary/30 rounded-lg p-3 border border-border space-y-2">
                    <h4 className="text-[10px] font-semibold text-foreground uppercase tracking-wider">ECC Queue Status</h4>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Ready</span><span className="text-foreground">{drawerServer.eccReady} tasks</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Processing</span><span className="text-foreground">{drawerServer.eccProcessing} tasks</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Error</span><span className={drawerServer.eccError > 0 ? "text-destructive" : "text-foreground"}>{drawerServer.eccError} tasks</span></div>
                  </div>

                  {drawerServer.incidentId && (
                    <div className="bg-secondary/30 rounded-lg p-3 border border-border space-y-2">
                      <h4 className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Active Incident</h4>
                      <div className="flex items-center gap-2">
                        <a href={`/incident/${drawerServer.incidentId}`} className="incident-id hover:underline">{drawerServer.incidentId}</a>
                        <StatusBadge variant="error" label="P1" />
                        <span className="text-[10px] text-warning">Awaiting Approval</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{drawerServer.name === "prod-mid-09" ? "ECC Queue Backlog — Thread Exhaustion" : "Zombie Upgrade Loop"}</p>
                      <p className="text-[10px] text-muted-foreground">{drawerServer.name === "prod-mid-09" ? "Agent recommendation: Increase JVM heap + mid.threads.max from 25 → 50" : "Agent recommendation: Clear stale binaries + restart"}</p>
                      <button onClick={() => navigate("/approvals")} className="text-[10px] text-primary hover:underline">View in Approval Queue →</button>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Tab */}
              {drawerTab === "timeline" && (
                <div className="space-y-4">
                  <p className="text-[10px] text-muted-foreground">Last 24 hours — {drawerServer.name}</p>
                  {/* SVG Timeline */}
                  <div className="bg-secondary/30 rounded-lg p-3 border border-border">
                    <p className="text-[10px] font-medium text-foreground mb-2">ECC Error Count</p>
                    <svg viewBox="0 0 480 80" className="w-full h-20">
                      {drawerTimeline.map((d, i) => {
                        const x = (i / 23) * 460 + 10;
                        const h = (d.eccErrors / 20) * 60;
                        return (
                          <rect key={i} x={x - 5} y={70 - h} width={10} height={h} rx={2}
                            fill={d.eccErrors > 10 ? "hsl(var(--destructive))" : "hsl(var(--success))"} opacity={0.7} />
                        );
                      })}
                      <line x1="10" y1="70" x2="470" y2="70" stroke="hsl(var(--border))" strokeWidth="1" />
                    </svg>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
                    </div>
                  </div>

                  <div className="bg-secondary/30 rounded-lg p-3 border border-border">
                    <p className="text-[10px] font-medium text-foreground mb-2">JVM Heap Utilization (%)</p>
                    <svg viewBox="0 0 480 80" className="w-full h-20">
                      <polyline
                        points={drawerTimeline.map((d, i) => `${(i / 23) * 460 + 10},${70 - ((d.jvmHeap - 60) / 30) * 60}`).join(" ")}
                        fill="none" stroke="hsl(var(--warning))" strokeWidth="2"
                      />
                      <line x1="10" y1="70" x2="470" y2="70" stroke="hsl(var(--border))" strokeWidth="1" />
                    </svg>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>65%</span><span>75%</span><span>85%</span><span>89%</span>
                    </div>
                  </div>

                  <div className="bg-secondary/30 rounded-lg p-3 border border-border">
                    <p className="text-[10px] font-medium text-foreground mb-2">Heartbeat Status</p>
                    <div className="flex gap-1">
                      {drawerTimeline.map((d, i) => (
                        <div key={i} className={`flex-1 h-4 rounded-sm ${d.heartbeatOk ? "bg-success/50" : i % 2 === 0 ? "bg-warning/50" : "bg-success/50"}`} title={`${d.hour}: ${d.heartbeatOk ? "OK" : "Intermittent"}`} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>00:00</span><span>Intermittent from ~10:45</span><span>Now</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-destructive">⚠ Red spike in ECC errors starting ~08:15 AM (matching INC0012823 creation). JVM heap creeping from 65% to 89%.</p>
                </div>
              )}

              {/* Patterns Tab */}
              {drawerTab === "patterns" && (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground">Matching Knowledge Engine patterns for {drawerServer.name}'s current state</p>
                  {relatedPatterns.map((p, i) => (
                    <div key={i} className="bg-secondary/30 rounded-lg p-3 border border-border space-y-2">
                      <h4 className="text-xs font-semibold text-foreground">{p.name}</h4>
                      <p className={`text-[10px] ${p.source === "Mined from ServiceNow" ? "text-info" : "text-success"}`}>{p.source}</p>
                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                        <span>Confidence: <span className={p.confidence > 85 ? "text-success" : "text-warning"}>{p.confidence}%</span></span>
                        <span>Applied: <span className="text-foreground">{p.applied}×</span></span>
                        <span>Success: <span className="text-success">{p.success}</span></span>
                      </div>
                      <button
                        disabled={p.disabled}
                        onClick={() => toast.success(`Pattern "${p.name}" applied`)}
                        className="h-6 px-2 rounded text-[10px] font-medium bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Apply Pattern →{p.disabled ? " (pending INC0012823 approval)" : ""}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Remediation History Tab */}
              {drawerTab === "history" && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground mb-2">Last 30 days — {drawerServer.name}</p>
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
                        <th className="py-1 text-left">Date</th><th className="py-1 text-left">Issue</th><th className="py-1 text-left">Action</th><th className="py-1 text-left">Outcome</th><th className="py-1 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remediationHistory.map((r, i) => (
                        <tr key={i} className="border-b border-border/50 text-xs">
                          <td className="py-1.5 text-muted-foreground">{r.date}</td>
                          <td className="py-1.5 text-foreground">{r.issue}</td>
                          <td className="py-1.5 text-muted-foreground text-[10px]">{r.action}</td>
                          <td className="py-1.5"><span className="text-success text-[10px]">{r.outcome}</span></td>
                          <td className="py-1.5 text-right text-muted-foreground font-mono text-[10px]">{r.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Credential Expiry Watch */}
      <div className="mt-8 bg-card rounded-md border border-warning/20 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border/40 bg-warning/5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Credential Expiry Watch</h3>
          <p className="text-[10px] text-muted-foreground font-medium">{credExpiringServers.length} MID Server service accounts require rotation</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 text-[10px] text-muted-foreground uppercase tracking-widest bg-secondary/10">
              <th className="px-5 py-3 text-left font-bold">Server</th>
              <th className="px-5 py-3 text-left font-bold">Account</th>
              <th className="px-5 py-3 text-left font-bold">Expiry</th>
              <th className="px-5 py-3 text-left font-bold">AD Domain</th>
              <th className="px-5 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {credExpiringServers.map((s, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-2 text-xs font-mono text-foreground">{s.name}</td>
                <td className="px-4 py-2 text-xs font-mono text-muted-foreground">svc_snow_mid_{s.name.split("-")[2]}@corp.internal</td>
                <td className="px-4 py-2 text-xs text-warning font-medium">Expires in {s.credExpiry}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">CORP</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setRefreshModal(s.name)} className="h-6 px-2 rounded text-[10px] font-medium bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25">
                    Initiate Refresh →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credential Refresh Modal */}
      {refreshModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setRefreshModal(null)}>
          <div className="bg-card border border-border rounded-lg w-[500px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Credential Refresh — {refreshModal}</h3>
              <button onClick={() => setRefreshModal(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              {[
                ["Current credential", `svc_snow_mid_${refreshModal.split("-")[2]}@corp.internal`],
                ["Vault source", "HashiCorp Vault (corp-vault-01.internal)"],
                ["Proposed action", "Rotate AD password → update ServiceNow credential record → restart MID service → validate heartbeat"],
                ["Estimated duration", "~4 minutes"],
                ["Risk", "Low — single MID node, backup MID available (prod-mid-05)"],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground text-right max-w-[300px]">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-3 border-t border-border">
                <button onClick={() => { setRefreshModal(null); toast.success(`Credential refresh initiated for ${refreshModal}`); }} className="h-8 px-4 rounded text-xs font-medium bg-success text-success-foreground hover:bg-success/90">Confirm & Execute</button>
                <button onClick={() => { setRefreshModal(null); toast.info("Scheduled for next maintenance window"); }} className="h-8 px-4 rounded text-xs font-medium bg-secondary text-foreground border border-border">Schedule for maintenance window</button>
                <button onClick={() => setRefreshModal(null)} className="h-8 px-4 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
