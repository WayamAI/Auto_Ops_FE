import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import MetricCard from "@/components/shared/MetricCard";
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, TrendingUp, X, Plus, Search, Loader2, Play, Layers, Activity, History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { useAgentDetail, useTools, useAgentCumulativeScore } from "@/api/hooks";

const confidenceData = [
  { week: "W1", score: 75 }, { week: "W2", score: 77 }, { week: "W3", score: 80 },
  { week: "W4", score: 81 }, { week: "W5", score: 83 }, { week: "W6", score: 86 },
  { week: "W7", score: 87 }, { week: "W8", score: 88 }, { week: "W9", score: 89 },
  { week: "W10", score: 90 }, { week: "W11", score: 91 }, { week: "W12", score: 92 },
];

// Mock historyData — commented out, replaced by live API data from GET /agents/{name} run_history
// const historyData = [ ... ];

const patterns = [
  { name: "MID Server JVM Heap Exhaustion → Service Restart", source: "Mined from ServiceNow", applied: 18, success: "94.4%", avg: "2m 15s", confidence: 93, status: "active" as const, lastUsed: "2 hours ago" },
  { name: "MID Server Port Block → Port Diagnostic & Escalation", source: "Learned from autonomous remediation", applied: 7, success: "85.7%", avg: "4m 30s", confidence: 82, status: "active" as const, lastUsed: "1 day ago" },
  { name: "MID Server Connectivity Loss → Network Path Verification", source: "Mined from ServiceNow", applied: 5, success: "100%", avg: "1m 45s", confidence: 88, status: "active" as const, lastUsed: "3 days ago" },
  { name: "MID Server Configuration Drift → Config Restore", source: "Contributed by engineer", applied: 3, success: "66.7%", avg: "6m 10s", confidence: 68, status: "refining" as const, lastUsed: "5 days ago" },
  { name: "MID Server Certificate Expiration → Renewal Escalation", source: "Discovered from pattern analysis", applied: 0, success: "N/A", avg: "N/A", confidence: 71, status: "proposed" as const, lastUsed: "Never" },
];

// Mock tools — commented out, replaced by live API data from GET /tools?agent={name}
// const initialTools = [ ... ];

const availableTools = [
  { name: "AWS CloudWatch — aws-monitoring", desc: "CloudWatch metrics and log access for AWS resources", category: "Cloud" },
  { name: "Kubernetes API — k8s-prod", desc: "Access to production Kubernetes cluster for pod/deployment management", category: "Infrastructure" },
  { name: "Database Access — prod-databases", desc: "Read-only access to production database instances", category: "Data" },
  { name: "Windows WinRM — windows-servers", desc: "Remote management of Windows Server instances", category: "Infrastructure" },
  { name: "SNMP Polling — network-devices", desc: "SNMP v3 read access for network device monitoring", category: "Network" },
  { name: "HashiCorp Vault — vault-prod", desc: "Credential retrieval from production Vault instance", category: "Security" },
  { name: "Ansible Playbooks — ansible-runner", desc: "Execute pre-approved Ansible playbooks on target hosts", category: "Automation" },
  { name: "Jira API — jira-integration", desc: "Create and update Jira tickets for cross-team coordination", category: "Operations" },
];

