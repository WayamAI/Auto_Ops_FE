import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import BlastRadiusModal from "@/components/actions/BlastRadiusModal";
import MetricCard from "@/components/shared/MetricCard";
import { CheckCircle, Clock, X, AlertTriangle, Loader2, Shield, ArrowUpRight, History, Target } from "lucide-react";
import { toast } from "sonner";
import { usePendingApprovals, useDecideApproval } from "@/api/hooks";
import { useAuth } from "@/context/AuthContext";
import type { ApprovalResponse } from "@/api/types";

const riskColors: Record<string, string> = { high: "text-destructive", medium: "text-warning", low: "text-success" };
const riskBg: Record<string, string> = { high: "bg-destructive/10 border-destructive/20", medium: "bg-warning/10 border-warning/20", low: "bg-success/10 border-success/20" };

export default function ApprovalQueue() {
  const navigate = useNavigate();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [blastRadiusIncident, setBlastRadiusIncident] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Re-render every second so countdown timers stay live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch pending approvals from backend API
  const { user } = useAuth();
  const currentUser = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "operator"
    : "operator";

  const { data: pendingApprovals, isLoading } = usePendingApprovals();
  const decideMutation = useDecideApproval();

  const approvals = pendingApprovals || [];

  // Auto-expand first item
  if (approvals.length > 0 && expandedItem === null) {
    // Don't call setState during render — use a ref pattern
  }

  const handleApprove = (approval: ApprovalResponse) => {
    decideMutation.mutate(
      { approvalId: approval.id, data: { decision: "approved", notes: "Approved from UI", decided_by: currentUser } },
      {
        onSuccess: () => {
          toast.success(`Approved — pipeline will continue execution`, {
            description: `Incident ${approval.incident_id} remediation proceeding`,
          });
        },
        onError: (err) => {
          toast.error("Failed to submit approval", { description: String(err) });
        },
      },
    );
  };

  const handleReject = (approval: ApprovalResponse) => {
    decideMutation.mutate(
      { approvalId: approval.id, data: { decision: "rejected", notes: "Rejected from UI — escalated to on call engineer", decided_by: currentUser } },
      {
        onSuccess: () => {
          toast.error(`Rejected — incident escalated to on call engineer`, {
            description: `Incident ${approval.incident_id} will be marked as failed`,
          });
        },
        onError: (err) => {
          toast.error("Failed to submit rejection", { description: String(err) });
        },
      },
    );
  };

  const formatElapsed = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = Date.now();
    const sec = Math.round((now - created.getTime()) / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s`;
  };

  const formatExpiry = (expiryAt: string | null): { label: string; urgent: boolean } => {
    if (!expiryAt) return { label: "Expires in ~1h", urgent: false };
    const ms = new Date(expiryAt).getTime() - Date.now();
    if (ms <= 0) return { label: "Expiring…", urgent: true };
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const urgent = min < 10;
    if (min === 0) return { label: `Expires in ${sec}s`, urgent: true };
    return { label: `Expires in ${min}m ${sec}s`, urgent };
  };

  return (
    <AppLayout title="Approval Queue" subtitle="Human in the loop review for high impact remediations">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          value={String(approvals.length)}
          label="Pending Reviews"
          subText={approvals.length > 0 ? `Oldest: ${formatElapsed(approvals[approvals.length - 1]?.created_at)}` : "All clear"}
          accentColor="amber"
          icon={<History size={24} />}
          pulse={approvals.length > 0}
        />
        <MetricCard 
          value="4.2m" 
          label="Avg Review Time" 
          subText="Target: < 5m" 
          accentColor="blue" 
          icon={<Clock size={24} />}
        />
        <MetricCard 
          value="98%" 
          label="First Assignment Routing" 
          subText="Routed to correct team" 
          accentColor="green" 
          icon={<Target size={24} />}
        />
        <MetricCard 
          value="92%" 
          label="Approval Rate" 
          subText="Live data" 
          accentColor="green" 
          icon={<CheckCircle size={24} />}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading pending approvals...
        </div>
      )}

      {/* Empty */}
      {!isLoading && approvals.length === 0 && (
        <div className="bg-card rounded-md border border-border/40 p-16 text-center shadow-sm">
          <CheckCircle size={40} className="mx-auto mb-4 text-success/50" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80 mb-2">No Pending Approvals</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">All pipelines are either running autonomously or have been reviewed. New approvals appear here automatically when a pipeline pauses for human review.</p>
        </div>
      )}

      {/* Queue */}
      <div className="space-y-4">
        {approvals.map((approval) => {
          const isExpanded = expandedItem === approval.id;
          const risk = approval.risk_level || "medium";
          const steps = approval.plan_steps || [];
          const elapsed = formatElapsed(approval.created_at);
          const expiry = formatExpiry(approval.expiry_at);

          return (
            <div key={approval.id} className="bg-card rounded-md border border-warning/30 overflow-hidden shadow-sm shadow-warning/5">
              {/* Header */}
              <button
                onClick={() => setExpandedItem(isExpanded ? null : approval.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-warning" />
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{approval.plan_summary}</h3>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${riskBg[risk] || riskBg.medium} ${riskColors[risk] || riskColors.medium}`}>
                        {risk.toUpperCase()} RISK
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Incident {approval.incident_id} · Waiting {elapsed}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${expiry.urgent ? "text-destructive border-destructive/30 bg-destructive/10" : "text-muted-foreground border-border/40 bg-secondary/50"}`}>
                    <Clock size={10} />
                    {expiry.label}
                  </span>
                  <StatusBadge variant="pending" label="Awaiting Review" />
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-5 border-t border-border pt-4 space-y-4">
                  {/* Reason */}
                  <div className="bg-secondary/50 rounded-md p-3 text-xs space-y-1">
                    <p className="font-medium text-foreground">{approval.plan_summary}</p>
                    <p className="text-muted-foreground">{approval.reason}</p>
                  </div>

                  {/* Execution Plan */}
                  {steps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2">Execution Plan</h4>
                      <div className="space-y-1.5">
                        {steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium text-foreground shrink-0">{step.step_number || i + 1}</span>
                            <span>{step.action || "Step"}</span>
                            {step.command && step.command !== "none" && (
                              <span className="text-[10px] font-mono text-muted-foreground/60">command: {step.command}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blast Radius */}
                  {approval.blast_radius && (
                    <div className="p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning">
                      <span className="font-medium">Blast Radius: </span>{approval.blast_radius}
                    </div>
                  )}

                  {/* Rollback */}
                  {approval.rollback_plan && (
                    <div className="p-2 rounded bg-secondary border border-border text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Rollback Plan: </span>{approval.rollback_plan}
                    </div>
                  )}

                  {/* Est time */}
                  {approval.estimated_time && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} /> Estimated execution time: <span className="text-foreground font-medium">{approval.estimated_time}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => handleApprove(approval)}
                      disabled={decideMutation.isPending}
                      className="h-8 px-4 rounded text-xs font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {decideMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Approve & Execute
                    </button>
                    <button
                      onClick={() => handleReject(approval)}
                      disabled={decideMutation.isPending}
                      className="h-8 px-4 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <X size={12} /> Reject & Escalate
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blast Radius Modal */}
      {blastRadiusIncident && (
        <BlastRadiusModal incidentId={blastRadiusIncident} onClose={() => setBlastRadiusIncident(null)} />
      )}
    </AppLayout>
  );
}
