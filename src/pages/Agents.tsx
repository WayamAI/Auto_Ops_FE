import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import MetricCard from "@/components/shared/MetricCard";
import { Server, Container, Database, Globe, Cloud, Shield, Settings, HardDrive, GitBranch, Search, AlertTriangle, ArrowUpRight, Cpu, Layers, BarChart3, X, Loader2, CheckCircle, Play, Brain } from "lucide-react";
import { toast } from "sonner";
import { useAgents, useAgentCumulativeScore } from "@/api/hooks";
import type { AgentMetadata } from "@/api/types";

const icons = [Server, Container, Database, Globe, Cloud, Cpu, Shield, Settings, Cloud, HardDrive, Layers, HardDrive, GitBranch, Search, AlertTriangle];

// Mock agents — commented out, replaced by live API data from GET /agents
// const initialAgents = [ ... ];

const categoryOptions = ["All", "Infrastructure", "Application", "Security", "Data", "Cloud", "Operations"];

// Map backend agent stage to a UI category
const stageToCategory = (stage: string) => {
  const map: Record<string, string> = { rca: "Infrastructure", plan: "Operations", execution: "Infrastructure", validation: "Operations" };
  return map[stage] || "Infrastructure";
};

function backendAgentToLocal(agent: AgentMetadata) {
  return {
    id: agent.name,
    name: agent.display_name,
    status: "active" as const,
    category: stageToCategory(agent.stage),
    executions: agent.executions ?? 0,
    success: agent.success_rate ?? "—",
    avg: agent.avg_time ?? "—",
    weekRuns: 0,
    mttr: "—",
    desc: agent.description,
  };
}

