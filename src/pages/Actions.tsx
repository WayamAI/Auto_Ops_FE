import { useState, useEffect, useRef, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import MetricCard from "@/components/shared/MetricCard";
import StepItem from "@/components/actions/StepItem";
import BlastRadiusModal from "@/components/actions/BlastRadiusModal";
import { ChevronDown, ChevronRight, CheckCircle, Loader2, Clock, Pause, X, AlertTriangle, ExternalLink, Layers, Activity } from "lucide-react";
import { toast } from "sonner";
import { useRecentIncidents, useIncidentDetail, useIncidentStream, useIncidentApprovals, useRetryRca } from "@/api/hooks";
import type { IncidentResponse, RcaResult, PlanResult, ExecutionResult, ValidationResult } from "@/api/types";

// Map backend incident status to action display status
const incidentStatusToActionStatus = (status: string): "active" | "paused" | "pending-review" | "completed" => {
  const map: Record<string, "active" | "paused" | "pending-review" | "completed"> = {
    new: "paused",
    rca: "active",
    rca_failed: "completed",
    planned: "pending-review",
    awaiting_approval: "pending-review",
    executing: "active",
    validating: "active",
    resolved: "completed",
    failed: "completed",
    cancelled: "completed",
    awaiting_human_intervention: "completed",
  };
  return map[status] || "active";
};

// Map backend incident status to progress percentage
const incidentStatusToProgress = (status: string): number => {
  const map: Record<string, number> = { new: 0, rca: 25, rca_failed: 100, planned: 50, awaiting_approval: 55, executing: 75, validating: 90, resolved: 100, failed: 100, cancelled: 100, awaiting_human_intervention: 100 };
  return map[status] ?? 0;
};

// Map service_type to agent display name
const serviceTypeToAgentName = (type: string) => {
  const map: Record<string, string> = { docker: "Container Agent", midserver: "MID Server Agent", network: "Network Agent", servicenow_auth: "Security Ops Agent", database: "Database Agent", servicenow_incident: "MID Server Agent" };
  return map[type] || "Agent";
};

// Convert an incident to a log entry array from the stages it has gone through
function incidentToLogEntries(incident: IncidentResponse) {
  const logs: { time: string; level: "INFO" | "DEBUG" | "WARN" | "ERROR"; source: string }[] = [];
  const created = new Date(incident.created_at);
  const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  logs.push({ time: fmt(created), level: "INFO", source: `Incident created: ${incident.title}` });
  if (["rca", "planned", "executing", "validating", "resolved", "failed", "awaiting_human_intervention"].includes(incident.status)) {
    logs.push({ time: fmt(created), level: "INFO", source: "agent: rca_event: agent_request — starting root cause analysis" });
  }
  if (["planned", "executing", "validating", "resolved", "failed", "awaiting_human_intervention"].includes(incident.status)) {
    logs.push({ time: fmt(new Date(created.getTime() + 5000)), level: "INFO", source: "agent: plan_event: agent_request — generating remediation plan" });
  }
  if (["executing", "validating", "resolved", "failed", "awaiting_human_intervention"].includes(incident.status)) {
    logs.push({ time: fmt(new Date(created.getTime() + 10000)), level: "INFO", source: "agent: execution_event: agent_request — executing remediation" });
  }
  if (["validating", "resolved", "failed", "awaiting_human_intervention"].includes(incident.status)) {
    logs.push({ time: fmt(new Date(created.getTime() + 15000)), level: "INFO", source: "agent: validation_event: agent_request — validating resolution" });
  }
  if (incident.status === "resolved") {
    logs.push({ time: fmt(new Date(incident.resolved_at || created.toISOString())), level: "INFO", source: "agent: pipeline_complete — incident resolved" });
  }
  if (incident.status === "failed") {
    logs.push({ time: fmt(new Date(created.getTime() + 20000)), level: "ERROR", source: "agent: pipeline_failed — remediation unsuccessful" });
  }
  if (incident.status === "awaiting_human_intervention") {
    logs.push({ time: fmt(new Date(created.getTime() + 20000)), level: "WARN", source: "agent: pipeline_escalated — manual intervention required" });
  }
  return logs;
}

export default function Actions() {
  const [activeTab, setActiveTab] = useState("All");
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [blastRadiusIncident, setBlastRadiusIncident] = useState<string | null>(null);

  // Fetch recent incidents from backend API — no mock fallback
  const { data: recentIncidents, isLoading: incidentsLoading } = useRecentIncidents(50);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Build actions from live incidents
  const actions = recentIncidents ? recentIncidents.map((inc) => {
    const displayStatus = incidentStatusToActionStatus(inc.status);
    const progress = incidentStatusToProgress(inc.status);
    const created = new Date(inc.created_at);
    const elapsed = inc.resolved_at
      ? (() => { const d = Math.round((new Date(inc.resolved_at).getTime() - created.getTime()) / 1000); return d < 60 ? `${d}s` : `${Math.floor(d / 60)}m ${d % 60}s`; })()
      : (() => { const d = Math.round((Date.now() - created.getTime()) / 1000); return d < 60 ? `${d}s` : `${Math.floor(d / 60)}m ${d % 60}s`; })();
    const firstRun = inc.runs?.[0];
    const sysId = inc.incident_sys_id || firstRun?.incident_sys_id;
    const incidentUrl = inc.incident_url || (sysId ? `https://dev351329.service-now.com/nav_to.do?uri=incident.do?sys_id=${sysId}` : undefined);

    return {
      id: inc.id,
      title: inc.title,
      agent: serviceTypeToAgentName(inc.service_type),
      startTime: created.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      elapsed,
      incidentId: inc.id,
      displayStatus,
      progress,
      status: inc.status,
      severity: inc.severity || firstRun?.severity || "high",
      service_type: inc.service_type,
      container_name: inc.container_name,
      incident_number: inc.incident_number || firstRun?.incident_number,
      ci_name: inc.ci_name || inc.cmdb_ci || firstRun?.cmdb_ci,
      incident_url: incidentUrl,
      logs: incidentToLogEntries(inc),
    };
  }) : [];

  const activeCount = actions.filter(a => a.displayStatus === "active" || a.displayStatus === "paused").length;
  const pendingCount = actions.filter(a => a.displayStatus === "pending-review").length;
  const completedCount = actions.filter(a => a.displayStatus === "completed").length;
  const totalCount = actions.length;

  const filteredActions = actions.filter(a => {
    if (activeTab === "All") return true;
    if (activeTab === "Active") return a.displayStatus === "active" || a.displayStatus === "paused";
    if (activeTab === "Pending Review") return a.displayStatus === "pending-review";
    if (activeTab === "Completed") return a.displayStatus === "completed";
    return true;
  });

  const tabs = [
    { label: "All", count: totalCount },
    { label: "Active", count: activeCount },
    { label: "Pending Review", count: pendingCount },
    { label: "Completed", count: completedCount },
  ];

  const getStatusIcon = (a: typeof actions[0]) => {
    if (a.displayStatus === "completed") return <CheckCircle size={16} className={a.status === "failed" ? "text-destructive" : "text-success"} />;
    if (a.displayStatus === "pending-review") return <AlertTriangle size={16} className="text-warning" />;
    if (a.displayStatus === "active") return <Loader2 size={16} className="text-info animate-spin" />;
    if (a.displayStatus === "paused") return <Pause size={16} className="text-warning" />;
    return <Clock size={16} className="text-muted-foreground" />;
  };

  const getStatusBadge = (a: typeof actions[0]) => {
    if (a.status === "resolved") return <StatusBadge variant="resolved" />;
    if (a.status === "failed") return <StatusBadge variant="failed" />;
    if (a.status === "rca_failed") return <StatusBadge variant="failed" label="RCA Failed" />;
    if (a.status === "awaiting_human_intervention") return <StatusBadge variant="human-intervention" label="Action Required" />;
    if (a.displayStatus === "completed") return <StatusBadge variant="completed" />;
    if (a.displayStatus === "pending-review") return <StatusBadge variant="pending" label="Planned" />;
    if (a.displayStatus === "active") return <StatusBadge variant="in-progress" label={a.status} />;
    if (a.displayStatus === "paused") return <StatusBadge variant="idle" label="New" />;
    return <StatusBadge variant="analyzing" />;
  };


  return (
    <AppLayout title="Ongoing Actions" subtitle="Real time Execution Logs">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><span className="status-dot-green" /><span className="text-muted-foreground">Active: <span className="text-foreground font-medium">{activeCount}</span></span></div>
          <div className="flex items-center gap-1.5"><span className="status-dot-amber" /><span className="text-muted-foreground">Pending Review: <span className="text-foreground font-medium">{pendingCount}</span></span></div>
          <div className="flex items-center gap-1.5"><span className="status-dot-blue" /><span className="text-muted-foreground">Completed: <span className="text-foreground font-medium">{completedCount}</span></span></div>
        </div>
        <div className="flex gap-2">
          <button className="h-7 px-3 rounded text-[10px] font-medium bg-success/15 text-success border border-success/20">Auto-Refresh ON</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.label}
            onClick={() => setActiveTab(t.label)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === t.label ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          value={String(totalCount)}
          label="Total Actions"
          accentColor="blue"
          icon={<Layers size={24} />}
        />
        <MetricCard
          value={String(completedCount)}
          label="Completed"
          accentColor="green"
          icon={<CheckCircle size={24} />}
        />
        <MetricCard
          value={String(activeCount)}
          label="In Progress"
          accentColor="amber"
          icon={<Activity size={24} />}
        />
      </div>

      {/* Loading / Empty */}
      {incidentsLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2"><Loader2 size={16} className="animate-spin" /> Loading actions from backend...</div>
      )}
      {!incidentsLoading && actions.length === 0 && (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">No incidents found. Make sure the backend is running on port 8000 and incidents have been created.</div>
      )}

      {/* Actions List */}
      <div className="space-y-3">
        {filteredActions.map((action) => {
          const isExpanded = expandedAction === action.id;

          return (
            <div key={action.id} className={`bg-card rounded-lg border overflow-hidden ${action.displayStatus === "pending-review" ? "border-warning/30" : action.status === "failed" ? "border-destructive/30" : "border-border"}`}>
              <button
                onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(action)}
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-foreground">
                      {action.incident_number ? `${action.incident_number}: ` : ""}{action.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {action.agent} · {action.service_type} · Started {action.startTime} · Elapsed: {action.elapsed}
                      {(action.ci_name || action.container_name) && ` · ${action.ci_name || action.container_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {action.progress < 100 && (
                    <>
                      <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${action.displayStatus === "pending-review" ? "bg-warning" : "bg-info"}`}
                          style={{ width: `${action.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{action.progress}%</span>
                    </>
                  )}
                  <StatusBadge variant={action.severity === "critical" ? "error" : action.severity === "high" ? "warning" : "active"} label={action.severity} />
                  {getStatusBadge(action)}
                  {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-4 border-t border-border pt-4">
                  <ExpandedIncidentSteps incidentId={action.id} incidentStatus={action.status} startTime={action.startTime} />

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    {action.displayStatus !== "completed" && (
                      <button
                        onClick={() => toast.info("Cancel requires a run ID — use incident detail view")}
                        className="h-7 px-3 rounded text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/20 flex items-center gap-1"
                      >
                        <X size={10} /> Cancel
                      </button>
                    )}
                    <button
                      onClick={() => setShowLogs(action.id)}
                      className="h-7 px-3 rounded text-[10px] font-medium bg-secondary text-foreground border border-border"
                    >
                      View Logs
                    </button>
                    <button
                      onClick={() => setBlastRadiusIncident(action.incidentId)}
                      className="h-7 px-3 rounded text-[10px] font-medium bg-warning/15 text-warning border border-warning/20"
                    >
                      Blast Radius
                    </button>
                    {action.incident_url && (
                      <a
                        href={action.incident_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 px-3 rounded text-[10px] font-medium bg-info/15 text-info border border-info/20 flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> View in ServiceNow
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Logs Modal */}
      {showLogs && (
        <DetailedLogsModal
          incidentId={showLogs}
          incidentStatus={actions.find(a => a.id === showLogs)?.status || "resolved"}
          title={actions.find(a => a.id === showLogs)?.title || "Incident"}
          onClose={() => setShowLogs(null)}
        />
      )}

      {/* Blast Radius Modal */}
      {blastRadiusIncident && (
        <BlastRadiusModal incidentId={blastRadiusIncident} onClose={() => setBlastRadiusIncident(null)} />
      )}
    </AppLayout>
  );
}



// ── Sub-component: Markdown parsing and explanation toggles ────────────────

function SimpleMarkdown({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="space-y-2 text-[11.5px] leading-relaxed">
      {content.split('\n').map((line, i) => {
        if (!line.trim()) return null;
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const isBullet = line.trimStart().startsWith('-');

        return (
          <p key={i} className={isBullet ? 'ml-4 flex gap-2' : 'flex gap-2'}>
            {isBullet && <span className="text-muted-foreground shrink-0 mt-0.5">•</span>}
            <span className="flex-1">
              {parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <span key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</span>;
                }
                return isBullet && j === 0 ? part.trimStart().slice(1).trimStart() : part;
              })}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function ExplanationBlock({ title, explanation }: { title: string, explanation?: string }) {
  const [open, setOpen] = useState(false);
  if (!explanation) return null;

  return (
    <div className="mt-3 animate-fade-in">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-info hover:text-info/80 transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && (
        <div className="mt-3 p-4 rounded-md bg-info/5 border border-info/10 text-muted-foreground">
          <SimpleMarkdown content={explanation} />
        </div>
      )}
    </div>
  );
}


// ── Sub-component: RCA result block with retry button ─────────────────────────

function RcaResultBlock({
  rca,
  incidentStatus,
  incidentId,
  isStreaming,
  globalPhase,
}: {
  rca: RcaResult;
  incidentStatus: string;
  incidentId: string;
  isStreaming: boolean;
  globalPhase: number;
}) {
  const { mutate: retryRca, isPending: isRetrying } = useRetryRca();
  const rcaFailed = incidentStatus === "rca_failed";
  const lowConfidence = rca.confidence < 0.5;
  const showRetry = rcaFailed;

  return (
    <div className="space-y-2 text-xs animate-slide-in-top">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge variant={rcaFailed ? "failed" : "completed"} label={rcaFailed ? "Failed" : "Done"} />
        <span className="text-muted-foreground">
          Confidence:{" "}
          <span className={rca.confidence > 0.85 ? "text-success font-medium" : rca.confidence > 0.6 ? "text-warning font-medium" : "text-destructive font-medium"}>
            {Math.round(rca.confidence * 100)}%
          </span>
        </span>
        {lowConfidence && (
          <span className="text-[10px] text-destructive font-medium">(below 50% threshold)</span>
        )}
      </div>
      <div className="p-3 rounded-md bg-secondary/50 border border-border space-y-1.5">
        {rca.error ? (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2 mb-1 text-destructive font-semibold">
              <AlertTriangle size={14} /> RCA Failed
            </div>
            <p className="text-[10px] sm:text-xs text-destructive/90 font-mono mt-2 break-all whitespace-pre-wrap">{rca.error}</p>
          </div>
        ) : (
          <>
            {(!isStreaming || globalPhase >= 1) && (
              <p><span className="font-medium text-foreground">Conclusion:</span> <span className="text-muted-foreground">{rca.root_cause}</span></p>
            )}
            {rca.explanation && (!isStreaming || globalPhase >= 1) && (
              <ExplanationBlock title="Why This Conclusion?" explanation={rca.explanation} />
            )}
          </>
        )}
      </div>
      {showRetry && (
        <div className="mt-3 p-3 rounded-md bg-destructive/5 border border-destructive/20 space-y-2">
          <p className="text-[11px] text-destructive font-medium flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {rca.error
              ? "RCA failed due to an agent error. Retry to attempt root cause analysis again."
              : `RCA confidence is ${Math.round(rca.confidence * 100)}% — below the 50% minimum. Retry to re-run RCA with a fresh analysis.`}
          </p>
          <button
            onClick={() => {
              retryRca(incidentId, {
                onSuccess: () => toast.success("RCA retry started — pipeline restarted"),
                onError: () => toast.error("Failed to retry RCA — please try again"),
              });
            }}
            disabled={isRetrying}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-[10px] font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 transition-colors"
          >
            {isRetrying ? (
              <><Loader2 size={10} className="animate-spin" /> Retrying...</>
            ) : (
              <>↺ Retry RCA</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}


// ── Sub-component: fetches run detail and renders rich step content ──────────

function ExpandedIncidentSteps({ incidentId, incidentStatus, startTime }: { incidentId: string; incidentStatus: string; startTime: string }) {
  const isCompleted = ["resolved", "failed", "cancelled", "awaiting_human_intervention", "rca_failed"].includes(incidentStatus);
  const { data: restDetail, isLoading } = useIncidentDetail(incidentId);
  const { data: streamData, isStreaming, currentStage } = useIncidentStream(!isCompleted ? incidentId : null);
  const { data: incidentApprovals } = useIncidentApprovals(
    ["executing", "validating", "failed", "resolved", "cancelled", "awaiting_human_intervention"].includes(incidentStatus) ? incidentId : null
  );
  const rejectedApproval = incidentApprovals?.find(a => a.status === "rejected") ?? null;
  const approvedApproval = incidentApprovals?.find(a => a.status === "approved" || a.status === "modified") ?? null;
  const wasRejected = !!rejectedApproval;

  const detail = useMemo(() => {
    // Combine restDetail and streamData
    // streamData (real-time) takes priority over restDetail (polled)
    if (!restDetail && !streamData) return null;

    const merged = { ...(restDetail || {}), ...(streamData || {}) } as any;

    // Preserve real title/description if stream has placeholder or is empty
    if ((!merged.title || merged.title === "Resolving Incident...") && restDetail?.title) {
      merged.title = restDetail.title;
    }
    if (!merged.description && restDetail?.description) {
      merged.description = restDetail.description;
    }

    // Ensure we have runs (usually from restDetail)
    if (restDetail?.runs && (!merged.runs || merged.runs.length === 0)) {
      merged.runs = restDetail.runs;
    }

    const latestRun = merged.runs?.length ? merged.runs[merged.runs.length - 1] : null;

    // Propagate critical fields from the latest run to the top level if they are missing
    if (latestRun) {
      if (!merged.incident_number) merged.incident_number = latestRun.incident_number;
      if (!merged.incident_sys_id) merged.incident_sys_id = latestRun.incident_sys_id;
      if (!merged.cmdb_ci) merged.cmdb_ci = latestRun.cmdb_ci;
      if (!merged.severity) merged.severity = latestRun.severity;
    }

    // Construct ServiceNow URL
    const sysId = merged.incident_sys_id;
    if (sysId && !merged.incident_url) {
      merged.incident_url = `https://dev351329.service-now.com/nav_to.do?uri=incident.do?sys_id=${sysId}`;
    }

    // If we have both, ensure the latest stream run has the latest results from the rest API
    if (restDetail?.runs?.length && streamData?.runs?.length) {
      const latestRestRun = restDetail.runs[restDetail.runs.length - 1];
      const latestStreamRun = merged.runs[merged.runs.length - 1];

      latestStreamRun.rca_result = latestStreamRun.rca_result || latestRestRun.rca_result;
      latestStreamRun.plan_result = latestStreamRun.plan_result || latestRestRun.plan_result;
      latestStreamRun.execution_result = latestStreamRun.execution_result || latestRestRun.execution_result;
      latestStreamRun.validation_result = latestStreamRun.validation_result || latestRestRun.validation_result;
      latestStreamRun.incident_sys_id = latestStreamRun.incident_sys_id || latestRestRun.incident_sys_id;
      latestStreamRun.incident_number = latestStreamRun.incident_number || latestRestRun.incident_number;
      latestStreamRun.cmdb_ci = latestStreamRun.cmdb_ci || latestRestRun.cmdb_ci;
    }

    return merged;
  }, [streamData, restDetail]);

  const derivedStageLogs = useMemo(() => {
    if (detail?.stage_logs) return detail.stage_logs;
    const groups: Record<string, any[]> = { rca: [], planned: [], executing: [], validating: [] };
    if (!detail?.logs) return groups;

    let currentStage = "rca";
    detail.logs.forEach((log: any) => {
      const ev = log.event || "";
      const msg = String(log.message || "");
      const act = String(log.action || "");
      const c = (ev + msg + act).toLowerCase();

      if (c.includes("plan")) currentStage = "planned";
      if (c.includes("exec") || c.includes("approval_wait")) currentStage = "executing";
      if (c.includes("validat")) currentStage = "validating";

      groups[currentStage].push(log);
    });
    return groups;
  }, [detail]);

  // Use streamed stage if available, else static
  const activeStatus = streamData && streamData.status !== "new" ? streamData.status : incidentStatus;
  const stageMap: Record<string, number> = { new: 0, rca: 1, rca_failed: 5, plan: 2, planned: 2, awaiting_approval: 3, execution: 3, executing: 3, validation: 4, validating: 4, resolved: 5, failed: 5, cancelled: 0, awaiting_human_intervention: 5 };
  const currentIdx = stageMap[activeStatus] ?? 0;

  const [globalPhase, setGlobalPhase] = useState(-1);

  const latestRun = detail?.runs?.length ? detail.runs[detail.runs.length - 1] : null;
  const rca = latestRun?.rca_result as RcaResult | null;
  const plan = latestRun?.plan_result as PlanResult | null;
  const exec = latestRun?.execution_result as ExecutionResult | null;
  const validation = latestRun?.validation_result as ValidationResult | null;

  useEffect(() => {
    if (!isStreaming) {
      setGlobalPhase(currentIdx);
      return;
    }

    if (globalPhase < currentIdx) {
      const timer = setTimeout(() => {
        setGlobalPhase(prev => (prev < currentIdx ? prev + 1 : prev));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [globalPhase, currentIdx, isStreaming]);

  if (isLoading && !detail) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground py-4"><Loader2 size={14} className="animate-spin" /> Loading run details...</div>;
  }

  const stages = [
    { title: "Alert Received", result: true },
    { title: "Root Cause Analysis", result: rca },
    { title: "Remediation Planning", result: plan },
    { title: "Execution", result: exec },
    { title: "Validation", result: validation },
  ];

  const renderLogs = (logs: any[]) => {
    if (!logs || logs.length === 0) return null;
    return (
      <div className="ml-6 mt-2 mb-2 space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar pr-2 font-mono text-[10px] text-info/90">
        {[...logs].map((log: any, idx: number) => {
          const timeStr = log.timestamp ? String(log.timestamp).split('T').pop()?.split('Z')[0] : new Date().toLocaleTimeString('en-US', { hour12: false });
          let msg = log.message || log.event || "processing";
          if (log.action) msg += `: ${log.action}`;
          if (log.tool_used) msg += ` (tool: ${log.tool_used})`;

          return (
            <p key={idx} className="flex gap-2">
              <span className="opacity-70 shrink-0">[{timeStr}]</span>
              <span className="truncate">{log.agent || "system"}: {msg}</span>
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {stages.map((stage, i) => {
        const terminalStatuses = ["resolved", "failed", "rca_failed", "cancelled", "awaiting_human_intervention"];
        const stepStatus: "done" | "in-progress" | "pending" =
          i === 0 ? "done"
            : (activeStatus === "rca_failed" && i > 1) ? "pending"
              : (wasRejected && (i === 3 || i === 4)) ? "pending"
                : i < currentIdx ? "done"
                  : i === currentIdx ? (terminalStatuses.includes(activeStatus) ? "done" : "in-progress")
                    : "pending";

        const stageKeys = ["alert", "rca", "planned", "executing", "validating"];
        const currentStageLogs = derivedStageLogs[stageKeys[i]] || [];

        return (
          <StepItem key={i} num={i + 1} title={stage.title} time={stepStatus !== "pending" ? startTime : ""} status={stepStatus}>
            {stepStatus === "in-progress" && activeStatus === "awaiting_approval" && i === 3 && (
              <div className="space-y-1">
                <p className="text-xs text-warning font-medium">Awaiting human approval</p>
                <p className="text-[10px] text-muted-foreground">Pipeline is paused. Go to the Approval Queue to approve or reject this remediation plan before execution can proceed.</p>
                {renderLogs(currentStageLogs)}
              </div>
            )}
            {stepStatus === "in-progress" && !(activeStatus === "awaiting_approval" && i === 3) && (
              <div className="flex flex-col gap-2 p-3 rounded-md bg-info/5 border border-info/20 animate-pulse-glow">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-info border-t-transparent animate-spin" />
                  <p className="text-xs font-semibold text-info flex items-center">
                    Agent is {i === 1 ? "investigating root cause" : i === 2 ? "generating remediation plan" : i === 3 ? "executing remediation actions" : "validating system health"}
                    <span className="animate-blink ml-0.5 inline-block w-1 h-3 bg-info" />
                  </p>
                </div>
                {isStreaming && currentStage && (
                  <p className="text-[10px] text-info/70 font-mono flex items-center gap-1.5 ml-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
                    Stream chunk received: {currentStage}
                  </p>
                )}
                {renderLogs(currentStageLogs)}
              </div>
            )}
            {stepStatus === "pending" && wasRejected && i === 3 && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold text-destructive">
                  <X size={13} />
                  {rejectedApproval?.decision_by === "system"
                    ? "Approval auto expired after 1 hour — execution did not run"
                    : `Approval rejected by ${rejectedApproval?.decision_by ?? "operator"} — execution did not run`}
                </div>
                {rejectedApproval?.decision_notes && (
                  <p className="text-muted-foreground ml-5">{rejectedApproval.decision_notes}</p>
                )}
              </div>
            )}
            {stepStatus === "pending" && wasRejected && i === 4 && (
              <p className="text-xs text-muted-foreground italic">Did not run — pipeline was stopped at approval stage</p>
            )}
            {stepStatus === "done" && (
              <>
                {/* ── Alert Received ── */}
                {i === 0 && (
                  <div className="space-y-1.5 mt-1 text-[11px] sm:text-[11.5px] text-muted-foreground animate-slide-in-top">
                    <p>Source: <span className="text-foreground/90">{detail?.source || "ServiceNow Event Management"}</span></p>
                    <p className="line-clamp-2">
                      <span className="text-muted-foreground mr-1.5">Incident:</span>
                      {detail?.incident_url ? (
                        <a href={detail.incident_url} target="_blank" rel="noopener noreferrer" className="text-info font-medium hover:underline mr-1.5">
                          {detail?.incident_number || latestRun?.incident_number || "INC0010017"}
                        </a>
                      ) : (
                        <span className="text-info font-medium mr-1.5">{detail?.incident_number || latestRun?.incident_number || "INC0010017"}</span>
                      )}
                      <span className="text-foreground/90">— {detail?.description || detail?.title || "Monitoring alert detected"}</span>
                    </p>
                    <p className="mt-1">
                      Severity: <span className="text-foreground/90">{(detail?.severity || latestRun?.severity || "high").toUpperCase()}</span>
                      {detail?.ci_name || detail?.cmdb_ci || latestRun?.cmdb_ci || detail?.container_name ? (
                        <> · CI: <span className="text-foreground/90">{detail?.ci_name || detail?.cmdb_ci || latestRun?.cmdb_ci || detail?.container_name}</span></>
                      ) : null}
                    </p>
                    {/* {detail?.service_type === "midserver" || detail?.service_type === "servicenow_incident" ? (
                      <p>ECC Queue: <span className="text-foreground/90">Checking processing delays and version mismatch...</span></p>
                    ) : null} */}
                  </div>
                )}

                {/* ── RCA Result ── */}
                {i === 1 && rca && (
                  <RcaResultBlock
                    rca={rca}
                    incidentStatus={activeStatus}
                    incidentId={incidentId}
                    isStreaming={isStreaming}
                    globalPhase={globalPhase}
                  />
                )}
                {i === 1 && !rca && <p className="text-xs text-muted-foreground">RCA completed (no detailed result stored)</p>}

                {/* ── Plan Result ── */}
                {i === 2 && plan && (
                  <div className="space-y-2 text-xs animate-slide-in-top">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="completed" label="Done" />
                      <span className="text-muted-foreground">Risk: <span className="font-medium text-foreground">{plan.estimated_risk}</span></span>
                      {plan.requires_downtime && <StatusBadge variant="warning" label="Downtime Required" />}
                    </div>
                    <div className="p-3 rounded-md bg-secondary/50 border border-border space-y-1.5">
                      {plan.error ? (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <div className="flex items-center gap-2 mb-1 text-destructive font-semibold">
                            <AlertTriangle size={14} /> Stage Failed
                          </div>
                          <p className="text-[10px] sm:text-xs text-destructive/90 font-mono mt-2 break-all whitespace-pre-wrap">{plan.error}</p>
                        </div>
                      ) : (
                        <>
                          {(!isStreaming || globalPhase >= 2) && <p><span className="font-medium text-foreground">Strategy:</span> <span className="text-muted-foreground">{plan.overall_strategy}</span></p>}
                          {plan.explanation && (!isStreaming || globalPhase >= 2) && (
                            <ExplanationBlock title="Why Approval Required?" explanation={plan.explanation} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {i === 2 && !plan && <p className="text-xs text-muted-foreground">Planning completed (no detailed result stored)</p>}
                {i === 2 && wasRejected && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
                    <X size={12} />
                    {rejectedApproval?.decision_by === "system"
                      ? "Approval expired — no decision made within 1 hour"
                      : `Approval rejected by ${rejectedApproval?.decision_by ?? "operator"}`}
                  </div>
                )}
                {i === 2 && !wasRejected && approvedApproval && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md bg-success/10 border border-success/20 text-xs font-semibold text-success">
                    <CheckCircle size={12} />
                    {approvedApproval.status === "modified"
                      ? `Approval modified & approved by ${approvedApproval.decision_by ?? "operator"}`
                      : `Approved by ${approvedApproval.decision_by ?? "operator"}`}
                    {approvedApproval.decided_at && (
                      <span className="font-normal text-muted-foreground ml-1">
                        · {new Date(approvedApproval.decided_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Execution Result ── */}
                {i === 3 && exec && (
                  <div className="space-y-2 text-xs animate-slide-in-top">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={exec.overall_success ? "completed" : (exec.requires_human_intervention ? "human-intervention" : "failed")} label={exec.overall_success ? "Success" : (exec.requires_human_intervention ? "Escalated" : "Failed")} />
                      <span className="text-muted-foreground">  <span className="font-medium text-foreground">{exec.container_status_after}</span></span>
                    </div>
                    <div className="p-3 rounded-md bg-secondary/50 border border-border space-y-1.5">
                      {exec.error ? (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <div className="flex items-center gap-2 mb-1 text-destructive font-semibold">
                            <AlertTriangle size={14} /> Stage Failed
                          </div>
                          <p className="text-[10px] sm:text-xs text-destructive/90 font-mono mt-2 break-all whitespace-pre-wrap">{exec.error}</p>
                        </div>
                      ) : (
                        <>
                          {exec.notes && (!isStreaming || globalPhase >= 3) && <p><span className="font-medium text-foreground"></span> <span className="text-muted-foreground">{exec.notes}</span></p>}
                          {exec.explanation && (!isStreaming || globalPhase >= 3) && (
                            <ExplanationBlock title="Execution Details" explanation={exec.explanation} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {i === 3 && !exec && <p className="text-xs text-muted-foreground">Execution completed (no detailed result stored)</p>}

                {/* ── Validation Result ── */}
                {i === 4 && validation && (
                  <div className="space-y-2 text-xs animate-slide-in-top">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={validation.validated ? "completed" : "failed"} label={validation.validated ? "Validated" : "Not Validated"} />
                      <span className="text-muted-foreground">Confidence: <span className={validation.confidence > 0.85 ? "text-success font-medium" : "text-warning font-medium"}>{Math.round(validation.confidence * 100)}%</span></span>
                      <span className="text-muted-foreground">Service: <span className="font-medium text-foreground">{validation.service_status}</span></span>
                    </div>
                    <div className="p-3 rounded-md bg-secondary/50 border border-border space-y-1.5">
                      {validation.error ? (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <div className="flex items-center gap-2 mb-1 text-destructive font-semibold">
                            <AlertTriangle size={14} /> Stage Failed
                          </div>
                          <p className="text-[10px] sm:text-xs text-destructive/90 font-mono mt-2 break-all whitespace-pre-wrap">{validation.error}</p>
                        </div>
                      ) : (
                        <>
                          {validation.notes && (!isStreaming || globalPhase >= 4) && <p><span className="font-medium text-foreground"></span> <span className="text-muted-foreground">{validation.notes}</span></p>}
                          {validation.explanation && (!isStreaming || globalPhase >= 4) && (
                            <ExplanationBlock title="Validation Details" explanation={validation.explanation} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {i === 4 && !validation && (
                  <p className="text-xs text-muted-foreground">
                    {activeStatus === "awaiting_human_intervention"
                      ? "Skipped — no automated fix was applied. Human action required before validation can run."
                      : "Validation completed (no detailed result stored)"}
                  </p>
                )}
              </>
            )}
          </StepItem>
        );
      })}

      {/* Run history if multiple runs */}
      {detail?.runs && detail.runs.length > 1 && (
        <div className="mt-3 p-3 rounded-md bg-info/5 border border-info/15 text-xs text-muted-foreground">
          <p className="font-medium text-info mb-1">Run History ({detail.runs.length} attempts)</p>
          {detail.runs.map((r: typeof detail.runs[0]) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="font-mono text-[10px]">Run #{r.run_number}</span>
              <StatusBadge variant={r.status === "completed" ? "completed" : r.status === "failed" ? "failed" : "in-progress"} label={r.status} />
              <span className="text-[10px]">{r.started_at && new Date(r.started_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}



// ── Sub-components: Detailed Logs Modal ───────────────────────────────────────

function LogLine({ log, detail }: { log: any; detail?: any }) {
  const [expanded, setExpanded] = useState(false);

  const ts = log.timeMs || (() => {
    const d = log.timestamp ? new Date(log.timestamp) : new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  })();

  const type = log.eventType || log.event || "agent_log";
  const level = log.level ? `[${log.level.toUpperCase()}]` : "[INFO]";

  // Extract extra deeply-nested data
  const { message, event, eventType, timestamp, timeMs, level: _l, stage, action, tool_used, success, duration_ms, tool, content, output_preview, agent, logger, run_id, incident_id, has_tools, model, ...baseExtraData } = log;

  const extraData = { ...baseExtraData };

  // Show ONLY the LangChain verbose trace for this specific agent's response.
  // No structured output / no extra metadata — keep the dropdown focused on the
  // ReAct chain (Entering chain → Action → Observation → Finished chain).
  Object.keys(extraData).forEach((k) => delete extraData[k]);

  if (type === "agent_response" || log.message?.includes("received response")) {
    const runs = detail?.runs || [];
    if (runs.length > 0) {
      const latestRun = runs[runs.length - 1];
      const ag = log.agent || "";
      let result: any = null;
      if (ag === "rca") result = latestRun.rca_result;
      else if (ag === "plan") result = latestRun.plan_result;
      else if (ag === "execution") result = latestRun.execution_result;
      else if (ag === "validation") result = latestRun.validation_result;

      if (result?.verbose_log) {
        extraData["Execution Trace"] = result.verbose_log;
      }
    }
  }

  // Live verbose_log field on the log event itself takes precedence
  if (log.verbose_log) {
    extraData["Execution Trace"] = log.verbose_log;
  }

  const extraKeys = Object.keys(extraData);
  const hasExtra = extraKeys.length > 0 && typeof extraData === "object";

  const toggle = () => {
    if (hasExtra) setExpanded(!expanded);
  };

  let mainLine = null;

  if (type === "agent_log") {
    mainLine = (
      <>
        <span className="opacity-70 shrink-0 w-[80px]">{ts}</span>
        <span className="text-success shrink-0 w-[60px] font-semibold">{level}</span>
        <span className="break-words text-foreground/90 flex-1 flex justify-between items-start">
          <span>{log.message}</span>
          {hasExtra && <ChevronDown size={14} className={`shrink-0 opacity-40 mt-0.5 transition-transform ${expanded ? 'rotate-180 text-info' : ''}`} />}
        </span>
      </>
    );
  } else if (type === "thinking") {
    mainLine = (
      <>
        <span className="shrink-0 w-[80px]">{ts}</span>
        <span className="break-words pl-[67px] flex-1 flex justify-between items-start">
          <span>› {log.content || log.message}</span>
          {hasExtra && <ChevronDown size={14} className={`shrink-0 opacity-40 mt-0.5 transition-transform ${expanded ? 'rotate-180 text-info' : ''}`} />}
        </span>
      </>
    );
  } else if (type === "tool_execution") {
    const isSuccess = log.success !== false;
    const dur = log.duration_ms ? ` (${log.duration_ms}ms)` : "";
    const out = log.output_preview || log.message || "";
    mainLine = (
      <>
        <span className="text-muted-foreground shrink-0 w-[80px]">{ts}</span>
        <span className={`break-words pl-[67px] flex-1 flex justify-between items-start ${isSuccess ? "text-success" : "text-destructive"}`}>
          <span>{isSuccess ? "✓" : "✗"} {log.tool}{dur} — {out}</span>
          {hasExtra && <ChevronDown size={14} className={`shrink-0 opacity-40 mt-0.5 transition-transform ${expanded ? 'rotate-180 text-info' : ''}`} />}
        </span>
      </>
    );
  } else {
    const msg = log.message || log.event || "processing";
    mainLine = (
      <>
        <span className="opacity-70 shrink-0 w-[80px]">{ts}</span>
        <span className="text-success shrink-0 w-[60px] font-semibold">{level}</span>
        <span className="break-words text-foreground/90 flex-1 flex justify-between items-start">
          <span>{msg}</span>
          {hasExtra && <ChevronDown size={14} className={`shrink-0 opacity-40 mt-0.5 transition-transform ${expanded ? 'rotate-180 text-info' : ''}`} />}
        </span>
      </>
    );
  }

  const textColorClasses = type === "thinking" ? "text-muted-foreground" : (type === "tool_execution" ? "" : "text-info/90");

  return (
    <div className="flex flex-col mb-1 group">
      <div
        onClick={toggle}
        className={`flex gap-3 font-mono px-2 py-1 rounded transition-colors ${textColorClasses} ${hasExtra ? "cursor-pointer hover:bg-secondary/40" : "hover:bg-transparent"}`}
      >
        {mainLine}
      </div>

      {expanded && hasExtra && (
        <div className="mt-2 mb-4 ml-[154px] mr-4 p-4 rounded-md bg-secondary/20 border border-border/50 text-xs text-muted-foreground font-mono space-y-4 overflow-x-auto shadow-sm">
          {Object.entries(extraData).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1.5 text-foreground/80">
              <span className="font-semibold text-info/70 uppercase tracking-wider text-[10px]">{k.replace(/_/g, ' ')}</span>
              <div className={`whitespace-pre-wrap p-3 rounded-md border font-mono text-[11px] leading-snug max-h-[400px] overflow-y-auto custom-scrollbar ${k === "Execution Trace" ? "bg-[#0c0c0c] text-green-500 border-green-900/30" : "bg-background/50 border-border/40"}`}>
                {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailedLogsModal({ incidentId, incidentStatus, title, onClose }: { incidentId: string, incidentStatus: string, title: string, onClose: () => void }) {
  const isCompleted = ["resolved", "failed", "cancelled", "awaiting_human_intervention", "rca_failed"].includes(incidentStatus);
  const { data: restDetail, isLoading } = useIncidentDetail(incidentId);
  const { data: streamData } = useIncidentStream(!isCompleted ? incidentId : null);

  const detail = (streamData && streamData.status !== "new") ? streamData : restDetail;
  const logs = detail?.logs || [];
  const totalLogs = logs.length;

  const handleDownload = () => {
    let content = `Execution Logs: ${title}\n======================================================\n\n`;

    if (totalLogs === 0) {
      content += "No detailed log entries found.\n";
    } else {
      logs.forEach((log: any) => {
        const timeStr = log.timestamp ? String(log.timestamp).split('T').pop()?.split('Z')[0] : new Date().toLocaleTimeString('en-US', { hour12: false });
        let msg = log.message || log.event || "processing";
        if (log.action) msg += `: ${log.action}`;
        if (log.tool_used) msg += ` (tool: ${log.tool_used})`;
        content += `[${timeStr}] ${log.agent || "system"}: ${msg}\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `incident_logs_${incidentId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-4xl border border-border/50 rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[80vh] h-[800px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <h3 className="font-semibold text-sm text-foreground">Execution Logs: {title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors">Close</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6 bg-card/50 font-mono text-[11px] min-h-[300px] custom-scrollbar">
          {isLoading && !detail && (
            <div className="flex flex-col justify-center items-center h-full text-muted-foreground text-sm gap-3">
              <Loader2 className="animate-spin text-info" size={24} />
              <p>Fetching logs...</p>
            </div>
          )}
          {!isLoading && totalLogs === 0 && detail && (
            <div className="text-muted-foreground italic text-center mt-8">No logs available for this incident.</div>
          )}
          {(!isLoading || detail) && (() => {
            // Logs arrive newest-first; render chronologically (start → end).
            const orderedLogs = [...logs].reverse();
            // Group logs by stage (preserves first-seen stage order)
            const groups: Record<string, any[]> = {};
            orderedLogs.forEach((log: any) => {
              const stage = log.stage || "Pipeline Start";
              if (!groups[stage]) groups[stage] = [];
              groups[stage].push(log);
            });

            return Object.entries(groups).map(([stageName, stageLogs]) => (
              <div key={stageName} className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
                    {stageName.replace(/_/g, ' ')}
                  </span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                <div className="space-y-1">
                  {stageLogs.map((log, idx) => (
                    <LogLine key={`${stageName}-${idx}`} log={log} detail={detail} />
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
          <div className="text-[10px] text-muted-foreground">
            Showing {totalLogs} of {totalLogs} agent events
          </div>
          <button onClick={handleDownload} disabled={totalLogs === 0} className="px-4 py-1.5 text-xs font-semibold bg-secondary text-foreground border border-border hover:bg-secondary/80 transition-colors rounded disabled:opacity-50">
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
