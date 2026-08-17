import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import BlastRadiusModal from "@/components/actions/BlastRadiusModal";
import { ArrowUpRight, DollarSign, CheckCircle, Clock, X, AlertTriangle, Loader2, Target, Activity, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useRecentIncidents, useAgents, usePendingApprovals, useDecideApproval } from "@/api/hooks";
import { useAuth } from "@/context/AuthContext";
import type { IncidentResponse, AgentMetadata, ApprovalResponse } from "@/api/types";

// Mock feed items — commented out, replaced by live API data from GET /incidents/recent
// const mockFeedItems = [
//   { time: "11:09:30 AM", agent: "MID Server Agent", desc: "Awaiting approval for INC0012823...", stage: "planning" as const, confidence: "High" },
//   ...
// ];

// Map backend incident status to frontend stage badge
const statusToStage = (status: string): "analyzing" | "planning" | "executing" | "validating" | "resolved" | "error" | "pending" => {
  const map: Record<string, "analyzing" | "planning" | "executing" | "validating" | "resolved" | "error" | "pending"> = {
    new: "pending",
    rca: "analyzing",
    planned: "planning",
    executing: "executing",
    validating: "validating",
    resolved: "resolved",
    failed: "error",
    cancelled: "error",
    awaiting_human_intervention: "error",
  };
  return map[status] || "pending";
};

// Map backend service_type to frontend agent display name
const serviceTypeToAgent = (type: string) => {
  const map: Record<string, string> = {
    docker: "Container Agent",
    midserver: "MID Server Agent",
    network: "Network Agent",
    servicenow_auth: "Security Ops Agent",
    database: "Database Agent",
  };
  return map[type] || "Agent";
};

function incidentToFeedItem(incident: IncidentResponse) {
  const date = new Date(incident.created_at);
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return {
    time,
    agent: serviceTypeToAgent(incident.service_type),
    desc: `${incident.title}${incident.container_name ? ` on ${incident.container_name}` : ""}`,
    stage: statusToStage(incident.status),
    confidence: (incident.severity === "critical" || incident.severity === "high") ? "High" as const : incident.severity === "medium" ? "Medium" as const : "Low" as const,
  };
}

// Mock approvals — commented out, replaced by live API data from GET /approvals/pending
// const approvals = [ ... ];

// Mock agent snapshot — commented out, replaced by live API data from GET /agents
// const mockAgentSnapshot = [
//   { name: "Infrastructure Agent", status: "active" as const, resolved: 8, success: "96%", avg: "3m 42s" },
//   ...
// ];

function agentMetadataToSnapshot(agent: AgentMetadata) {
  return {
    name: agent.display_name,
    status: "active" as const,
    resolved: agent.executions ?? 0,
    success: agent.success_rate ?? "—",
    avg: agent.avg_time ?? "—",
  };
}

const confidenceColors: Record<string, string> = {
  High: "text-success",
  Medium: "text-warning",
  Low: "text-destructive",
};

type ApprovalModalState = {
  type: "approve" | "modify" | "reject";
  approval: ApprovalResponse;
} | null;

type ExecutingState = {
  approval: ApprovalResponse;
  currentStep: number;
  status: "executing" | "completed";
} | null;

