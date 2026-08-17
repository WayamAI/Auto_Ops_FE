import { X, AlertTriangle, Server, Database, Globe, Cloud, ArrowRight, Activity } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

interface CINode {
  name: string;
  type: "server" | "service" | "database" | "network" | "cloud";
  status: "affected" | "at-risk" | "healthy";
  alerts?: string[];
}

interface BlastRadiusData {
  source: CINode;
  downstream: CINode[];
  correlatedAlerts: { time: string; source: string; severity: string; desc: string }[];
}

const blastRadiusMap: Record<string, BlastRadiusData> = {
  INC0012815: {
    source: { name: "prod-mid-07", type: "server", status: "affected", alerts: ["MID Server Upgrade Failed", "ECC Queue stalled — 34 tasks"] },
    downstream: [
      { name: "Discovery-London-DC", type: "service", status: "affected", alerts: ["Schedule timeout"] },
      { name: "CMDB Sync (London)", type: "database", status: "at-risk", alerts: ["Sync delay 12min"] },
      { name: "Event Mgmt Pipeline", type: "service", status: "at-risk" },
      { name: "prod-snow-instance", type: "cloud", status: "healthy" },
    ],
    correlatedAlerts: [
      { time: "10:18:04", source: "Windows Event Log", severity: "Error", desc: "AppLocker: Block — agent\\bin\\wrapper.exe replacement denied" },
      { time: "10:50:12", source: "ECC Queue Monitor", severity: "Warning", desc: "34 output records stuck in Ready state > 10min" },
      { time: "11:01:45", source: "Discovery Schedule", severity: "Error", desc: "London DC discovery schedule timeout — no MID Server response" },
      { time: "11:02:33", source: "ServiceNow Alert", severity: "Critical", desc: "INC0012815 auto created — MID Server version mismatch detected" },
    ],
  },
  INC0012823: {
    source: { name: "prod-mid-09", type: "server", status: "affected", alerts: ["Thread exhaustion 25/25", "JVM heap 87%"] },
    downstream: [
      { name: "Discovery-APAC-SG", type: "service", status: "affected", alerts: ["3 schedules timing out"] },
      { name: "Discovery-APAC-HK", type: "service", status: "affected", alerts: ["Schedule timeout"] },
      { name: "Discovery-APAC-TK", type: "service", status: "affected", alerts: ["Schedule timeout"] },
      { name: "JDBC-SAP-Integration", type: "database", status: "affected", alerts: ["7 queries queued"] },
      { name: "JDBC-Oracle-HR", type: "database", status: "at-risk", alerts: ["5 queries queued"] },
      { name: "LDAP-AD-Sync", type: "service", status: "at-risk" },
      { name: "CMDB Sync (APAC)", type: "database", status: "at-risk", alerts: ["Sync backlog growing"] },
      { name: "Event Mgmt Pipeline", type: "service", status: "healthy" },
    ],
    correlatedAlerts: [
      { time: "10:56:30", source: "JVM Monitor", severity: "Warning", desc: "Heap utilization at 87% (1.74GB/2GB) — approaching OOM" },
      { time: "10:58:15", source: "Thread Monitor", severity: "Critical", desc: "All 25 threads busy — no capacity for new tasks" },
      { time: "11:02:00", source: "ECC Queue Monitor", severity: "Critical", desc: "247 records stuck in Ready — oldest 12 min" },
      { time: "11:04:22", source: "Discovery Schedule", severity: "Error", desc: "APAC-SG, APAC-HK, APAC-TK schedules all timed out" },
      { time: "11:06:18", source: "Network Monitor", severity: "Warning", desc: "RTT to APAC targets avg 340ms (baseline 80ms)" },
      { time: "11:08:15", source: "ServiceNow Alert", severity: "Critical", desc: "INC0012823 auto created — ECC Queue backlog critical" },
    ],
  },
  INC0012798: {
    source: { name: "gateway-lb-01", type: "network", status: "affected", alerts: ["Port 443 blocked"] },
    downstream: [
      { name: "payment-api", type: "service", status: "affected", alerts: ["HTTPS unreachable"] },
      { name: "checkout-web", type: "service", status: "affected", alerts: ["502 errors"] },
      { name: "mobile-gateway", type: "service", status: "affected", alerts: ["Connection refused"] },
    ],
    correlatedAlerts: [
      { time: "10:35:00", source: "Firewall Audit", severity: "Warning", desc: "Rule ACL-4821 modified by net-admin-02" },
      { time: "10:36:12", source: "Port Scanner", severity: "Critical", desc: "Port 443 unreachable from external network" },
      { time: "10:37:30", source: "APM", severity: "Error", desc: "payment-api, checkout-web returning 502" },
    ],
  },
  INC0012801: {
    source: { name: "auth-service-pod-7f8d4", type: "service", status: "affected", alerts: ["OOMKilled (exit 137)"] },
    downstream: [
      { name: "auth-service (12 pods)", type: "service", status: "at-risk", alerts: ["2/3 replicas high memory"] },
      { name: "user-session-store", type: "database", status: "healthy" },
      { name: "api-gateway", type: "network", status: "healthy" },
    ],
    correlatedAlerts: [
      { time: "10:42:00", source: "K8s Events", severity: "Critical", desc: "OOMKilled — container exceeded 512Mi limit" },
      { time: "10:43:15", source: "K8s Events", severity: "Warning", desc: "Pod restarted 4 times in 30 min" },
    ],
  },
};

