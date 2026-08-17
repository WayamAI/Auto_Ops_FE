import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { CheckCircle, AlertOctagon, Eye, EyeOff, RotateCcw, Shield, Key, Clock, Bell, BellOff, Mail, MessageSquare, Users, UserCog, Trash2, Plus, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerConfig, useUpdateConfig } from "@/api/hooks";

const syncTable = [
  { type: "Incidents", dir: "Read", freq: "Real time (webhook)", last: "4s ago", active: true },
  { type: "CMDB", dir: "Read", freq: "Every 15 minutes", last: "12m ago", active: true },
  { type: "Changes", dir: "Read", freq: "Real time", last: "4s ago", active: true },
  { type: "Event Management", dir: "Read", freq: "Real time", last: "4s ago", active: true },
  { type: "MID Server Status", dir: "Read", freq: "Every 2 minutes", last: "1m 58s ago", active: true },
  { type: "ECC Queue Metrics", dir: "Read", freq: "Real time (polling 30s)", last: "28s ago", active: true },
  { type: "Assignment Groups", dir: "Read", freq: "Every 1 hour", last: "34m ago", active: true },
  { type: "Users & Teams", dir: "Read", freq: "Every 6 hours", last: "2h ago", active: true },
];

const writeBack = [
  { type: "Work Notes", enabled: true, desc: "Agent activity, RCA findings written to incident" },
  { type: "Resolution Notes", enabled: true, desc: "Full resolution summary on auto resolve" },
  { type: "Status Updates", enabled: true, desc: "In Progress, Resolved status changes" },
  { type: "Assignment Changes", enabled: true, desc: "When escalating to specific teams" },
  { type: "Change Request Creation", enabled: true, desc: "When remediation requires formal change" },
  { type: "MID Server Property Updates", enabled: true, desc: "JVM heap, thread pool config changes written to sys_properties" },
  { type: "Credential Record Updates", enabled: true, desc: "Updated credentials written to sys_credentials after rotation" },
];

const llmConfig = [
  { fn: "Root Cause Analysis", primary: "Primary Model", fallback: "Secondary Model", tokens: "4,096", latency: "2.3s" },
  { fn: "Remediation Planning", primary: "Secondary Model", fallback: "Primary Model", tokens: "2,048", latency: "1.8s" },
  { fn: "Execution", primary: "Primary Model", fallback: "Secondary Model", tokens: "2,048", latency: "1.5s" },
  { fn: "Validation", primary: "Secondary Model", fallback: "Primary Model", tokens: "1,024", latency: "1.2s" },
];

const credentialData = [
  { name: "ServiceNow OAuth", type: "OAuth 2.0", scope: "Incident, CMDB, Change", created: "2025-01-15", expires: "2026-01-15", status: "active" as const, lastUsed: "4s ago" },
  { name: "AWS Production", type: "IAM Role", scope: "EC2, S3, CloudWatch", created: "2025-02-20", expires: "2025-08-20", status: "active" as const, lastUsed: "12m ago" },
  { name: "Azure AD Service Principal", type: "Client Secret", scope: "VM, AKS, Monitor", created: "2025-03-01", expires: "2025-09-01", status: "active" as const, lastUsed: "1h ago" },
  { name: "Datadog API", type: "API Key", scope: "Metrics, Logs, APM", created: "2025-01-10", expires: "Never", status: "active" as const, lastUsed: "30s ago" },
  { name: "PagerDuty Integration", type: "API Key", scope: "Incidents, Services", created: "2024-11-05", expires: "2025-11-05", status: "active" as const, lastUsed: "5m ago" },
  { name: "GCP Legacy SA", type: "Service Account", scope: "GCE, GKE", created: "2024-06-12", expires: "2025-06-12", status: "expiring" as const, lastUsed: "3d ago" },
];

const notificationRules = [
  { event: "Agent Execution Started", channels: ["Slack", "Email"], severity: "Info", enabled: true },
  { event: "Approval Required", channels: ["Slack", "PagerDuty", "Email"], severity: "Warning", enabled: true },
  { event: "Execution Failed", channels: ["Slack", "PagerDuty", "Email"], severity: "Critical", enabled: true },
  { event: "Auto Resolution Completed", channels: ["Slack", "Email"], severity: "Info", enabled: true },
  { event: "Confidence Below Threshold", channels: ["Slack"], severity: "Warning", enabled: true },
  { event: "Emergency Stop Triggered", channels: ["Slack", "PagerDuty", "Email", "SMS"], severity: "Critical", enabled: true },
  { event: "New Pattern Discovered", channels: ["Email"], severity: "Info", enabled: false },
  { event: "Credential Expiry Warning", channels: ["Slack", "Email"], severity: "Warning", enabled: true },
];