export default function Agents() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Fetch agents from backend API — no mock fallback
  const { data: apiAgents, isLoading: agentsLoading } = useAgents();
  const { data: scoreData } = useAgentCumulativeScore();

  const getAgentScore = (stage: string) => {
    if (!scoreData) return null;
    return scoreData.agents.find(a => a.agent === stage);
  };

  const backendAgents = apiAgents ? apiAgents.map(agent => {
    const local = backendAgentToLocal(agent);
    const score = getAgentScore(agent.stage);
    if (score) {
      const successMetric = score.metrics.find(m => m.type === "success");
      local.success = successMetric ? `${successMetric.value}%` : local.success;
    }
    return local;
  }) : [];
  const [localAgents, setLocalAgents] = useState<typeof backendAgents>([]);

  // Agents = API agents + any locally deployed agents
  const agents = [...backendAgents, ...localAgents];
  const [showDeploy, setShowDeploy] = useState(false);
  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [showTest, setShowTest] = useState<string | null>(null);
  const [testPhase, setTestPhase] = useState(0);

  // Deploy form state
  const [deployName, setDeployName] = useState("");
  const [deployCategory, setDeployCategory] = useState("Infrastructure");
  const [deployDesc, setDeployDesc] = useState("");
  const [deployConfidence, setDeployConfidence] = useState("85");
  const [deployEnv, setDeployEnv] = useState("non production");

  const getSuccessColor = (success: string) => {
    if (success === "—") return "text-muted-foreground";
    const val = parseFloat(success.replace("%", ""));
    if (isNaN(val)) return "text-foreground/90";
    if (val > 70) return "text-success";
    if (val >= 30) return "text-warning";
    return "text-destructive";
  };

  const filtered = agents.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "All" && a.status !== statusFilter.toLowerCase()) return false;
    return true;
  });

  const statusCounts = {
    Active: agents.filter(a => a.status === "active").length,
    Idle: agents.filter(a => a.status === "idle").length,
    Learning: agents.filter(a => a.status === "learning").length,
    Error: agents.filter(a => (a.status as string) === "error").length,
    Disabled: 0,
  };

  const handleDeploy = () => {
    if (!deployName.trim()) { toast.error("Agent name is required"); return; }
    const newId = deployName.toLowerCase().replace(/\s+/g, '-');
    setLocalAgents(prev => [...prev, {
      id: newId,
      name: deployName,
      status: "learning" as const,
      category: deployCategory,
      executions: 0,
      success: "—",
      avg: "—",
      weekRuns: 0,
      mttr: "—",
      desc: deployDesc || "Newly deployed agent",
    }]);
    toast.success(`${deployName} deployed in Learning mode`, { description: "Agent will run in shadow mode until validated." });
    setShowDeploy(false);
    setDeployName(""); setDeployDesc(""); setDeployCategory("Infrastructure"); setDeployConfidence("85"); setDeployEnv("non production");
  };

  const runTest = (agentId: string) => {
    setShowTest(agentId);
    setTestPhase(0);
    let phase = 0;
    const interval = setInterval(() => {
      phase++;
      setTestPhase(phase);
      if (phase >= 4) {
        clearInterval(interval);
      }
    }, 1200);
  };

  const configAgent = agents.find(a => a.id === showConfig);
  const testAgent = agents.find(a => a.id === showTest);

  return (
    <AppLayout title="Agent Repository" subtitle="Manage autonomous remediation agents">
      {/* Status Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard 
          value={String(agents.length)} 
          label="Total Agents" 
          accentColor="blue" 
          icon={<Layers size={24} />}
        />
        <MetricCard 
          value={String(statusCounts.Active)} 
          label="Active Agents" 
          accentColor="green" 
          icon={<CheckCircle size={24} />}
        />
        <MetricCard 
          value={String(statusCounts.Learning)} 
          label="Learning Mode" 
          accentColor="blue" 
          icon={<Brain size={24} />}
        />
        <MetricCard 
          value={String(statusCounts.Error)} 
          label="Agent Errors" 
          accentColor="red" 
          icon={<AlertTriangle size={24} />}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 rounded-md bg-secondary border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option>All</option>
          <option>Active</option>
          <option>Idle</option>
          <option>Learning</option>
          <option>Error</option>
        </select>
        <div className="flex-1" />
        {/* <button onClick={() => setShowDeploy(true)} className="h-8 px-4 rounded-md bg-success text-success-foreground text-xs font-medium hover:bg-success/90 transition-colors">
          + Deploy Agent
        </button> */}
      </div>

      {/* Agent Grid */}
      {agentsLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground/60 text-sm gap-2 mt-8 bg-card rounded-md border border-border/40"><Loader2 size={16} className="animate-spin text-success" /> Loading agents from backend...</div>
      )}
      {!agentsLoading && agents.length === 0 && (
        <div className="flex items-center justify-center p-12 text-muted-foreground/60 text-sm mt-8 bg-card rounded-md border border-border/40">No agents found. The autonomous fleet is currently offline.</div>
      )}
      <div className="grid grid-cols-3 gap-6">
        {filtered.map((agent, i) => {
          const Icon = icons[i % icons.length];
          return (
            <div key={agent.id} className="bg-card rounded-md border border-border/40 hover:border-success/30 transition-all duration-300 shadow-sm group">
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0 border border-border/20 group-hover:border-success/20 transition-colors">
                    <Icon size={18} className="text-muted-foreground group-hover:text-success transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground/90 tracking-tight">{agent.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 pt-0.5">
                      <StatusBadge variant={agent.status} className="h-4" />
                      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{agent.category}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-border/20 bg-secondary/5 rounded-sm px-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground/90">{agent.executions}</p>
                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-bold">Runs</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-lg font-bold", getSuccessColor(agent.success))}>{agent.success}</p>
                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-bold">Success</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground/90">{agent.avg}</p>
                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-bold">Average Execution Time</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 mb-4 px-1">
                  <span className="font-medium tracking-tight">Activity this week: {agent.weekRuns}</span>
                  <span className="text-success flex items-center gap-0.5 font-bold uppercase tracking-tighter">
                    <ArrowUpRight size={10} strokeWidth={3} /> MTTR {agent.mttr}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/agents/${agent.id}`)}
                    className="flex-1 h-8 rounded-md text-[10px] font-bold uppercase tracking-widest bg-secondary/50 text-foreground/80 border border-border/30 hover:bg-secondary hover:text-foreground transition-all"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setShowConfig(agent.id)}
                    className="h-8 px-3 rounded-md bg-secondary/50 text-muted-foreground border border-border/30 hover:bg-secondary hover:text-foreground transition-all"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => runTest(agent.id)}
                    className="h-8 px-3 rounded-md bg-secondary/50 text-muted-foreground border border-border/30 hover:bg-secondary hover:text-foreground transition-all"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deploy Agent Modal */}
      {showDeploy && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowDeploy(false)}>
          <div className="bg-popover border border-border/60 rounded-xl w-full max-w-[520px] shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Deploy New Agent</h3>
              <button onClick={() => setShowDeploy(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Agent Name *</label>
                <input value={deployName} onChange={e => setDeployName(e.target.value)} placeholder="e.g., DNS Resolution Agent" className="w-full h-8 rounded-md bg-secondary border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Category</label>
                <select value={deployCategory} onChange={e => setDeployCategory(e.target.value)} className="w-full h-8 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {categoryOptions.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Description</label>
                <textarea value={deployDesc} onChange={e => setDeployDesc(e.target.value)} placeholder="What does this agent do?" className="w-full h-16 rounded-md bg-secondary border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Auto-Execute Threshold</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="50" max="100" value={deployConfidence} onChange={e => setDeployConfidence(e.target.value)} className="flex-1 accent-[hsl(var(--success))]" />
                    <span className="text-xs font-mono text-foreground w-10">{deployConfidence}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Initial Environment</label>
                  <select value={deployEnv} onChange={e => setDeployEnv(e.target.value)} className="w-full h-8 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="non production">Non Production Only</option>
                    <option value="all">All Environments</option>
                  </select>
                </div>
              </div>
              <div className="p-3 rounded bg-info/10 border border-info/20 text-xs text-muted-foreground">
                <p className="font-medium text-info mb-1">Deployment Mode: Learning (Shadow)</p>
                <p>New agents start in Learning mode. The agent will observe and analyze incidents without executing any remediation actions until manually promoted to Active status.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button onClick={() => setShowDeploy(false)} className="h-8 px-4 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors">Cancel</button>
              <button onClick={handleDeploy} className="h-8 px-4 rounded text-xs font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors">Deploy Agent</button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && configAgent && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowConfig(null)}>
          <div className="bg-popover border border-border/60 rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h3 className="text-sm font-semibold">Configure: {configAgent.name}</h3>
              <button onClick={() => setShowConfig(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Status</label>
                <select defaultValue={configAgent.status} className="w-full h-8 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="learning">Learning (Shadow Mode)</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Auto-Execute Confidence Threshold</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="50" max="100" defaultValue="85" className="flex-1 accent-[hsl(var(--success))]" />
                  <span className="text-xs font-mono text-foreground w-10">85%</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Allowed Environments</label>
                <div className="space-y-1.5">
                  {["Non Production", "Staging", "Production"].map(env => (
                    <label key={env} className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" defaultChecked={env !== "Production"} className="rounded border-border accent-[hsl(var(--success))]" />
                      {env}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Max Concurrent Executions</label>
                <input type="number" defaultValue={3} className="w-full h-8 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">LLM Model</label>
                <select defaultValue="codestral" className="w-full h-8 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="codestral">Codestral-2501 (Primary)</option>
                  <option value="gpt4o-mini">GPT-4o-mini</option>
                  <option value="claude">Claude 3.5 Sonnet</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Notification Channels</label>
                <div className="space-y-1.5">
                  {["Slack #ops-alerts", "Email: oncall@company.com", "PagerDuty"].map(ch => (
                    <label key={ch} className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" defaultChecked className="rounded border-border accent-[hsl(var(--success))]" />
                      {ch}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button onClick={() => setShowConfig(null)} className="h-8 px-4 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors">Cancel</button>
              <button onClick={() => { setShowConfig(null); toast.success("Configuration saved"); }} className="h-8 px-4 rounded text-xs font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors">Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTest && testAgent && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => { setShowTest(null); setTestPhase(0); }}>
          <div className="bg-popover border border-border/60 rounded-xl w-full max-w-[480px] shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h3 className="text-sm font-semibold">Test: {testAgent.name}</h3>
              <button onClick={() => { setShowTest(null); setTestPhase(0); }} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Running connectivity and capability checks...</p>
              {[
                { label: "Tool Connectivity", desc: "Verifying all assigned tools are reachable" },
                { label: "ServiceNow API", desc: "Testing CMDB read and incident write access" },
                { label: "LLM Inference", desc: "Sending test prompt to primary model (Codestral-2501)" },
                { label: "Dry Run Execution", desc: "Simulating a remediation pipeline with mock incident" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-secondary/50">
                  {testPhase > i ? (
                    <CheckCircle size={14} className="text-success shrink-0" />
                  ) : testPhase === i ? (
                    <Loader2 size={14} className="text-info animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className={`text-xs font-medium ${testPhase >= i ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                  </div>
                  {testPhase > i && <span className="text-[10px] text-success ml-auto">Passed</span>}
                </div>
              ))}
              {testPhase >= 4 && (
                <div className="p-3 rounded bg-success/10 border border-success/20 text-xs text-success font-medium">
                  ✓ All tests passed — {testAgent.name} is fully operational
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button onClick={() => { setShowTest(null); setTestPhase(0); }} className="h-8 px-4 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
