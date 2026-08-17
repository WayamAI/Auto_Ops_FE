import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Key, Cloud, Container, Database, Globe, Settings, Radio, CheckCircle, ChevronDown, ChevronRight, X, Plus, Loader2, Terminal, Shield, Server, Wifi, AlertTriangle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useTools, useAgents } from "@/api/hooks";
import type { ToolMetadata, AgentMetadata } from "@/api/types";

interface Profile {
  name: string;
  type: string;
  icon: any;
  status: "connected" | "warning" | "error";
  cis: number | null;
  lastUsed: string;
  vault: string;
  host?: string;
  port?: string;
  timeout?: string;
}

interface ActionDef {
  name: string;
  desc: string;
  risk: string;
  used: number;
}

interface PackDef {
  name: string;
  count: number;
  actions: ActionDef[];
}

const defaultProfiles: Profile[] = [
  { name: "prod-linux-ssh", type: "SSH Access", icon: Key, status: "connected", cis: 124, lastUsed: "2m ago", vault: "HashiCorp Vault", host: "*.prod.internal", port: "22", timeout: "30s" },
  { name: "aws-prod", type: "Cloud API (AWS)", icon: Cloud, status: "connected", cis: 67, lastUsed: "45s ago", vault: "IAM Role", host: "sts.amazonaws.com", port: "443", timeout: "15s" },
  { name: "azure-prod", type: "Cloud API (Azure)", icon: Cloud, status: "connected", cis: 34, lastUsed: "3m ago", vault: "Service Principal", host: "management.azure.com", port: "443", timeout: "15s" },
  { name: "gcp-prod", type: "Cloud API (GCP)", icon: Cloud, status: "connected", cis: 18, lastUsed: "12m ago", vault: "Service Account", host: "compute.googleapis.com", port: "443", timeout: "15s" },
  { name: "k8s-prod", type: "Kubernetes API", icon: Container, status: "connected", cis: 45, lastUsed: "1m ago", vault: "Service Account Token", host: "k8s-api.prod.internal", port: "6443", timeout: "10s" },
  { name: "prod-databases", type: "Database", icon: Database, status: "connected", cis: 23, lastUsed: "5m ago", vault: "HashiCorp Vault", host: "*.db.prod.internal", port: "5432", timeout: "10s" },
  { name: "windows-servers", type: "Windows (WinRM)", icon: Settings, status: "connected", cis: 31, lastUsed: "4m ago", vault: "Kerberos", host: "*.win.prod.internal", port: "5985", timeout: "60s" },
  { name: "credential-vault", type: "HashiCorp Vault", icon: Key, status: "connected", cis: 14, lastUsed: "12s ago", vault: "Vault Token (auto-rotating, 24h TTL)", host: "corp-vault-01.internal:8200", port: "8200", timeout: "15s" },
  { name: "servicenow-prod", type: "Custom REST API (ServiceNow)", icon: Globe, status: "connected", cis: null, lastUsed: "4s ago", vault: "OAuth 2.0", host: "company.service-now.com", port: "443", timeout: "15s" },
  { name: "network-devices", type: "SNMP", icon: Radio, status: "connected", cis: 56, lastUsed: "8m ago", vault: "SNMPv3", host: "*.net.prod.internal", port: "161", timeout: "30s" },
];

// Mock packs and mapping — commented out, replaced by backend API data
// const defaultPacks: PackDef[] = [ ... ];
// const defaultMapping: Record<string, boolean[]> = { ... };

const profileTypeOptions = [
  { label: "SSH Access", icon: Key },
  { label: "Cloud API (AWS)", icon: Cloud },
  { label: "Cloud API (Azure)", icon: Cloud },
  { label: "Cloud API (GCP)", icon: Cloud },
  { label: "Kubernetes API", icon: Container },
  { label: "Database", icon: Database },
  { label: "Windows (WinRM)", icon: Settings },
  { label: "Custom REST API", icon: Globe },
  { label: "SNMP", icon: Radio },
];

const vaultOptions = ["HashiCorp Vault", "IAM Role", "Service Principal", "Service Account", "Service Account Token", "Kerberos", "OAuth 2.0", "SNMPv3", "API Key", "SSH Key"];