export default function ControlTower() {
  const navigate = useNavigate();
  const [modalState, setModalState] = useState<ApprovalModalState>(null);
  const [executingState, setExecutingState] = useState<ExecutingState>(null);
  const [dismissedApprovals, setDismissedApprovals] = useState<string[]>([]);
  const [modifyNotes, setModifyNotes] = useState("");
  const [blastRadiusIncident, setBlastRadiusIncident] = useState<string | null>(null);

  // Live API data — no mock fallback
  const { user } = useAuth();
  const currentUser = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "operator"
    : "operator";

  const { data: recentIncidents, isLoading: incidentsLoading } = useRecentIncidents(20);
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { data: pendingApprovalsData } = usePendingApprovals();
  const decideMutation = useDecideApproval();

  const approvals = pendingApprovalsData || [];

  const feedItems = recentIncidents
    ? recentIncidents.map(incidentToFeedItem)
    : [];

  const agentSnapshot = agentsData
    ? agentsData.map(agentMetadataToSnapshot)
    : [];

  const resolvedToday = recentIncidents
    ? recentIncidents.filter((i) => i.status === "resolved").length
    : 0;

  const activeRemediations = recentIncidents
    ? recentIncidents.filter((i) => ["rca", "planned", "executing", "validating"].includes(i.status)).length
    : 0;

  const handleApprove = (approval: ApprovalResponse) => {
    setModalState(null);
    decideMutation.mutate(
      { approvalId: approval.id, data: { decision: "approved", notes: "Approved from Control Tower", decided_by: currentUser } },
      {
        onSuccess: () => {
          toast.success(`Approved — pipeline will continue execution`, {
            description: `Incident ${approval.incident_id} remediation proceeding`,
          });
          setDismissedApprovals(prev => [...prev, approval.id]);
        },
      },
    );
  };

  const handleReject = (approval: ApprovalResponse) => {
    setModalState(null);
    decideMutation.mutate(
      { approvalId: approval.id, data: { decision: "rejected", notes: "Rejected from Control Tower — escalated", decided_by: currentUser } },
      {
        onSuccess: () => {
          toast.error(`Rejected — escalated to on-call engineer`);
          setDismissedApprovals(prev => [...prev, approval.id]);
        },
      },
    );
  };

  const handleModify = (approval: ApprovalResponse) => {
    setModalState(null);
    decideMutation.mutate(
      { approvalId: approval.id, data: { decision: "modified", notes: modifyNotes || "Modified from Control Tower", decided_by: currentUser } },
      {
        onSuccess: () => {
          toast.info(`Modified & sent back for re-planning`);
          setDismissedApprovals(prev => [...prev, approval.id]);
          setModifyNotes("");
        },
      },
    );
  };

  const visibleApprovals = approvals.filter(a => !dismissedApprovals.includes(a.id));

  return (
    <AppLayout title="Control Tower" subtitle="Real time autonomous remediation activity">
      {/* Target Status Ribbon from Mock */}
      <div className="flex items-center gap-6 mb-6 px-1 text-[11px] font-medium tracking-tight">
        <div className="flex items-center gap-2">
          <span className="text-success text-[14px]">●</span>
          <span className="text-muted-foreground">Active Agents: <span className="text-foreground">8 / 12</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-info text-[14px]">●</span>
          <span className="text-muted-foreground">Executing: <span className="text-foreground">5</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-warning text-[14px]">●</span>
          <span className="text-muted-foreground">Pending Approvals: <span className="text-foreground">{visibleApprovals.length}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-destructive text-[14px]">●</span>
          <span className="text-muted-foreground">Incidents Open: <span className="text-foreground">7</span></span>
        </div>
        
        <div className="ml-auto flex items-center gap-2 text-muted-foreground/60">
             <Clock size={12} className="text-warning/80" />
             <span className="text-[10px] uppercase font-bold tracking-widest">ServiceNow Sync: <span className="text-foreground">3m 50s ago</span></span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="cursor-pointer" onClick={() => navigate("/actions")}>
          <MetricCard 
            value={String(activeRemediations)} 
            label="Active Remediations" 
            subText="3 Investigating · 3 Remediating · 1 Validating" 
            accentColor="blue" 
            icon={<Activity size={24} />}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/actions")}>
          <MetricCard 
            value={String(resolvedToday)} 
            label="Resolved Today" 
            subText="+7 vs yesterday · 7-day avg: 31" 
            accentColor="green" 
            icon={<CheckCircle size={24} />}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/approvals")}>
          <MetricCard 
            value={String(visibleApprovals.length)} 
            label="Pending Approvals" 
            subText={visibleApprovals.length > 0 ? "Oldest: 4m ago" : "All clear"} 
            accentColor="amber" 
            pulse={visibleApprovals.length > 0} 
            icon={<Clock size={24} />}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/analytics")}>
          <MetricCard 
            value="96.2%" 
            label="Routing Accuracy" 
            subText="Correct team on 1st assignment" 
            accentColor="green" 
            icon={<Target size={24} />}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/analytics")}>
          <MetricCard 
            value="94.2%" 
            label="Success Rate (7-day)" 
            subText="+1.8% WoW" 
            accentColor="green" 
            icon={<TrendingUp size={24} />}
          />
        </div>
      </div>

      {/* MID Server Health Strip */}
      <div className="mb-6 bg-card rounded-md border-l-4 border-l-warning/80 border border-border/40 px-5 py-3 flex items-center gap-6 text-[11px] shadow-sm">
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold shrink-0">MID Server Infrastructure</span>
        <div className="flex items-center gap-4 border-l border-border/30 pl-6 overflow-x-auto no-scrollbar">
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-success" /> 11 Operational</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> 2 Degraded — <span className="font-mono text-[9px] text-warning/80">prod-mid-04, 09</span></span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-destructive" /> 1 Unreachable — <span className="font-mono text-[9px] text-destructive/80">prod-mid-13</span></span>
          <span className="text-border/20 mx-2">|</span>
          <span className="text-muted-foreground/70 whitespace-nowrap">ECC Queue: <span className="text-destructive font-bold">47 errors</span></span>
          <span className="text-muted-foreground/70 whitespace-nowrap">Credentials: <span className="text-warning font-bold">3 alerts</span></span>
          <button onClick={() => navigate("/health")} className="text-success hover:text-success/80 text-[10px] font-bold uppercase tracking-wider ml-4 transition-colors whitespace-nowrap">→ Monitor</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Live Feed */}
        <div className="col-span-2 bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-secondary/20">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Live Activity</h2>
              <span className="status-dot-green animate-pulse-soft" />
              <span className="text-[10px] text-muted-foreground/60 font-medium">AUTO-REFRESH ENABLED</span>
            </div>
          </div>
          <div className="divide-y divide-border/20 max-h-[440px] overflow-y-auto custom-scrollbar">
            {incidentsLoading && (
              <div className="flex items-center justify-center p-8 text-muted-foreground text-xs gap-2"><Loader2 size={14} className="animate-spin" /> Loading live activity...</div>
            )}
            {!incidentsLoading && feedItems.length === 0 && (
              <div className="flex items-center justify-center p-8 text-muted-foreground text-xs">No recent incidents. Backend may be offline or no incidents have been created yet.</div>
            )}
            {feedItems.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/30 transition-colors group">
                <span className="font-mono text-[10px] text-muted-foreground/50 whitespace-nowrap">{item.time}</span>
                <span className="text-[11px] font-bold text-foreground/90 whitespace-nowrap min-w-[100px]">{item.agent}</span>
                <span className="text-[11px] text-muted-foreground/70 truncate flex-1">{item.desc}</span>
                <div className="flex items-center gap-4 shrink-0">
                  <StatusBadge variant={item.stage} className="min-w-[70px] justify-center h-5" />
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider w-12 text-right", confidenceColors[item.confidence])}>
                    {item.confidence}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Queue */}
        <div id="approval-queue" className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-secondary/20">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Pending Approvals</h2>
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-warning text-warning-foreground text-[10px] font-bold">
                {visibleApprovals.length}
              </span>
            </div>
            <button onClick={() => navigate("/approvals")} className="text-[10px] text-success hover:text-success/80 font-bold uppercase tracking-wider">View All</button>
          </div>
          <div className="divide-y divide-border/20">
            {visibleApprovals.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <CheckCircle size={20} className="mx-auto mb-2 text-success" />
                All approvals processed
              </div>
            )}
            {visibleApprovals.map((a, i) => (
              <div key={i} className="p-4 space-y-3 group hover:bg-secondary/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-info tracking-tight">{a.incident_id}</span>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded text-white border",
                      a.risk_level === "high" ? "bg-destructive border-destructive" : "bg-warning border-warning"
                    )}>
                      {a.risk_level === "high" ? "P1" : "P2"}
                    </span>
                  </div>
                </div>
                
                <p className="text-[11px] font-medium text-foreground/90 leading-relaxed">{a.plan_summary}</p>
                <p className="text-[10px] text-muted-foreground/60 leading-normal">{a.reason}</p>
                
                {a.blast_radius && (
                  <div className="flex items-start gap-2 p-2 rounded bg-warning/5 border border-warning/10">
                    <AlertTriangle size={12} className="text-warning shrink-0 mt-0.5" />
                    <p className="text-[10px] text-warning/90 leading-tight italic">
                      {a.blast_radius} — <button className="underline hover:text-warning transition-colors">View Impact Map</button>
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-warning font-medium italic">
                    Waiting {(() => { const s = Math.round((Date.now() - new Date(a.created_at).getTime()) / 1000); return s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`; })()}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setModalState({ type: "approve", approval: a })} className="px-2.5 py-1 rounded text-[10px] font-bold text-success hover:bg-success/10 transition-colors">Approve</button>
                    <button onClick={() => setModalState({ type: "modify", approval: a })} className="px-2.5 py-1 rounded text-[10px] font-bold text-muted-foreground hover:bg-secondary transition-colors">Modify</button>
                    <button onClick={() => setModalState({ type: "reject", approval: a })} className="px-2.5 py-1 rounded text-[10px] font-bold text-destructive hover:bg-destructive/10 transition-colors">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Execution progress is now handled by the real pipeline — approvals flow through GET /approvals/pending */}

      {/* Agent Snapshot */}
      <div className="bg-card rounded-md border border-border/40 overflow-hidden mb-8 shadow-sm">
        <div className="px-5 py-4 border-b border-border/40 bg-secondary/20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Agent Performance Snapshot</h2>
        </div>
        <div className="grid grid-cols-5 gap-4 p-5">
          {agentsLoading && (
            <div className="col-span-5 flex items-center justify-center p-6 text-muted-foreground text-xs gap-2"><Loader2 size={14} className="animate-spin" /> Loading agents...</div>
          )}
          {!agentsLoading && agentSnapshot.length === 0 && (
            <div className="col-span-5 flex items-center justify-center p-6 text-muted-foreground text-xs">No agents found. Backend may be offline.</div>
          )}
          {agentSnapshot.map((a, i) => (
            <div key={i} className={`rounded-lg border p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${a.status === "error" ? "border-destructive/40" : "border-border"}`} onClick={() => navigate("/agents")}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`status-dot-${a.status === "active" ? "green" : a.status === "idle" ? "amber" : "red"}`} />
                <span className="text-xs font-medium text-foreground truncate">{a.name}</span>
              </div>
              <div className="space-y-0.5 text-[10px] text-muted-foreground">
                <p>Today: <span className="text-foreground font-medium">{a.resolved} resolved</span></p>
                <p>Success: <span className="text-success">{a.success}</span></p>
                <p>Avg: <span className="text-foreground">{a.avg}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Value Ticker */}
      <div className="bg-card rounded-lg border border-success/20 p-4 flex items-center gap-4 glow-green">
        <DollarSign className="text-success" size={24} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-success">$13,104</span>
            <span className="text-sm text-muted-foreground">Value generated today</span>
            <ArrowUpRight size={14} className="text-success" />
          </div>
          <p className="text-xs text-muted-foreground">39 incidents auto-resolved × $336 avg manual cost</p>
        </div>
      </div>

      {/* Approval Detail Modal */}
      {modalState && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setModalState(null)}>
          <div className="bg-popover border border-border/60 rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <div className="flex items-center gap-2">
                {modalState.type === "approve" && <CheckCircle size={16} className="text-success" />}
                {modalState.type === "modify" && <AlertTriangle size={16} className="text-warning" />}
                {modalState.type === "reject" && <X size={16} className="text-destructive" />}
                <h3 className="text-sm font-semibold">
                  {modalState.type === "approve" && "Approve Remediation"}
                  {modalState.type === "modify" && "Modify Remediation Plan"}
                  {modalState.type === "reject" && "Reject Remediation"}
                </h3>
              </div>
              <button onClick={() => setModalState(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* Incident Info */}
              <div className="flex items-center gap-2">
                <span className="incident-id">{modalState.approval.incident_id}</span>
                <StatusBadge variant={modalState.approval.risk_level === "high" ? "error" : "warning"} label={modalState.approval.risk_level} />
              </div>

              {/* What the agent wants to do */}
              <div className="bg-secondary/50 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium text-foreground">{modalState.approval.plan_summary}</p>
                <p className="text-muted-foreground">{modalState.approval.reason}</p>
              </div>

              {/* Execution Plan */}
              {modalState.approval.plan_steps.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">Execution Plan</h4>
                  <div className="space-y-1.5">
                    {modalState.approval.plan_steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium text-foreground shrink-0">{step.step_number || i + 1}</span>
                        <span>{step.action || "Step"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blast Radius */}
              {modalState.approval.blast_radius && (
                <div className="p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning">
                  <span className="font-medium">Blast Radius: </span>{modalState.approval.blast_radius}
                </div>
              )}

              {/* Rollback */}
              {modalState.approval.rollback_plan && (
                <div className="p-2 rounded bg-secondary border border-border text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Rollback Plan: </span>{modalState.approval.rollback_plan}
                </div>
              )}

              {/* Estimated Time */}
              {modalState.approval.estimated_time && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={12} /> Estimated execution time: <span className="text-foreground font-medium">{modalState.approval.estimated_time}</span>
                </div>
              )}

              {/* Modify textarea */}
              {modalState.type === "modify" && (
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Modification Notes</label>
                  <textarea
                    value={modifyNotes}
                    onChange={e => setModifyNotes(e.target.value)}
                    placeholder="Describe what should be changed in the remediation plan..."
                    className="w-full h-20 rounded-md bg-secondary border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
              )}

              {/* Reject reason */}
              {modalState.type === "reject" && (
                <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-destructive">What happens on rejection:</p>
                  <p>• The pipeline will stop and not execute this action</p>
                  <p>• The incident will be escalated to the on-call engineer</p>
                  <p>• The agent will log this outcome for future learning</p>
                </div>
              )}

              {/* Approve info */}
              {modalState.type === "approve" && (
                <div className="p-3 rounded bg-success/10 border border-success/20 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-success">What happens on approval:</p>
                  <p>• The pipeline will immediately continue to execution</p>
                  <p>• Each step will be validated before proceeding to the next</p>
                  <p>• You can monitor progress in the Actions page</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button onClick={() => setModalState(null)} className="h-8 px-4 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors">Cancel</button>
              {modalState.type === "approve" && (
                <button onClick={() => handleApprove(modalState.approval)} className="h-8 px-4 rounded text-xs font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors">
                  ✓ Approve & Execute
                </button>
              )}
              {modalState.type === "modify" && (
                <button onClick={() => handleModify(modalState.approval)} className="h-8 px-4 rounded text-xs font-medium bg-warning text-warning-foreground hover:bg-warning/90 transition-colors">
                  Send Back with Notes
                </button>
              )}
              {modalState.type === "reject" && (
                <button onClick={() => handleReject(modalState.approval)} className="h-8 px-4 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  Reject & Escalate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blast Radius Modal */}
      {blastRadiusIncident && (
        <BlastRadiusModal incidentId={blastRadiusIncident} onClose={() => setBlastRadiusIncident(null)} />
      )}
    </AppLayout>
  );
}