const typeIcons: Record<string, React.ReactNode> = {
  server: <Server size={14} />,
  service: <Activity size={14} />,
  database: <Database size={14} />,
  network: <Globe size={14} />,
  cloud: <Cloud size={14} />,
};

const statusColors: Record<string, string> = {
  affected: "border-destructive/60 bg-destructive/10",
  "at-risk": "border-warning/60 bg-warning/10",
  healthy: "border-success/40 bg-success/5",
};

const statusDots: Record<string, string> = {
  affected: "bg-destructive",
  "at-risk": "bg-warning",
  healthy: "bg-success",
};

export default function BlastRadiusModal({ incidentId, onClose }: { incidentId: string; onClose: () => void }) {
  const data = blastRadiusMap[incidentId];
  if (!data) return null;

  const affectedCount = data.downstream.filter(n => n.status === "affected").length;
  const atRiskCount = data.downstream.filter(n => n.status === "at-risk").length;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-[780px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            <h3 className="text-sm font-semibold">Impact Analysis — {incidentId}</h3>
            <StatusBadge variant="error" label={`${affectedCount} Affected`} />
            <StatusBadge variant="warning" label={`${atRiskCount} At Risk`} />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>

        <div className="p-5">
          {/* CMDB Dependency Map */}
          <h4 className="text-xs font-semibold text-foreground mb-3">CMDB Downstream CI Map</h4>
          <div className="flex items-start gap-3 mb-6">
            {/* Source CI */}
            <div className={`rounded-lg border-2 p-3 min-w-[160px] ${statusColors[data.source.status]}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${statusDots[data.source.status]}`} />
                {typeIcons[data.source.type]}
                <span className="text-xs font-semibold text-foreground">{data.source.name}</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{data.source.type} · Source CI</p>
              {data.source.alerts?.map((a, i) => (
                <div key={i} className="mt-1 text-[10px] text-destructive bg-destructive/10 rounded px-1.5 py-0.5">{a}</div>
              ))}
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center justify-center pt-6">
              <ArrowRight size={20} className="text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground mt-1">impacts</span>
            </div>

            {/* Downstream CIs */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {data.downstream.map((ci, i) => (
                <div key={i} className={`rounded-lg border p-2.5 ${statusColors[ci.status]}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDots[ci.status]}`} />
                    {typeIcons[ci.type]}
                    <span className="text-[11px] font-medium text-foreground">{ci.name}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{ci.type}</p>
                  {ci.alerts?.map((a, j) => (
                    <div key={j} className="mt-0.5 text-[9px] text-muted-foreground bg-secondary/80 rounded px-1.5 py-0.5">{a}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Correlated Alerts Timeline */}
          <h4 className="text-xs font-semibold text-foreground mb-3">Correlated Alerts Timeline</h4>
          <div className="bg-background/50 rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[80px_100px_70px_1fr] gap-2 px-3 py-2 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Time</span>
              <span>Source</span>
              <span>Severity</span>
              <span>Description</span>
            </div>
            {data.correlatedAlerts.map((alert, i) => (
              <div key={i} className="grid grid-cols-[80px_100px_70px_1fr] gap-2 px-3 py-2 border-b border-border/50 last:border-0 text-xs hover:bg-secondary/30">
                <span className="font-mono text-[10px] text-muted-foreground">{alert.time}</span>
                <span className="text-[10px] text-foreground">{alert.source}</span>
                <StatusBadge
                  variant={alert.severity === "Critical" ? "error" : alert.severity === "Error" ? "error" : "warning"}
                  label={alert.severity}
                />
                <span className="text-[10px] text-muted-foreground">{alert.desc}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 rounded-md bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
            <p className="font-medium text-warning mb-1">Impact Summary</p>
            <p>{affectedCount} CI(s) directly affected, {atRiskCount} CI(s) at risk of cascading failure. {data.correlatedAlerts.length} correlated alerts detected across monitoring systems.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { blastRadiusMap };