const teamMembers = [
  { name: "Sarah Chen", email: "s.chen@company.com", role: "Platform Admin", lastActive: "2m ago", status: "online" },
  { name: "Marcus Johnson", email: "m.johnson@company.com", role: "Platform Admin", lastActive: "15m ago", status: "online" },
  { name: "Priya Patel", email: "p.patel@company.com", role: "Operator", lastActive: "1h ago", status: "online" },
  { name: "James Wilson", email: "j.wilson@company.com", role: "Operator", lastActive: "3h ago", status: "offline" },
  { name: "Aisha Rahman", email: "a.rahman@company.com", role: "Viewer", lastActive: "1d ago", status: "offline" },
  { name: "David Kim", email: "d.kim@company.com", role: "Viewer", lastActive: "5h ago", status: "offline" },
];

const auditLog = [
  { time: "2 min ago", user: "Sarah Chen", action: "Approved remediation for INC-8834", category: "Execution" },
  { time: "18 min ago", user: "System", action: "Auto rotated AWS Production credentials", category: "Security" },
  { time: "45 min ago", user: "Marcus Johnson", action: "Updated automation policy tier thresholds", category: "Configuration" },
  { time: "1h ago", user: "Priya Patel", action: "Triggered manual sync for CMDB data", category: "Integration" },
  { time: "2h ago", user: "System", action: "LLM fallback activated: Codestral → GPT-4o-mini", category: "System" },
  { time: "4h ago", user: "Sarah Chen", action: "Added new notification rule for pattern discovery", category: "Configuration" },
  { time: "6h ago", user: "System", action: "Daily credential health check completed — all valid", category: "Security" },
  { time: "12h ago", user: "James Wilson", action: "Exported monthly resolution analytics report", category: "Reporting" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ServiceNow Connection");
  const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>({});
  const [rotateDialog, setRotateDialog] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  const [rotating, setRotating] = useState(false);
  const [notifStates, setNotifStates] = useState<Record<number, boolean>>(
    Object.fromEntries(notificationRules.map((r, i) => [i, r.enabled]))
  );
  const [testNotifDialog, setTestNotifDialog] = useState(false);

  // Fetch server config from backend API
  const { data: serverConfig } = useServerConfig();
  const updateConfigMutation = useUpdateConfig();

  const handleSaveConfig = (field: string, value: number) => {
    updateConfigMutation.mutate({ [field]: value }, {
      onSuccess: () => toast.success("Configuration saved"),
      onError: () => toast.error("Failed to save configuration"),
    });
  };

  const tabs = ["ServiceNow Connection", "Automation Policies", "LLM Configuration", "Credential Vault", "Notifications", "Administration"];

  const toggleSecret = (idx: number) => {
    setVisibleSecrets(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleRotate = () => {
    setRotating(true);
    setTimeout(() => {
      setRotating(false);
      setRotateDialog({ open: false, name: "" });
      toast.success("Credential rotated successfully", { description: "New credentials are active and verified." });
    }, 2000);
  };

  const handleToggleNotif = (idx: number) => {
    setNotifStates(prev => {
      const next = { ...prev, [idx]: !prev[idx] };
      toast.success(next[idx] ? "Notification enabled" : "Notification disabled", {
        description: notificationRules[idx].event,
      });
      return next;
    });
  };

  const severityColor = (s: string) => {
    if (s === "Critical") return "text-destructive";
    if (s === "Warning") return "text-warning";
    return "text-info";
  };

  const channelIcon = (ch: string) => {
    if (ch === "Email") return <Mail size={10} />;
    if (ch === "Slack") return <MessageSquare size={10} />;
    if (ch === "PagerDuty") return <Bell size={10} />;
    return <Bell size={10} />;
  };

  return (
    <AppLayout title="Settings" subtitle="Platform configuration">
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── ServiceNow Connection ── */}
      {activeTab === "ServiceNow Connection" && (
        <div className="space-y-6">
      <div className="bg-card rounded-md border border-border/40 p-5 space-y-5 shadow-sm">
            <h3 className="text-sm font-semibold">Connection</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Instance URL</label>
                <div className="flex items-center gap-2">
                  <input value="https://company.service-now.com" readOnly className="h-8 flex-1 rounded-md bg-secondary border border-border px-3 text-xs text-foreground" />
                  <CheckCircle size={14} className="text-success" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Authentication</label>
                <select className="h-8 w-full rounded-md bg-secondary border border-border px-3 text-xs text-foreground">
                  <option>OAuth 2.0</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge variant="active" />
              <span className="text-xs text-muted-foreground">Last sync: 4 seconds ago</span>
              <button onClick={() => toast.success("Connection verified", { description: "ServiceNow instance is reachable and authenticated." })} className="h-7 px-3 rounded text-[10px] font-medium border border-success/30 text-success hover:bg-success/10 ml-auto">Test Connection</button>
            </div>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Sync Configuration</h3></div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Data Type</th><th className="px-4 py-2 text-left">Direction</th><th className="px-4 py-2 text-left">Frequency</th><th className="px-4 py-2 text-left">Last Sync</th><th className="px-4 py-2 text-left">Status</th>
              </tr></thead>
              <tbody>
                {syncTable.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2 text-xs text-foreground">{r.type}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.dir}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.freq}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.last}</td>
                    <td className="px-4 py-2"><span className="text-success text-xs">✓ Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Write Back Configuration</h3></div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Enabled</th><th className="px-4 py-2 text-left">Description</th>
              </tr></thead>
              <tbody>
                {writeBack.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2 text-xs text-foreground">{r.type}</td>
                    <td className="px-4 py-2"><span className="text-success text-xs">✓ On</span></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Automation Policies ── */}
      {activeTab === "Automation Policies" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-success/30 bg-success/5 p-4">
            <h3 className="text-sm font-semibold text-success mb-2">Tier 1 — Fully Autonomous</h3>
            <p className="text-xs text-muted-foreground mb-2">Agent executes without approval when ALL conditions met:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Confidence threshold: <span className="text-foreground font-medium">85%</span></li>
              <li>• Risk level: <span className="text-foreground font-medium">Low only</span></li>
              <li>• Environment: <span className="text-success">✓ Non Production</span> · <span className="text-destructive">✗ Production</span></li>
              <li>• Change freeze: <span className="text-foreground font-medium">Never</span></li>
            </ul>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <h3 className="text-sm font-semibold text-warning mb-2">Tier 2 — Human Approved</h3>
            <p className="text-xs text-muted-foreground mb-2">Agent prepares action and requests approval when:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Confidence: <span className="text-foreground font-medium">60% — 85%</span></li>
              <li>• OR Risk level: <span className="text-foreground font-medium">Medium</span></li>
              <li>• OR Environment: <span className="text-foreground font-medium">Production</span></li>
            </ul>
          </div>
          <div className="rounded-lg border border-info/30 bg-info/5 p-4">
            <h3 className="text-sm font-semibold text-info mb-2">Tier 3 — Recommend Only</h3>
            <p className="text-xs text-muted-foreground mb-2">Agent provides analysis only when:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Confidence: <span className="text-foreground font-medium">Below 60%</span></li>
              <li>• OR Risk: <span className="text-foreground font-medium">High</span></li>
              <li>• OR During change freeze</li>
              <li>• OR Novel incident (no matching pattern)</li>
            </ul>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
            <AlertOctagon size={20} className="text-destructive shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-destructive">EMERGENCY STOP</h3>
              <p className="text-xs text-muted-foreground">System Normal — All agents operating within policy</p>
            </div>
            <button onClick={() => toast.error("Emergency halt simulation", { description: "In production, all agents would be immediately suspended." })} className="h-8 px-4 rounded text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90">HALT ALL AGENTS</button>
          </div>
        </div>
      )}

      {/* ── LLM Configuration ── */}
      {activeTab === "LLM Configuration" && (
        <div className="space-y-6">
          {/* Runtime Config from Backend API */}
          {serverConfig && (
            <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Runtime Configuration <span className="text-[10px] text-success font-normal tracking-normal ml-2">● Connected to backend</span></h3></div>
              <div className="grid grid-cols-2 gap-4 p-4">
                {[
                  { label: "Monitor Poll Interval", field: "monitor_poll_interval", value: serverConfig.monitor_poll_interval, unit: "s" },
                  { label: "Orchestrator Poll Interval", field: "orchestrator_poll_interval", value: serverConfig.orchestrator_poll_interval, unit: "s" },
                  { label: "Max Incident Retries", field: "max_incident_retries", value: serverConfig.max_incident_retries, unit: "" },
                  { label: "Max Tool Iterations", field: "max_tool_iterations", value: serverConfig.max_tool_iterations, unit: "" },
                ].map((cfg) => (
                  <div key={cfg.field} className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">
                    <div>
                      <p className="text-xs font-medium text-foreground">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground">{cfg.value}{cfg.unit}</p>
                    </div>
                    <input
                      type="number"
                      defaultValue={cfg.value}
                      min={1}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > 0 && val !== cfg.value) handleSaveConfig(cfg.field, val);
                      }}
                      className="w-16 h-7 rounded bg-secondary border border-border px-2 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-md bg-secondary/50 border border-border">
                  <p className="text-xs font-medium text-foreground">Primary Model Deployment</p>
                  <p className="text-xs font-mono text-info">{serverConfig.primary_model_deployment}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50 border border-border">
                  <p className="text-xs font-medium text-foreground">Secondary Model Deployment</p>
                  <p className="text-xs font-mono text-info">{serverConfig.secondary_model_deployment}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Model Selection</h3></div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Function</th><th className="px-4 py-2 text-left">Primary</th><th className="px-4 py-2 text-left">Fallback</th><th className="px-4 py-2 text-right">Tokens</th><th className="px-4 py-2 text-right">Latency</th>
              </tr></thead>
              <tbody>
                {llmConfig.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2 text-xs text-foreground">{r.fn}</td>
                    <td className="px-4 py-2 text-xs font-mono text-info">{serverConfig ? (r.fn.includes("Root Cause") || r.fn.includes("Execution") ? serverConfig.primary_model_deployment : serverConfig.secondary_model_deployment) : r.primary}</td>
                    <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{r.fallback}</td>
                    <td className="px-4 py-2 text-xs text-right text-muted-foreground">{r.tokens}</td>
                    <td className="px-4 py-2 text-xs text-right text-muted-foreground">{r.latency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Token Budget</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-info rounded-full" style={{ width: "48%" }} />
              </div>
              <span className="text-xs text-muted-foreground">2.4M / 5M (48%)</span>
            </div>
            <p className="text-xs text-muted-foreground">$342 spent this month on LLM API calls</p>
          </div>
        </div>
      )}

      {/* ── Credential Vault ── */}
      {activeTab === "Credential Vault" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-info" />
              <span className="text-xs text-muted-foreground">All credentials encrypted at rest with AES-256 · Last audit: 6h ago</span>
            </div>
            <button onClick={() => toast.info("Add Credential wizard would open here.")} className="h-7 px-3 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5">
              <Plus size={12} /> Add Credential
            </button>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Scope</th>
                <th className="px-4 py-2 text-left">Expires</th>
                <th className="px-4 py-2 text-left">Last Used</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {credentialData.map((c, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Key size={12} className="text-muted-foreground" />
                        <span className="text-xs text-foreground font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{c.type}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {visibleSecrets[i] ? c.scope : "••••••••••"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs ${c.status === "expiring" ? "text-warning font-medium" : "text-muted-foreground"}`}>
                        {c.expires}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{c.lastUsed}</td>
                    <td className="px-4 py-2">
                      {c.status === "active" ? (
                        <span className="text-success text-xs flex items-center gap-1"><CheckCircle size={10} /> Active</span>
                      ) : (
                        <span className="text-warning text-xs flex items-center gap-1"><Clock size={10} /> Expiring Soon</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggleSecret(i)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary" title="Toggle visibility">
                          {visibleSecrets[i] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${c.name}-token-xxxxx`); toast.success("Credential ID copied to clipboard"); }} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary" title="Copy ID">
                          <Copy size={12} />
                        </button>
                        <button onClick={() => setRotateDialog({ open: true, name: c.name })} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary" title="Rotate">
                          <RotateCcw size={12} />
                        </button>
                        <button onClick={() => toast.error("Cannot delete active credential", { description: "Detach from all agents first." })} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary" title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Rotation Policy</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Auto Rotation</span>
                <p className="text-foreground font-medium">Enabled — every 90 days</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Expiry Warning</span>
                <p className="text-foreground font-medium">30 days before expiration</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Failed Auth Lockout</span>
                <p className="text-foreground font-medium">After 5 consecutive failures</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {activeTab === "Notifications" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Slack: Connected</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">PagerDuty: Connected</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">SMTP: Verified</span>
              </div>
            </div>
            <button onClick={() => setTestNotifDialog(true)} className="h-7 px-3 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5">
              <Bell size={12} /> Send Test Notification
            </button>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Notification Rules</h3>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Event</th>
                <th className="px-4 py-2 text-left">Channels</th>
                <th className="px-4 py-2 text-left">Severity</th>
                <th className="px-4 py-2 text-center">Enabled</th>
              </tr></thead>
              <tbody>
                {notificationRules.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2 text-xs text-foreground">{r.event}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.channels.map(ch => (
                          <span key={ch} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground">
                            {channelIcon(ch)} {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${severityColor(r.severity)}`}>{r.severity}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => handleToggleNotif(i)} className={`h-5 w-9 rounded-full relative transition-colors ${notifStates[i] ? "bg-success" : "bg-muted/30"}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-slate-300 shadow transition-transform ${notifStates[i] ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Escalation Policy</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">No acknowledgement within</span>
                <span className="text-foreground font-medium">5 minutes → renotify + escalate to on call lead</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Approval timeout</span>
                <span className="text-foreground font-medium">15 minutes → notify backup approver</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Critical incident unresolved</span>
                <span className="text-foreground font-medium">30 minutes → page VP Engineering</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Administration ── */}
      {activeTab === "Administration" && (
        <div className="space-y-6">
          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Team Members</h3>
              <button onClick={() => toast.info("Invite flow would open here.")} className="h-7 px-3 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5">
                <Plus size={12} /> Invite Member
              </button>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Last Active</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr></thead>
              <tbody>
                {teamMembers.map((m, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                          {m.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-xs text-foreground">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{m.email}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${m.role === "Platform Admin" ? "text-info" : m.role === "Operator" ? "text-foreground" : "text-muted-foreground"}`}>
                        {m.role === "Platform Admin" && <UserCog size={10} className="inline mr-1" />}
                        {m.role === "Operator" && <Users size={10} className="inline mr-1" />}
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{m.lastActive}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs flex items-center gap-1 ${m.status === "online" ? "text-success" : "text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${m.status === "online" ? "bg-success" : "bg-muted-foreground"}`} />
                        {m.status === "online" ? "Online" : "Offline"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20 font-bold uppercase tracking-widest text-[10px] text-foreground/80">
              Audit Log
            </div>
            <div className="divide-y divide-border">
              {auditLog.map((entry, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">{entry.time}</span>
                  <span className="text-xs text-foreground font-medium w-28 shrink-0">{entry.user}</span>
                  <span className="text-xs text-muted-foreground flex-1">{entry.action}</span>
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground">{entry.category}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="bg-card rounded-md border border-border/40 p-5 space-y-2 shadow-sm">
              <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Platform Version</h4>
              <p className="text-sm font-mono text-foreground font-bold">v2.14.3-stable</p>
              <p className="text-[10px] text-muted-foreground/40 font-bold">Released Mar 22, 2026</p>
            </div>
            <div className="bg-card rounded-md border border-border/40 p-5 space-y-2 shadow-sm">
              <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Data Retention</h4>
              <p className="text-sm text-foreground font-bold">90 days (logs) · 1 year (audit)</p>
              <p className="text-[10px] text-muted-foreground/40 font-bold">Next purge: Apr 1, 2026</p>
            </div>
            <div className="bg-card rounded-md border border-border/40 p-5 space-y-2 shadow-sm">
              <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">SSO Provider</h4>
              <p className="text-sm text-foreground font-bold">Okta SAML 2.0</p>
              <p className="text-[10px] text-success font-bold uppercase tracking-widest">✓ Active · MFA Enforced</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Rotate Credential Dialog ── */}
      <Dialog open={rotateDialog.open} onOpenChange={(o) => setRotateDialog({ open: o, name: rotateDialog.name })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rotate Credential</DialogTitle>
            <DialogDescription>
              This will generate a new secret for <span className="font-medium text-foreground">{rotateDialog.name}</span> and invalidate the current one. All agents using this credential will be updated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-warning/10 border border-warning/30 p-3 text-xs text-warning">
            ⚠ Active sessions using this credential may be briefly interrupted during rotation.
          </div>
          <DialogFooter>
            <button onClick={() => setRotateDialog({ open: false, name: "" })} className="h-8 px-4 rounded text-xs border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={handleRotate} disabled={rotating} className="h-8 px-4 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
              {rotating ? <><RotateCcw size={12} className="animate-spin" /> Rotating...</> : <><RotateCcw size={12} /> Rotate Now</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Test Notification Dialog ── */}
      <Dialog open={testNotifDialog} onOpenChange={setTestNotifDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Send Test Notification</DialogTitle>
            <DialogDescription>A test notification will be sent to all connected channels to verify delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-success" /><span className="text-muted-foreground">Slack #ops-alerts</span></div>
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-success" /><span className="text-muted-foreground">PagerDuty (SRE Team)</span></div>
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-success" /><span className="text-muted-foreground">ops-team@company.com</span></div>
          </div>
          <DialogFooter>
            <button onClick={() => setTestNotifDialog(false)} className="h-8 px-4 rounded text-xs border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={() => { setTestNotifDialog(false); toast.success("Test notifications sent", { description: "Delivered to Slack, PagerDuty, and Email." }); }} className="h-8 px-4 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              Send Test
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