export default function ToolRegistry() {
  const [activeTab, setActiveTab] = useState("Access Profiles");
  const [expandedPack, setExpandedPack] = useState<number>(0);
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles);
  const [editMapping, setEditMapping] = useState(false);

  // Fetch tools and agents from backend API
  const { data: apiTools, isLoading: toolsLoading } = useTools();
  const { data: apiAgents, isLoading: agentsLoading } = useAgents();

  // Build action packs grouped by tool category from backend data
  const packs: PackDef[] = apiTools ? (() => {
    const byCategory: Record<string, ActionDef[]> = {};
    for (const tool of apiTools) {
      const cat = tool.category.charAt(0).toUpperCase() + tool.category.slice(1);
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({
        name: tool.name,
        desc: tool.description,
        risk: tool.used_by_agents.includes("execution") ? "Medium" : "Low",
        used: 0,
      });
    }
    return Object.entries(byCategory).map(([name, actions]) => ({
      name: `${name} Tools`,
      count: actions.length,
      actions,
    }));
  })() : [];

  // Build agent-tool mapping matrix from backend data
  const mapping: Record<string, boolean[]> = apiAgents && packs.length > 0 ? (() => {
    const m: Record<string, boolean[]> = {};
    for (const agent of apiAgents) {
      const allAgentToolNames = new Set(Object.values(agent.tools_by_service_type).flat());
      m[agent.display_name] = packs.map(pack =>
        pack.actions.some(a => allAgentToolNames.has(a.name))
      );
    }
    return m;
  })() : {};

  // Modals
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showConfigProfile, setShowConfigProfile] = useState<Profile | null>(null);
  const [showTestProfile, setShowTestProfile] = useState<Profile | null>(null);
  const [showLogsProfile, setShowLogsProfile] = useState<Profile | null>(null);
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [showEditAction, setShowEditAction] = useState<{ pack: number; action: number } | null>(null);
  const [showTestAction, setShowTestAction] = useState<ActionDef | null>(null);

  // Test animation state
  const [testSteps, setTestSteps] = useState<("pending" | "running" | "pass" | "fail")[]>(["pending", "pending", "pending", "pending"]);
  const [testRunning, setTestRunning] = useState(false);

  // Create profile form
  const [newProfile, setNewProfile] = useState({ name: "", type: "SSH Access", host: "", port: "22", vault: "HashiCorp Vault", timeout: "30s" });

  // Create action form
  const [newAction, setNewAction] = useState({ name: "", desc: "", risk: "Low", packIdx: 0 });

  // Edit action form
  const [editActionForm, setEditActionForm] = useState({ name: "", desc: "", risk: "Low" });

  const tabs = ["Access Profiles", "Action Library", "Agent-Tool Mapping"];
  const riskColors: Record<string, string> = { Low: "active", Medium: "warning", High: "error" };
  const packHeaders = packs.map(p => p.name.replace(" Tools", ""));

  const totalActions = packs.reduce((s, p) => s + p.actions.length, 0);
  const customCount = packs.find(p => p.name === "Custom Actions")?.actions.length || 0;
  const prebuiltCount = totalActions - customCount;

  const runTest = (profile: Profile) => {
    setShowTestProfile(profile);
    setTestRunning(true);
    setTestSteps(["running", "pending", "pending", "pending"]);
    const labels = ["Connectivity", "Authentication", "Permissions", "Latency"];
    let step = 0;
    const advance = () => {
      setTestSteps(prev => {
        const next = [...prev];
        next[step] = profile.status === "warning" && step === 3 ? "fail" : "pass";
        if (step + 1 < 4) next[step + 1] = "running";
        return next;
      });
      step++;
      if (step < 4) {
        setTimeout(advance, 800 + Math.random() * 600);
      } else {
        setTestRunning(false);
        if (profile.status === "warning") {
          toast.error(`Test completed with warnings for ${profile.name}`);
        } else {
          toast.success(`All checks passed for ${profile.name}`);
        }
      }
    };
    setTimeout(advance, 1000);
  };

  const runActionTest = (action: ActionDef) => {
    setShowTestAction(action);
    setTestRunning(true);
    setTestSteps(["running", "pending", "pending", "pending"]);
    let step = 0;
    const advance = () => {
      setTestSteps(prev => {
        const next = [...prev];
        next[step] = "pass";
        if (step + 1 < 4) next[step + 1] = "running";
        return next;
      });
      step++;
      if (step < 4) {
        setTimeout(advance, 700 + Math.random() * 500);
      } else {
        setTestRunning(false);
        toast.success(`Action "${action.name}" dry run passed`);
      }
    };
    setTimeout(advance, 900);
  };

  const handleCreateProfile = () => {
    if (!newProfile.name.trim()) { toast.error("Profile name is required"); return; }
    const typeOpt = profileTypeOptions.find(o => o.label === newProfile.type);
    const p: Profile = {
      name: newProfile.name.trim(),
      type: newProfile.type,
      icon: typeOpt?.icon || Key,
      status: "connected",
      cis: Math.floor(Math.random() * 50) + 5,
      lastUsed: "just now",
      vault: newProfile.vault,
      host: newProfile.host,
      port: newProfile.port,
      timeout: newProfile.timeout,
    };
    setProfiles(prev => [...prev, p]);
    setShowCreateProfile(false);
    setNewProfile({ name: "", type: "SSH Access", host: "", port: "22", vault: "HashiCorp Vault", timeout: "30s" });
    toast.success(`Access profile "${p.name}" created`);
  };

  const handleCreateAction = () => {
    if (!newAction.name.trim()) { toast.error("Action name is required"); return; }
    toast.info(`Action "${newAction.name}" — creation requires backend API (POST /tools not available yet)`);
    setShowCreateAction(false);
    setNewAction({ name: "", desc: "", risk: "Low", packIdx: 0 });
  };

  const handleSaveEditAction = () => {
    if (!showEditAction) return;
    toast.info("Action editing requires backend API (PATCH /tools not available yet)");
    setShowEditAction(null);
  };

  const handleDeleteAction = (packIdx: number, actionIdx: number) => {
    const name = packs[packIdx]?.actions[actionIdx]?.name;
    toast.info(`Action "${name}" — deletion requires backend API (DELETE /tools not available yet)`);
  };

  const toggleMapping = (agent: string, packIdx: number) => {
    toast.info("Mapping changes require backend API (not available yet)");
  };

  const profileLogs = [
    { time: "10:45:02", level: "INFO", msg: "Connection established" },
    { time: "10:44:58", level: "INFO", msg: "Authentication successful (OAuth 2.0)" },
    { time: "10:44:55", level: "DEBUG", msg: "TLS handshake completed (TLS 1.3)" },
    { time: "10:44:12", level: "INFO", msg: "Health check passed — latency: 23ms" },
    { time: "10:43:30", level: "INFO", msg: "Connection pool refreshed (4 active connections)" },
    { time: "10:40:15", level: "INFO", msg: "Credential rotation completed" },
    { time: "10:38:00", level: "DEBUG", msg: "Keep-alive ping — response: 18ms" },
    { time: "10:35:45", level: "INFO", msg: "Agent [execution] used this profile for midserver_start" },
    { time: "10:30:12", level: "WARN", msg: "Connection latency elevated: 450ms (threshold: 500ms)" },
    { time: "10:25:00", level: "INFO", msg: "Scheduled health check passed" },
  ];

  const testLabels = ["Connectivity", "Authentication", "Permissions", "Latency"];
  const actionTestLabels = ["Syntax validation", "Parameter check", "Dry run simulation", "Rollback verification"];

  return (
    <AppLayout title="Tool Registry" subtitle="Define how agents access and act on infrastructure">
      <div className="grid grid-cols-3 gap-6 mb-8">
        <MetricCard 
          value={String(profiles.length)} 
          label="Access Profiles" 
          subText={`${profiles.filter(p => p.status === "connected").length} healthy · ${profiles.filter(p => p.status !== "connected").length} warning`} 
          accentColor="blue" 
          icon={<Shield size={24} />}
        />
        <MetricCard 
          value="87%" 
          label="Infrastructure Coverage" 
          subText="342 of 394 production CIs reachable" 
          accentColor="green" 
          icon={<Server size={24} />}
        />
        <MetricCard 
          value={String(totalActions)} 
          label="Action Library" 
          subText={`${prebuiltCount} pre-built · ${customCount} custom`} 
          accentColor="purple" 
          icon={<Terminal size={24} />}
        />
      </div>

      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
            {t}
          </button>
        ))}
        <div className="flex-1" />
        {activeTab === "Access Profiles" && (
          <button onClick={() => setShowCreateProfile(true)} className="h-8 px-4 rounded-md bg-success text-success-foreground text-xs font-medium hover:bg-success/90 transition-colors self-center mb-2 flex items-center gap-1">
            <Plus size={12} /> Create Access Profile
          </button>
        )}
        {activeTab === "Action Library" && (
          <button onClick={() => setShowCreateAction(true)} className="h-8 px-4 rounded-md bg-success text-success-foreground text-xs font-medium hover:bg-success/90 transition-colors self-center mb-2 flex items-center gap-1">
            <Plus size={12} /> Create Action
          </button>
        )}
        {activeTab === "Agent-Tool Mapping" && (
          <button onClick={() => { setEditMapping(!editMapping); if (editMapping) toast.success("Mappings saved"); }} className={`h-8 px-4 rounded-md text-xs font-medium transition-colors self-center mb-2 ${editMapping ? "bg-success text-success-foreground" : "bg-secondary text-foreground border border-border"}`}>
            {editMapping ? "Save Mappings" : "Edit Mappings"}
          </button>
        )}
      </div>

      {activeTab === "Access Profiles" && (
        <div className="grid grid-cols-3 gap-6">
          {profiles.map((p, i) => (
            <div key={i} className={`bg-card rounded-md border p-5 ${p.status === "warning" ? "border-warning/30" : p.status === "error" ? "border-destructive/30" : "border-border/40"} hover:border-success/30 transition-all duration-300 shadow-sm group`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${p.status === "warning" ? "bg-warning/10 border border-warning/20" : "bg-secondary/40 border border-border/20 group-hover:border-success/20"}`}>
                  <p.icon size={18} className={p.status === "warning" ? "text-warning" : "text-muted-foreground group-hover:text-success transition-colors"} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold font-mono text-foreground truncate">{p.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{p.type}</p>
                </div>
                <StatusBadge variant={p.status} />
              </div>
              <div className="space-y-2 text-[10px] text-muted-foreground/60 mb-5 px-1 py-3 border-y border-border/10">
                {p.cis !== null && (
                  <div className="flex justify-between">
                    <span className="font-bold uppercase tracking-widest text-[9px]">Scope</span>
                    <span className="text-foreground/80 font-bold">{p.cis} CIs</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold uppercase tracking-widest text-[9px]">Last Used</span>
                  <span className={p.lastUsed.includes("s ago") || (p.lastUsed.includes("m ago") && !p.lastUsed.includes("12m")) ? "text-success font-bold" : "text-warning font-bold"}>{p.lastUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase tracking-widest text-[9px]">Credential</span>
                  <span className="text-foreground/80 font-bold">{p.vault}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConfigProfile(p)} className="flex-1 h-8 rounded-md text-[10px] font-bold uppercase tracking-widest bg-secondary/50 text-foreground/80 border border-border/30 hover:bg-secondary hover:text-foreground transition-all">Configure</button>
                <button onClick={() => runTest(p)} className="flex-1 h-8 rounded-md text-[10px] font-bold uppercase tracking-widest bg-secondary/50 text-foreground/80 border border-border/30 hover:bg-secondary hover:text-foreground transition-all">Test</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== ACTION LIBRARY ===== */}
      {activeTab === "Action Library" && toolsLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2"><Loader2 size={16} className="animate-spin" /> Loading tools from backend...</div>
      )}
      {activeTab === "Action Library" && !toolsLoading && packs.length === 0 && (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">No tools found. Make sure the backend is running on port 8000.</div>
      )}
      {activeTab === "Action Library" && !toolsLoading && packs.length > 0 && (
        <div className="space-y-3">
          {packs.map((pack, pi) => (
            <div key={pi} className="bg-card rounded-lg border border-border">
              <button onClick={() => setExpandedPack(expandedPack === pi ? -1 : pi)} className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  {expandedPack === pi ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  <h3 className="text-sm font-semibold text-foreground">{pack.name}</h3>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{pack.actions.length} actions</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{pack.actions.reduce((s, a) => s + a.used, 0)} total executions</span>
              </button>
              {expandedPack === pi && (
                <div className="border-t border-border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-2.5 text-left font-medium">Action</th>
                        <th className="px-4 py-2.5 text-left font-medium">Description</th>
                        <th className="px-4 py-2.5 text-left font-medium">Risk</th>
                        <th className="px-4 py-2.5 text-left font-medium">Executions</th>
                        <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pack.actions.map((a, ai) => (
                        <tr key={ai} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2.5 text-xs font-mono text-foreground">{a.name}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.desc}</td>
                          <td className="px-4 py-2.5"><StatusBadge variant={riskColors[a.risk] as any} label={a.risk} /></td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.used}×</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => { setShowEditAction({ pack: pi, action: ai }); setEditActionForm({ name: a.name, desc: a.desc, risk: a.risk }); }} className="text-[10px] text-info hover:text-info/80 transition-colors">Edit</button>
                              <button onClick={() => runActionTest(a)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Test</button>
                              <button onClick={() => handleDeleteAction(pi, ai)} className="text-[10px] text-destructive/60 hover:text-destructive transition-colors">Remove</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== AGENT-TOOL MAPPING ===== */}
      {activeTab === "Agent-Tool Mapping" && (toolsLoading || agentsLoading) && (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2"><Loader2 size={16} className="animate-spin" /> Loading agent-tool mapping from backend...</div>
      )}
      {activeTab === "Agent-Tool Mapping" && !toolsLoading && !agentsLoading && Object.keys(mapping).length === 0 && (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">No mapping data. Make sure the backend is running on port 8000.</div>
      )}
      {activeTab === "Agent-Tool Mapping" && !toolsLoading && !agentsLoading && Object.keys(mapping).length > 0 && (
        <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
          {editMapping && (
            <div className="px-4 py-2.5 border-b border-border bg-info/5 text-xs text-info flex items-center gap-2">
              <AlertTriangle size={12} />
              <span>Edit mode — click cells to toggle access. Click "Save Mappings" when done.</span>
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                {packHeaders.map(h => <th key={h} className="px-3 py-3 text-center font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(mapping).map(([agent, packs], i) => (
                <tr key={agent} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-medium text-foreground whitespace-nowrap">{agent}</td>
                  {packs.map((has, j) => (
                    <td
                      key={j}
                      className={`px-3 py-2.5 text-center ${editMapping ? "cursor-pointer hover:bg-secondary/50" : ""}`}
                      onClick={() => editMapping && toggleMapping(agent, j)}
                    >
                      {has ? (
                        <CheckCircle size={14} className="text-success mx-auto" />
                      ) : editMapping ? (
                        <span className="inline-block w-3.5 h-3.5 rounded-full border border-border/50 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/20">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== MODAL: CREATE ACCESS PROFILE ===== */}
      {showCreateProfile && (
        <Modal title="Create Access Profile" onClose={() => setShowCreateProfile(false)}>
          <div className="space-y-4">
            <FormField label="Profile Name" placeholder="e.g., prod-redis-ssh" value={newProfile.name} onChange={v => setNewProfile(p => ({ ...p, name: v }))} mono />
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Profile Type</label>
              <select value={newProfile.type} onChange={e => setNewProfile(p => ({ ...p, type: e.target.value }))} className="w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground">
                {profileTypeOptions.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
              </select>
            </div>
            <FormField label="Host / Endpoint" placeholder="*.prod.internal" value={newProfile.host} onChange={v => setNewProfile(p => ({ ...p, host: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Port" placeholder="22" value={newProfile.port} onChange={v => setNewProfile(p => ({ ...p, port: v }))} />
              <FormField label="Timeout" placeholder="30s" value={newProfile.timeout} onChange={v => setNewProfile(p => ({ ...p, timeout: v }))} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Credential Source</label>
              <select value={newProfile.vault} onChange={e => setNewProfile(p => ({ ...p, vault: e.target.value }))} className="w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground">
                {vaultOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreateProfile(false)} className="h-8 px-4 rounded-md text-xs font-medium bg-secondary text-foreground border border-border">Cancel</button>
              <button onClick={handleCreateProfile} className="h-8 px-4 rounded-md text-xs font-medium bg-success text-success-foreground">Create Profile</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== MODAL: CONFIGURE PROFILE ===== */}
      {showConfigProfile && (
        <Modal title={`Configure: ${showConfigProfile.name}`} onClose={() => setShowConfigProfile(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border">
              <showConfigProfile.icon size={20} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold font-mono text-foreground">{showConfigProfile.name}</p>
                <p className="text-[10px] text-muted-foreground">{showConfigProfile.type}</p>
              </div>
              <div className="ml-auto"><StatusBadge variant={showConfigProfile.status} /></div>
            </div>
            <FormField label="Host / Endpoint" value={showConfigProfile.host || ""} onChange={() => {}} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Port" value={showConfigProfile.port || ""} onChange={() => {}} />
              <FormField label="Timeout" value={showConfigProfile.timeout || ""} onChange={() => {}} />
            </div>
            <FormField label="Credential Source" value={showConfigProfile.vault} onChange={() => {}} />
            <div className="p-3 rounded-md bg-secondary/30 border border-border space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-[10px] uppercase tracking-wider">Connection Details</p>
              <div className="flex justify-between"><span>Status</span><span className="text-success">Active</span></div>
              <div className="flex justify-between"><span>Uptime</span><span className="text-foreground">14d 6h 23m</span></div>
              <div className="flex justify-between"><span>Total Requests (24h)</span><span className="text-foreground">1,247</span></div>
              <div className="flex justify-between"><span>Avg Latency</span><span className="text-foreground">23ms</span></div>
              <div className="flex justify-between"><span>Last Credential Rotation</span><span className="text-foreground">3 days ago</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowConfigProfile(null)} className="h-8 px-4 rounded-md text-xs font-medium bg-secondary text-foreground border border-border">Close</button>
              <button onClick={() => { toast.success("Configuration saved"); setShowConfigProfile(null); }} className="h-8 px-4 rounded-md text-xs font-medium bg-success text-success-foreground">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== MODAL: TEST PROFILE ===== */}
      {showTestProfile && (
        <Modal title={`Test: ${showTestProfile.name}`} onClose={() => { if (!testRunning) setShowTestProfile(null); }}>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Testing connectivity to <span className="font-mono text-foreground">{showTestProfile.host || showTestProfile.name}</span></p>
            </div>
            {testLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30">
                {testSteps[i] === "pending" && <Circle size={14} className="text-muted-foreground" />}
                {testSteps[i] === "running" && <Loader2 size={14} className="text-info animate-spin" />}
                {testSteps[i] === "pass" && <CheckCircle size={14} className="text-success" />}
                {testSteps[i] === "fail" && <AlertTriangle size={14} className="text-warning" />}
                <span className="text-xs text-foreground flex-1">{label}</span>
                {testSteps[i] === "pass" && <span className="text-[10px] text-success">Passed</span>}
                {testSteps[i] === "fail" && <span className="text-[10px] text-warning">Warning: High latency</span>}
                {testSteps[i] === "running" && <span className="text-[10px] text-info">Testing...</span>}
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowTestProfile(null)} disabled={testRunning} className="h-8 px-4 rounded-md text-xs font-medium bg-secondary text-foreground border border-border disabled:opacity-50">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== MODAL: PROFILE LOGS ===== */}
      {showLogsProfile && (
        <Modal title={`Logs: ${showLogsProfile.name}`} onClose={() => setShowLogsProfile(null)} wide>
          <div className="font-mono text-[11px] space-y-1 bg-background/50 rounded-md p-4 max-h-[300px] overflow-auto">
            {profileLogs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground">{l.time}</span>
                <span className={`font-medium ${l.level === "INFO" ? "text-success" : l.level === "DEBUG" ? "text-info" : l.level === "WARN" ? "text-warning" : "text-destructive"}`}>[{l.level}]</span>
                <span className="text-foreground/80">{l.msg}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3">
            <span className="text-[10px] text-muted-foreground">Showing {profileLogs.length} recent entries</span>
            <div className="flex gap-2">
              <button className="h-7 px-3 rounded text-[10px] font-medium bg-secondary text-foreground border border-border">Download</button>
              <button onClick={() => setShowLogsProfile(null)} className="h-7 px-3 rounded text-[10px] font-medium bg-secondary text-foreground border border-border">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== MODAL: CREATE ACTION ===== */}
      {showCreateAction && (
        <Modal title="Create Action" onClose={() => setShowCreateAction(false)}>
          <div className="space-y-4">
            <FormField label="Action Name" placeholder="e.g., redis_cache_flush" value={newAction.name} onChange={v => setNewAction(p => ({ ...p, name: v }))} mono />
            <FormField label="Description" placeholder="What this action does..." value={newAction.desc} onChange={v => setNewAction(p => ({ ...p, desc: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Risk Level</label>
                <select value={newAction.risk} onChange={e => setNewAction(p => ({ ...p, risk: e.target.value }))} className="w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Action Pack</label>
                <select value={newAction.packIdx} onChange={e => setNewAction(p => ({ ...p, packIdx: parseInt(e.target.value) }))} className="w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground">
                  {packs.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreateAction(false)} className="h-8 px-4 rounded-md text-xs font-medium bg-secondary text-foreground border border-border">Cancel</button>
              <button onClick={handleCreateAction} className="h-8 px-4 rounded-md text-xs font-medium bg-success text-success-foreground">Create Action</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== MODAL: EDIT ACTION ===== */}
      {showEditAction && (
        <Modal title="Edit Action" onClose={() => setShowEditAction(null)}>
          <div className="space-y-4">
            <FormField label="Action Name" value={editActionForm.name} onChange={v => setEditActionForm(p => ({ ...p, name: v }))} mono />
            <FormField label="Description" value={editActionForm.desc} onChange={v => setEditActionForm(p => ({ ...p, desc: v }))} />
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Risk Level</label>
              <select value={editActionForm.risk} onChange={e => setEditActionForm(p => ({ ...p, risk: e.target.value }))} className="w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditAction(null)} className="h-8 px-4 rounded-md text-xs font-medium bg-secondary text-foreground border border-border">Cancel</button>
              <button onClick={handleSaveEditAction} className="h-8 px-4 rounded-md text-xs font-medium bg-success text-success-foreground">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== MODAL: TEST ACTION ===== */}
      {showTestAction && (
        <Modal title={`Dry Run: ${showTestAction.name}`} onClose={() => { if (!testRunning) setShowTestAction(null); }}>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground">Running dry-run test for <span className="font-mono text-foreground">{showTestAction.name}</span></p>
              <p className="text-[10px] text-muted-foreground mt-1">Risk level: <StatusBadge variant={riskColors[showTestAction.risk] as any} label={showTestAction.risk} /></p>
            </div>
            {actionTestLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30">
                {testSteps[i] === "pending" && <Circle size={14} className="text-muted-foreground" />}
                {testSteps[i] === "running" && <Loader2 size={14} className="text-info animate-spin" />}
                {testSteps[i] === "pass" && <CheckCircle size={14} className="text-success" />}
                <span className="text-xs text-foreground flex-1">{label}</span>
                {testSteps[i] === "pass" && <span className="text-[10px] text-success">Passed</span>}
                {testSteps[i] === "running" && <span className="text-[10px] text-info">Running...</span>}
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowTestAction(null)} disabled={testRunning} className="h-8 px-4 rounded-md text-xs font-medium bg-secondary text-foreground border border-border disabled:opacity-50">Close</button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

// ===== Reusable sub-components =====

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-popover border border-border/60 rounded-md ${wide ? "w-[700px]" : "w-[500px]"} max-h-[85vh] overflow-auto shadow-2xl animate-in fade-in zoom-in duration-200`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border/40 sticky top-0 bg-popover/95 backdrop-blur-md z-10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