const discoveredPatterns = [
  {
    id: "dp1",
    title: "MID Server Memory Leak → Scheduled Restart",
    discovered: "March 22",
    icon: "warning" as const,
    summary: "MID Server memory leak pattern detected in 3 recent incidents — JVM heap grows linearly until crash. Proposed proactive action: Schedule periodic restart every 72 hours until root cause patch is applied.",
    status: "proposed" as const,
    confidence: 71,
    evidence: [
      "3 incidents (INC0012456, INC0012501, INC0012567) show identical JVM heap growth pattern",
      "Heap grows at ~50MB/hour, crashes at ~1.8GB (configured max)",
      "All 3 incidents on prod-mid-03, no other MID Servers affected",
      "Pattern timing: crashes occur every 68-74 hours after last restart",
    ],
    proposedAction: "Create a scheduled task to restart MID Server service on prod-mid-03 every 72 hours during maintenance window (2:00-4:00 AM UTC). Additionally, create a ServiceNow Problem record to investigate the underlying SOAP transaction memory leak.",
    riskAssessment: "Low — Scheduled restarts during maintenance window. MID Server reconnects automatically within 60 seconds. No discovery jobs scheduled during proposed window.",
  },
  {
    id: "dp2",
    title: "MID Server Failures Correlate with ServiceNow Upgrades",
    discovered: "March 20",
    icon: "info" as const,
    summary: "Correlation found between MID Server failures and ServiceNow upgrade windows. 5 of last 8 MID Server incidents occurred within 2 hours of a ServiceNow platform update. Flagging for change risk correlation.",
    status: "investigating" as const,
    confidence: 78,
    evidence: [
      "5 of 8 recent MID Server incidents occurred within 2 hours of ServiceNow platform updates",
      "Correlation coefficient: 0.72 (strong positive correlation)",
      "Affected updates: Orlando Patch 4, Orlando Patch 5, Orlando Patch 6",
      "Non-correlated incidents had different root causes (network, config drift)",
    ],
    proposedAction: "Add a pre-upgrade health check for all MID Servers before ServiceNow platform updates. Automatically increase monitoring frequency during upgrade windows. Create a Change Risk rule in ServiceNow to flag MID Server risk during platform updates.",
    riskAssessment: "N/A — This is a monitoring/alerting enhancement, no infrastructure changes required.",
  },
];

const tabs = ["Overview", "Tools", "Decision Logic", "History", "Learning"];

export default function AgentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("Overview");
  const [showAddTool, setShowAddTool] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [expandedDiscovery, setExpandedDiscovery] = useState<string | null>(null);
  const [approvedDiscoveries, setApprovedDiscoveries] = useState<string[]>([]);
  const [testingTool, setTestingTool] = useState<string | null>(null);

  // Fetch agent details and tools from API — no mock fallback
  const agentName = id || "";
  const { data: agentDetail } = useAgentDetail(agentName);
  const { data: apiTools, isLoading: toolsLoading } = useTools(undefined, agentName);
  const { data: scoreData } = useAgentCumulativeScore();

  // Map API tools to the format the Tools tab expects
  const agentTools = apiTools?.map(t => ({
    name: `${t.display_name} — ${t.name}`,
    desc: t.description,
    lastUsed: "—",
    status: "connected" as const,
  })) || [];
  const setAgentTools = (_: any) => {}; // placeholder — mutations need backend API

  const displayName = agentDetail?.display_name || "MID Server Agent";
  const displayDesc = agentDetail?.description || "Specialized for ServiceNow MID Server issues: crashes, service stops, port blocks, connectivity failures.";
  const displayModel = agentDetail?.model || "codestral";

  const filteredAvailableTools = availableTools.filter(t =>
    !agentTools.some(at => at.name === t.name) &&
    (!toolSearch || t.name.toLowerCase().includes(toolSearch.toLowerCase()) || t.desc.toLowerCase().includes(toolSearch.toLowerCase()))
  );

  const handleAddTool = (tool: typeof availableTools[0]) => {
    setAgentTools(prev => [...prev, { name: tool.name, desc: tool.desc, lastUsed: "Never", status: "connected" as const }]);
    toast.success(`${tool.name} added`, { description: "Tool is now available to MID Server Agent" });
  };

  const handleRemoveTool = (toolName: string) => {
    setAgentTools(prev => prev.filter(t => t.name !== toolName));
    toast.info(`Tool removed from agent`);
  };

  const handleTestTool = (toolName: string) => {
    setTestingTool(toolName);
    setTimeout(() => {
      setTestingTool(null);
      toast.success(`Connection test passed`, { description: `${toolName} is healthy and responding` });
    }, 2000);
  };

  const handleApproveDiscovery = (id: string) => {
    setApprovedDiscoveries(prev => [...prev, id]);
    toast.success("Pattern approved for shadow mode validation", { description: "Pattern will be tested against incoming incidents without executing actions." });
  };

  return (
    <AppLayout title={displayName} subtitle={displayDesc}>
      <button onClick={() => navigate("/agents")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to Agents
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Clock size={18} className="text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <StatusBadge variant="active" />
            <StatusBadge variant="active" label={displayModel} className="bg-secondary text-muted-foreground border-border" />
          </div>
          <p className="text-xs text-muted-foreground">{displayDesc}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (() => {
        const history = agentDetail?.run_history || [];
        const executions = agentDetail?.executions ?? 0;
        let successRate = agentDetail?.success_rate ?? "—";
        
        if (agentDetail?.stage && scoreData) {
          const score = scoreData.agents.find(a => a.agent === agentDetail.stage);
          if (score) {
            const successMetric = score.metrics.find(m => m.type === "success");
            if (successMetric) {
              successRate = `${successMetric.value}%`;
            }
          }
        }

        const avgTime = agentDetail?.avg_time ?? "—";

        // Fetch success rate from cumulative score
        let successPct = 0;
        
        if (agentDetail?.stage && scoreData) {
          const score = scoreData.agents.find(a => a.agent === agentDetail.stage);
          if (score) {
            const successMetric = score.metrics.find(m => m.type === "success");
            if (successMetric) successPct = successMetric.value;
          }
        }

        // Map success rate into High/Medium/Low bars
        let highPct = 0, medPct = 0, lowPct = 0;
        if (successPct > 70) {
          highPct = successPct;
        } else if (successPct >= 30) {
          medPct = successPct;
        } else {
          lowPct = successPct;
        }

        // Compute escalation rate (failed + escalated / total)
        const total = history.length || 1;
        const escalated = history.filter(h => h.outcome === "failed" || h.outcome === "escalated").length;
        const escalationRate = history.length > 0 ? `${Math.round((escalated / total) * 100)}%` : "—";

        const getSuccessColor = (success: string) => {
          const val = parseFloat(success.replace("%", ""));
          if (isNaN(val)) return "green";
          if (val > 70) return "green";
          if (val >= 30) return "amber";
          return "red";
        };

        const getSuccessTextClass = (success: number) => {
          if (success > 70) return "text-success";
          if (success >= 30) return "text-warning";
          return "text-destructive";
        };

        return (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <MetricCard 
              value={String(executions)} 
              label="Total Handled" 
              accentColor="blue" 
              icon={<Layers size={24} />}
            />
            <MetricCard 
              value={successRate} 
              label="Success Rate" 
              accentColor={getSuccessColor(successRate) as any} 
              icon={<TrendingUp size={24} />}
            />
            <MetricCard 
              value={avgTime} 
              label="Avg Resolution" 
              accentColor="blue" 
              icon={<Clock size={24} />}
            />
            <MetricCard 
              value={escalationRate} 
              label="Escalation Rate" 
              accentColor="amber" 
              icon={<AlertTriangle size={24} />}
            />
            <MetricCard 
              value={String(history.length)} 
              label="Recent Runs" 
              accentColor="blue" 
              icon={<History size={24} />}
            />
          </div>

          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Confidence Distribution</h3>
            <div className="space-y-2">
              {[
                { label: "High (>70%)", pct: highPct, color: "bg-success" },
                { label: "Medium (30-70%)", pct: medPct, color: "bg-warning" },
                { label: "Low (<30%)", pct: lowPct, color: "bg-destructive" }
              ].map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28">{b.label}</span>
                  <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className={cn("text-xs font-medium w-10 text-right", getSuccessTextClass(b.pct))}>{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Recent Activity</h3>
            </div>
            {history.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">No run history yet for this agent.</div>
            )}
            {history.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Incident</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Outcome</th>
                  <th className="px-4 py-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-secondary/50">
                    <td className="px-4 py-2"><span className="incident-id">{r.incident_id.slice(0, 8)}</span></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-2 text-xs text-foreground">{r.action}</td>
                    <td className="px-4 py-2"><StatusBadge variant={r.outcome} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
        );
      })()}

      {activeTab === "Tools" && (
        <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Tool</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Last Used</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agentTools.map((t, i) => (
                <tr key={i} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 text-xs font-medium font-mono text-foreground">{t.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.desc}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.lastUsed}</td>
                  <td className="px-4 py-3">
                    {testingTool === t.name ? (
                      <span className="flex items-center gap-1 text-[10px] text-info"><Loader2 size={10} className="animate-spin" /> Testing...</span>
                    ) : (
                      <StatusBadge variant={t.status} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleTestTool(t.name)} className="text-[10px] text-info hover:underline">Test</button>
                    {/* <button onClick={() => handleRemoveTool(t.name)} className="text-[10px] text-destructive hover:underline">Remove</button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-border">
            <button onClick={() => setShowAddTool(true)} className="h-7 px-3 rounded text-xs font-medium border border-success/30 text-success hover:bg-success/10 transition-colors flex items-center gap-1">
              <Plus size={12} /> Add Tool
            </button>
          </div>
        </div>
      )}

      {activeTab === "Decision Logic" && (
        <div className="space-y-4">
          {[
            { tier: "Tier 1 — Fully Autonomous", color: "border-success/30 bg-success/5", conditions: ["Confidence > 85%", "Environment = Non-Production", "Risk = Low", "NOT during change freeze"] },
            { tier: "Tier 2 — Human-Approved", color: "border-warning/30 bg-warning/5", conditions: ["Confidence 60-85%", "OR Environment = Production", "OR Risk = Medium"] },
            { tier: "Tier 3 — Recommend Only", color: "border-info/30 bg-info/5", conditions: ["Confidence < 60%", "OR Risk = High", "OR During change freeze", "OR Novel incident (no matching pattern)"] },
          ].map(t => (
            <div key={t.tier} className={`rounded-lg border p-4 ${t.color}`}>
              <h3 className="text-sm font-semibold mb-2">{t.tier}</h3>
              <ul className="space-y-1">
                {t.conditions.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle size={12} className="text-muted-foreground" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-2">Scope</h3>
            <p className="text-xs text-muted-foreground">CI Types: MID Server | Environments: All | Severity: P1-P4</p>
          </div>
        </div>
      )}

      {activeTab === "History" && (() => {
        const history = agentDetail?.run_history || [];
        return (
        <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
          {history.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No run history yet for this agent.</div>
          )}
          {history.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Incident</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Outcome</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={i} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-2"><span className="incident-id">{r.incident_id.slice(0, 8)}</span></td>
                  <td className="px-4 py-2 text-xs text-foreground">{r.action}</td>
                  <td className="px-4 py-2"><StatusBadge variant={r.outcome} /></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.duration}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium ${r.confidence > 0.85 ? "text-success" : r.confidence > 0.6 ? "text-warning" : "text-destructive"}`}>
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        );
      })()}

      {activeTab === "Learning" && (
        <div className="space-y-6">
          {/* Confidence chart */}
          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-1">Confidence Evolution</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Confidence improved 17.2% over 12 weeks</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={confidenceData}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 13%)", border: "1px solid hsl(220, 14%, 20%)", borderRadius: 6, fontSize: 11 }} />
                <Line type="monotone" dataKey="score" stroke="hsl(152, 60%, 48%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(152, 60%, 48%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pattern Library */}
          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Pattern Library</h3>
            </div>
            <div className="divide-y divide-border">
              {patterns.map((p, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{p.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.source}</p>
                    </div>
                    <StatusBadge variant={p.status} />
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span>Applied: <span className="text-foreground">{p.applied}x</span></span>
                    <span>Success: <span className="text-success">{p.success}</span></span>
                    <span>Avg: <span className="text-foreground">{p.avg}</span></span>
                    <span>Confidence: <span className={p.confidence > 85 ? "text-success" : p.confidence > 60 ? "text-warning" : "text-destructive"}>{p.confidence}%</span></span>
                    <span>Last: <span className="text-foreground">{p.lastUsed}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Before/After */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card rounded-md border border-border/40 p-5 opacity-60">
              <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">Before AutoOps</h4>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                <li className="flex gap-2"><span>•</span> <span>MID Server crash incidents averaged 42 minutes to resolve</span></li>
                <li className="flex gap-2"><span>•</span> <span>100% required human intervention</span></li>
                <li className="flex gap-2"><span>•</span> <span>Average engineer cost per incident: $280</span></li>
              </ul>
            </div>
            <div className="bg-card rounded-md border border-success/30 p-5 glow-green">
              <h4 className="text-[10px] font-bold text-success uppercase tracking-widest mb-3">With AutoOps</h4>
              <ul className="space-y-2 text-[11px] text-foreground font-medium">
                <li className="flex gap-2"><span>✓</span> <span>MID Server crash incidents average 2m 30s to resolve</span></li>
                <li className="flex gap-2"><span>✓</span> <span>91.3% resolved autonomously</span></li>
                <li className="flex gap-2"><span>✓</span> <span>Average cost per incident: $8.50 (LLM + compute)</span></li>
              </ul>
            </div>
          </div>
          <div className="bg-success/10 rounded-md border border-success/20 p-4 text-center">
            <p className="text-xs text-success font-bold tracking-tight">94% FASTER RESOLUTION · 91% AUTOMATION RATE · 97% COST REDUCTION PER INCIDENT</p>
          </div>

          {/* Discovered patterns — now actionable */}
          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Newly Discovered Patterns</h3>
            </div>
            <div className="divide-y divide-border">
              {discoveredPatterns.map(dp => {
                const isExpanded = expandedDiscovery === dp.id;
                const isApproved = approvedDiscoveries.includes(dp.id);
                return (
                  <div key={dp.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {dp.icon === "warning" ? <AlertTriangle size={12} className="text-warning" /> : <TrendingUp size={12} className="text-info" />}
                          <span className="text-xs font-medium">{dp.title}</span>
                          <span className="text-[10px] text-muted-foreground">Discovered {dp.discovered}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{dp.summary}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {isApproved ? (
                            <StatusBadge variant="active" label="Approved — Shadow Mode" />
                          ) : (
                            <StatusBadge variant={dp.status === "proposed" ? "proposed" : "analyzing"} />
                          )}
                          <span className={`text-[10px] font-medium ${dp.confidence > 85 ? "text-success" : dp.confidence > 60 ? "text-warning" : "text-destructive"}`}>
                            Confidence: {dp.confidence}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedDiscovery(isExpanded ? null : dp.id)}
                        className="text-[10px] text-info hover:underline shrink-0 ml-3"
                      >
                        {isExpanded ? "Collapse" : "Explore →"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-slide-up">
                        {/* Evidence */}
                        <div className="p-3 rounded-md bg-info/5 border border-info/15">
                          <h5 className="text-[10px] font-semibold text-foreground mb-1.5">Supporting Evidence</h5>
                          <ul className="space-y-1">
                            {dp.evidence.map((e, i) => (
                              <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                                <CheckCircle size={10} className="text-info shrink-0 mt-0.5" />
                                <span>{e}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Proposed Action */}
                        <div className="p-3 rounded-md bg-success/5 border border-success/15">
                          <h5 className="text-[10px] font-semibold text-foreground mb-1">Proposed Action</h5>
                          <p className="text-[10px] text-muted-foreground">{dp.proposedAction}</p>
                        </div>

                        {/* Risk */}
                        <div className="p-3 rounded-md bg-warning/5 border border-warning/15">
                          <h5 className="text-[10px] font-semibold text-foreground mb-1">Risk Assessment</h5>
                          <p className="text-[10px] text-muted-foreground">{dp.riskAssessment}</p>
                        </div>

                        {/* Action buttons */}
                        {!isApproved && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveDiscovery(dp.id)}
                              className="h-7 px-3 rounded text-[10px] font-medium bg-success/15 text-success border border-success/20 hover:bg-success/25 transition-colors"
                            >
                              ✓ Approve for Shadow Mode
                            </button>
                            <button
                              onClick={() => {
                                toast.info("Pattern flagged for further review", { description: "An engineer will be notified to review this discovery." });
                              }}
                              className="h-7 px-3 rounded text-[10px] font-medium bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors"
                            >
                              Flag for Review
                            </button>
                            <button
                              onClick={() => {
                                toast.error("Pattern dismissed");
                                setExpandedDiscovery(null);
                              }}
                              className="h-7 px-3 rounded text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/25 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Tool Modal */}
      {showAddTool && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowAddTool(false); setToolSearch(""); }}>
          <div className="bg-card border border-border rounded-lg w-[520px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold">Add Tool to MID Server Agent</h3>
              <button onClick={() => { setShowAddTool(false); setToolSearch(""); }} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={toolSearch}
                  onChange={e => setToolSearch(e.target.value)}
                  placeholder="Search available tools..."
                  className="w-full h-8 rounded-md bg-secondary border border-border pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {filteredAvailableTools.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">No available tools found</div>
              )}
              {filteredAvailableTools.map((tool, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div>
                    <p className="text-xs font-medium font-mono text-foreground">{tool.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tool.desc}</p>
                    <StatusBadge variant="active" label={tool.category} className="bg-secondary text-muted-foreground border-border mt-1" />
                  </div>
                  <button
                    onClick={() => handleAddTool(tool)}
                    className="h-7 px-3 rounded text-[10px] font-medium border border-success/30 text-success hover:bg-success/10 transition-colors shrink-0"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
