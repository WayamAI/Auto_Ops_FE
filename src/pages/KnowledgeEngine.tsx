import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { AlertTriangle, ArrowRight, TrendingUp, X, CheckCircle, Clock, Shield, FileText, Play, Search, ChevronDown, ChevronRight, Brain, Target, Database, Layers } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from "recharts";
import { toast } from "sonner";

const velocityData = [
  { week: "W1", count: 2 }, { week: "W2", count: 3 }, { week: "W3", count: 5 }, { week: "W4", count: 4 },
  { week: "W5", count: 3 }, { week: "W6", count: 6 }, { week: "W7", count: 4 }, { week: "W8", count: 5 },
  { week: "W9", count: 3 }, { week: "W10", count: 4 }, { week: "W11", count: 5 }, { week: "W12", count: 4 },
];

const diskTrendData = [
  { day: "Mar 1", usage: 72 }, { day: "Mar 5", usage: 74 }, { day: "Mar 9", usage: 76 }, { day: "Mar 13", usage: 78 },
  { day: "Mar 17", usage: 80 }, { day: "Mar 21", usage: 82 }, { day: "Mar 25", usage: 84 }, { day: "Mar 29", usage: 86 },
  { day: "Apr 2", usage: 88, projected: true }, { day: "Apr 6", usage: 90, projected: true },
];

const patterns = [
  { name: "MID Server JVM Heap Exhaustion → Service Restart", source: "Mined from ServiceNow", status: "active" as const, applied: 18, success: "94.4%", avg: "2m 15s", confidence: 93 },
  { name: "Credential Expiry → Service Account Rotation + Job Restart", source: "Mined from ServiceNow", status: "active" as const, applied: 23, success: "91.3%", avg: "3m 40s", confidence: 94 },
  { name: "Zombie Upgrade State → Binary Resync + Wrapper Rebuild", source: "Learned Autonomously", status: "active" as const, applied: 9, success: "88.9%", avg: "6m 15s", confidence: 89 },
  { name: "ECC Queue Saturation → Thread Pool Expansion + Queue Drain", source: "Mined from ServiceNow", status: "active" as const, applied: 14, success: "92.9%", avg: "4m 50s", confidence: 91 },
  { name: "Disk Space Critical (Linux) → Temp File Cleanup", source: "Mined from ServiceNow", status: "active" as const, applied: 34, success: "97.1%", avg: "1m 45s", confidence: 96 },
  { name: "Pod OOMKilled → Resource Limit Adjustment", source: "Learned Autonomously", status: "active" as const, applied: 12, success: "91.7%", avg: "3m 20s", confidence: 88 },
  { name: "API Latency Spike → Cache Flush + Pool Reset", source: "Learned Autonomously", status: "active" as const, applied: 22, success: "95.5%", avg: "2m 50s", confidence: 91 },
  { name: "Database Connection Exhaustion → Pool Reset", source: "Mined from ServiceNow", status: "active" as const, applied: 15, success: "93.3%", avg: "4m 10s", confidence: 90 },
  { name: "SSL Certificate Expiration → Renewal Escalation", source: "Manually Contributed", status: "active" as const, applied: 8, success: "100%", avg: "1m 30s", confidence: 95 },
  { name: "MID Server Port Block → Firewall Diagnostic", source: "Learned Autonomously", status: "refining" as const, applied: 7, success: "85.7%", avg: "4m 30s", confidence: 82 },
  { name: "EC2 Instance Status Check Failure → Reboot", source: "Mined from ServiceNow", status: "active" as const, applied: 11, success: "90.9%", avg: "5m 45s", confidence: 87 },
  { name: "Kubernetes Node Pressure → Pod Rescheduling", source: "Learned Autonomously", status: "refining" as const, applied: 4, success: "75%", avg: "6m 20s", confidence: 72 },
  { name: "MID Server Memory Leak → Scheduled Restart", source: "Pattern Analysis", status: "proposed" as const, applied: 0, success: "N/A", avg: "N/A", confidence: 71 },
];

const sourceColors: Record<string, string> = {
  "Mined from ServiceNow": "text-info",
  "Learned Autonomously": "text-success",
  "Manually Contributed": "text-muted-foreground",
  "Pattern Analysis": "text-metric-purple",
};

const feedbackSteps = [
  "ServiceNow Incident Data",
  "Pattern Mining",
  "Candidate Patterns",
  "Shadow Mode Validation",
  "Active Patterns",
  "Agent Execution",
  "Outcome Feedback",
];

const milestones = [
  { week: "Week 1 (Feb 24)", text: "Analyzed 2,340 historical incidents, extracted 47 candidate patterns" },
  { week: "Week 2 (Mar 3)", text: "31 patterns validated in shadow mode (66% match rate)" },
  { week: "Week 3 (Mar 10)", text: "23 patterns activated, autonomously resolved 34 incidents" },
  { week: "Week 4 (Mar 17)", text: "Pattern accuracy improved to 91% after feedback from 3 failed remediations" },
  { week: "Week 5 (Mar 24)", text: "4 new patterns discovered from autonomous remediation outcomes" },
];

type ModalType = "change-request" | "preventive-remediation" | "flag-servicenow" | null;

interface PredictiveInsight {
  icon: typeof AlertTriangle;
  color: string;
  title: string;
  desc: string;
  confidence: number;
  action: string;
  modalType: ModalType;
  details: {
    impactedCIs: string[];
    relatedIncidents: string[];
    recommendation: string;
    riskLevel: string;
    timeline?: string;
    trendData?: boolean;
  };
}

const insights: PredictiveInsight[] = [
  {
    icon: AlertTriangle, color: "text-warning", title: "Recurring Incident Cluster",
    desc: "MID Server crashes on prod-mid-03 have occurred 4 times in 30 days with increasing frequency. Root cause appears to be insufficient JVM heap. Recommend permanent heap size increase.",
    confidence: 84, action: "Create Change Request", modalType: "change-request",
    details: {
      impactedCIs: ["prod-mid-03 (MID Server)", "4 downstream discovery sources", "ServiceNow CMDB sync jobs"],
      relatedIncidents: ["INC0012789 (Mar 25)", "INC0012654 (Mar 18)", "INC0012501 (Mar 10)", "INC0012398 (Mar 3)"],
      recommendation: "Increase JVM heap from 2GB to 4GB via wrapper.conf. Schedule during maintenance window.",
      riskLevel: "Low",
      timeline: "Recommended: within 48 hours",
    }
  },
  {
    icon: TrendingUp, color: "text-warning", title: "Risk Indicator",
    desc: "Disk utilization on prod-db-01 trending upward at 2% per week. At current rate, will breach 90% threshold in ~11 days.",
    confidence: 91, action: "Launch Preventive Remediation", modalType: "preventive-remediation",
    details: {
      impactedCIs: ["prod-db-01 (PostgreSQL Primary)", "prod-db-02 (Replica)", "3 application services"],
      relatedIncidents: ["INC0011987 (Feb 15) — similar disk exhaustion on prod-db-02"],
      recommendation: "Archive logs older than 30 days, clean WAL segments, and set up automated archival policy.",
      riskLevel: "Medium",
      timeline: "Projected breach: April 7, 2026",
      trendData: true,
    }
  },
  {
    icon: AlertTriangle, color: "text-destructive", title: "Change Risk Warning",
    desc: "Deployment scheduled tonight modifies authentication service. Similar changes correlated with 3 past incidents. Recommend additional monitoring.",
    confidence: 78, action: "Flag in ServiceNow", modalType: "flag-servicenow",
    details: {
      impactedCIs: ["auth-service (Kubernetes Deployment)", "login-gateway (API Gateway)", "mobile-auth-proxy"],
      relatedIncidents: ["INC0012401 (Mar 4) — auth outage post deploy", "INC0011876 (Feb 12) — token validation failure", "INC0011543 (Jan 28) — session timeout regression"],
      recommendation: "Add 30-minute enhanced monitoring post deploy. Pre stage rollback pipeline. Notify on call SRE.",
      riskLevel: "High",
      timeline: "Deployment scheduled: Tonight 11:00 PM EST",
    }
  },
];

export default function KnowledgeEngine() {
  const [activeTab, setActiveTab] = useState("Pattern Library");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedInsight, setSelectedInsight] = useState<PredictiveInsight | null>(null);
  const [modalStep, setModalStep] = useState<"details" | "submitting" | "submitted">("details");
  const [patternSearch, setPatternSearch] = useState("");
  const [patternFilter, setPatternFilter] = useState<"all" | "active" | "refining" | "proposed">("all");
  const [expandedPattern, setExpandedPattern] = useState<number | null>(null);

  const tabs = ["Pattern Library", "Mining Dashboard", "Predictive Insights", "Feedback Loop"];

  const filteredPatterns = patterns.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(patternSearch.toLowerCase()) || p.source.toLowerCase().includes(patternSearch.toLowerCase());
    const matchFilter = patternFilter === "all" || p.status === patternFilter;
    return matchSearch && matchFilter;
  });

  const openModal = (insight: PredictiveInsight) => {
    setSelectedInsight(insight);
    setActiveModal(insight.modalType);
    setModalStep("details");
  };

  const handleSubmit = () => {
    setModalStep("submitting");
    setTimeout(() => {
      setModalStep("submitted");
      if (activeModal === "change-request") {
        toast.success("Change Request CHG0004601 created in ServiceNow");
      } else if (activeModal === "preventive-remediation") {
        toast.success("Preventive remediation action ACT-PRV-042 launched");
      } else if (activeModal === "flag-servicenow") {
        toast.success("Risk advisory attached to CHG0004599 in ServiceNow");
      }
    }, 2000);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedInsight(null);
    setModalStep("details");
  };

  const renderModalContent = () => {
    if (!selectedInsight) return null;
    const { details } = selectedInsight;

    if (modalStep === "submitting") {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {activeModal === "change-request" && "Creating change request in ServiceNow..."}
            {activeModal === "preventive-remediation" && "Launching preventive remediation pipeline..."}
            {activeModal === "flag-servicenow" && "Flagging change record with risk advisory..."}
          </p>
        </div>
      );
    }

    if (modalStep === "submitted") {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <CheckCircle size={32} className="text-success" />
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {activeModal === "change-request" && "Change Request Created"}
              {activeModal === "preventive-remediation" && "Remediation Launched"}
              {activeModal === "flag-servicenow" && "Risk Advisory Flagged"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeModal === "change-request" && "CHG0004601 — Increase JVM heap on prod-mid-03. Assigned to: Server Team. Priority: P3"}
              {activeModal === "preventive-remediation" && "ACT-PRV-042 — Disk cleanup on prod-db-01. ETA: 3 minutes. Agent: Infrastructure Agent"}
              {activeModal === "flag-servicenow" && "Risk note attached to CHG0004599. Deployment team and on call SRE notified via ServiceNow."}
            </p>
          </div>
          <button onClick={closeModal} className="h-8 px-4 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
            Done
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Insight summary */}
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <selectedInsight.icon size={16} className={selectedInsight.color} />
          <div>
            <p className="text-xs font-semibold text-foreground">{selectedInsight.title}</p>
            <p className="text-[10px] text-muted-foreground">Confidence: {selectedInsight.confidence}% · Risk: {details.riskLevel}</p>
          </div>
          <StatusBadge variant={details.riskLevel === "High" ? "error" : details.riskLevel === "Medium" ? "warning" : "active"} label={`${details.riskLevel} Risk`} className="ml-auto" />
        </div>

        <p className="text-xs text-muted-foreground">{selectedInsight.desc}</p>

        {/* Trend chart for disk insight */}
        {details.trendData && (
          <div className="bg-secondary/30 rounded-lg p-3 border border-border">
            <p className="text-[10px] font-medium text-foreground mb-2">Disk Utilization Trend — prod-db-01</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={diskTrendData}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[65, 95]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 10, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} formatter={(v: number) => [`${v}%`, "Usage"]} />
                <Area type="monotone" dataKey="usage" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.1} strokeWidth={2} />
                <Line type="monotone" dataKey="usage" stroke="hsl(var(--warning))" dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-warning mt-1">⚠ Projected to breach 90% threshold by April 7</p>
          </div>
        )}

        {/* Impacted CIs */}
        <div>
          <p className="text-[10px] font-semibold text-foreground mb-1.5">Impacted Configuration Items</p>
          <div className="space-y-1">
            {details.impactedCIs.map((ci, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                {ci}
              </div>
            ))}
          </div>
        </div>

        {/* Related Incidents */}
        <div>
          <p className="text-[10px] font-semibold text-foreground mb-1.5">Related Incidents</p>
          <div className="space-y-1">
            {details.relatedIncidents.map((inc, i) => (
              <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <FileText size={10} className="text-info shrink-0" />
                <span className="font-mono text-[10px]">{inc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-primary/5 border border-primary/15 rounded-md p-3">
          <p className="text-[10px] font-semibold text-primary mb-1">Recommendation</p>
          <p className="text-xs text-muted-foreground">{details.recommendation}</p>
          {details.timeline && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
              <Clock size={10} />
              {details.timeline}
            </div>
          )}
        </div>

        {/* Action-specific fields */}
        {activeModal === "change-request" && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-foreground">Change Request Details</p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Type:</span> <span className="text-foreground">Standard Change</span></div>
              <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Priority:</span> <span className="text-foreground">P3 — Moderate</span></div>
              <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Assignment:</span> <span className="text-foreground">Server Team</span></div>
              <div className="bg-secondary/50 rounded p-2"><span className="text-muted-foreground">Window:</span> <span className="text-foreground">Next maintenance</span></div>
            </div>
          </div>
        )}

        {activeModal === "preventive-remediation" && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-foreground">Remediation Plan</p>
            <div className="space-y-1.5">
              {["Archive PostgreSQL WAL segments older than 7 days", "Compress and rotate application logs > 30 days", "Clean /tmp directory of stale session files", "Verify disk usage dropped below 75%", "Create automated archival cron job"].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-medium text-foreground">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeModal === "flag-servicenow" && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-foreground">Risk Advisory Contents</p>
            <div className="bg-destructive/5 border border-destructive/15 rounded-md p-3 text-xs text-muted-foreground space-y-1.5">
              <p><span className="font-medium text-destructive">Risk Score:</span> 7.2 / 10 (based on 3 correlated past incidents)</p>
              <p><span className="font-medium text-foreground">Recommended Actions:</span></p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>Enable enhanced monitoring for 30 minutes post deploy</li>
                <li>Pre stage rollback pipeline with one-click revert</li>
                <li>Notify on call SRE (currently: @jchen) before deployment</li>
                <li>Verify health checks within 5 minutes of deploy completion</li>
              </ul>
              <p><span className="font-medium text-foreground">Attach to:</span> CHG0004599 — auth-service deployment</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <button onClick={handleSubmit} className="h-8 px-4 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            <Play size={10} />
            {activeModal === "change-request" && "Create Change Request"}
            {activeModal === "preventive-remediation" && "Launch Remediation"}
            {activeModal === "flag-servicenow" && "Flag in ServiceNow"}
          </button>
          <button onClick={closeModal} className="h-8 px-4 rounded text-xs font-medium bg-secondary text-foreground border border-border hover:bg-secondary/80 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const getModalTitle = () => {
    if (activeModal === "change-request") return "Create Change Request";
    if (activeModal === "preventive-remediation") return "Launch Preventive Remediation";
    if (activeModal === "flag-servicenow") return "Flag Risk in ServiceNow";
    return "";
  };

  return (
    <AppLayout title="Knowledge Engine" subtitle="Pattern learning and remediation intelligence">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard 
          value="127" 
          label="Total Patterns Learned" 
          subText="84 ServiceNow · 31 autonomous · 12 manual" 
          accentColor="blue" 
          icon={<Brain size={24} />}
        />
        <MetricCard 
          value="91.3%" 
          label="Pattern Accuracy" 
          subText="+2.1% this month" 
          accentColor="green" 
          icon={<CheckCircle size={24} />}
        />
        <MetricCard 
          value="4.2" 
          label="Patterns/Week" 
          subText="Learning velocity" 
          accentColor="purple" 
          icon={<TrendingUp size={24} />}
        />
        <MetricCard 
          value="73%" 
          label="Coverage" 
          subText="73% of incident types matched" 
          accentColor="amber" 
          icon={<Target size={24} />}
        />
      </div>

      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Pattern Library" && (
        <div className="space-y-4">
          {/* Search and filter bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={patternSearch}
                onChange={e => setPatternSearch(e.target.value)}
                placeholder="Search patterns..."
                className="w-full h-8 pl-9 pr-3 rounded-md bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "active", "refining", "proposed"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPatternFilter(f)}
                  className={`h-8 px-3 rounded text-[10px] font-medium border transition-colors ${patternFilter === f ? "bg-primary/15 text-primary border-primary/20" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} {f === "all" ? `(${patterns.length})` : `(${patterns.filter(p => p.status === f).length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-md border border-border/40 divide-y divide-border/20 shadow-sm overflow-hidden">
            {filteredPatterns.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">No patterns match your search.</div>
            )}
            {filteredPatterns.map((p, i) => {
              const realIndex = patterns.indexOf(p);
              const isExpanded = expandedPattern === realIndex;
              return (
                <div key={realIndex} className="hover:bg-secondary/30 transition-colors">
                  <button onClick={() => setExpandedPattern(isExpanded ? null : realIndex)} className="w-full p-4 text-left">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                        <div>
                          <h4 className="text-xs font-semibold text-foreground">{p.name}</h4>
                          <p className={`text-[10px] mt-0.5 ${sourceColors[p.source] || "text-muted-foreground"}`}>{p.source}</p>
                        </div>
                      </div>
                      <StatusBadge variant={p.status} />
                    </div>
                    <div className="flex gap-4 text-[10px] text-muted-foreground ml-5">
                      <span>Applied: <span className="text-foreground">{p.applied}×</span></span>
                      <span>Success: <span className="text-success">{p.success}</span></span>
                      <span>Avg: <span className="text-foreground">{p.avg}</span></span>
                      <span>Confidence: <span className={p.confidence > 85 ? "text-success" : p.confidence > 60 ? "text-warning" : "text-destructive"}>{p.confidence}%</span></span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 ml-5 space-y-3 border-t border-border pt-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-secondary/50 rounded-md p-2.5">
                          <p className="text-[10px] text-muted-foreground">Last Applied</p>
                          <p className="text-xs font-medium text-foreground">{p.applied > 0 ? "2 hours ago" : "Never"}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-md p-2.5">
                          <p className="text-[10px] text-muted-foreground">Avg Resolution</p>
                          <p className="text-xs font-medium text-foreground">{p.avg}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-md p-2.5">
                          <p className="text-[10px] text-muted-foreground">Failure Rate</p>
                          <p className="text-xs font-medium text-foreground">{p.success !== "N/A" ? `${(100 - parseFloat(p.success)).toFixed(1)}%` : "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {p.status === "proposed" && (
                          <button onClick={(e) => { e.stopPropagation(); toast.success(`Pattern "${p.name}" promoted to Shadow Mode`); }} className="h-7 px-3 rounded text-[10px] font-medium bg-success/15 text-success border border-success/20">
                            Promote to Shadow Mode
                          </button>
                        )}
                        {p.status === "refining" && (
                          <button onClick={(e) => { e.stopPropagation(); toast.success(`Pattern "${p.name}" activated`); }} className="h-7 px-3 rounded text-[10px] font-medium bg-success/15 text-success border border-success/20">
                            Activate Pattern
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); toast.info("Pattern history opened"); }} className="h-7 px-3 rounded text-[10px] font-medium bg-secondary text-foreground border border-border">
                          View History
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toast.info("Pattern configuration opened"); }} className="h-7 px-3 rounded text-[10px] font-medium bg-secondary text-foreground border border-border">
                          Configure
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "Mining Dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <MetricCard 
              value="2,847" 
              label="Historical Incidents Scanned" 
              accentColor="blue" 
              icon={<Search size={24} />}
            />
            <MetricCard 
              value="84" 
              label="Patterns Extracted" 
              subText="47 candidate → 37 validated" 
              accentColor="green" 
              icon={<Layers size={24} />}
            />
            <MetricCard 
              value="12" 
              label="Pending Review" 
              subText="7 high confidence" 
              accentColor="amber" 
              icon={<Clock size={24} />}
            />
          </div>

          {/* Learning velocity chart */}
          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Pattern Learning Velocity</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={velocityData}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 10, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Recent Mining Activity</h3></div>
            <div className="divide-y divide-border">
              {[
                { date: "March 25", text: "Analyzed 18 incidents of type 'API Timeout'. Found 14/18 (78%) resolved by connection pool reset. Pattern proposed with 78% confidence.", status: "proposed" },
                { date: "March 22", text: "Analyzed 23 incidents of type 'Disk Space Critical' on Linux servers. Found 19/23 (83%) resolved by clearing /tmp and /var/log. Pattern created.", status: "active" },
                { date: "March 20", text: "Correlation discovered between MID Server failures and ServiceNow upgrade windows. 5 of 8 recent incidents occurred within 2 hours of platform update.", status: "refining" },
                { date: "March 18", text: "Identified new error signature in auth-service pod crashes — OutOfMemory pattern differs from known JVM heap pattern. New pattern proposed.", status: "proposed" },
              ].map((m, i) => (
                <div key={i} className="p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{m.date}</p>
                    <p className="text-xs text-foreground/80">{m.text}</p>
                  </div>
                  <StatusBadge variant={m.status as any} className="ml-3 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Coverage Gap Analysis</h3></div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Incident Type</th><th className="px-4 py-2 text-left">Frequency</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Opportunity</th>
              </tr></thead>
              <tbody>
                {[
                  { type: "Network Timeout", freq: "12/month", status: "No pattern", opp: "High" },
                  { type: "Permission Denied Errors", freq: "8/month", status: "No pattern", opp: "Medium" },
                  { type: "Load Balancer Health Check Failure", freq: "6/month", status: "Refining", opp: "High" },
                  { type: "DNS Resolution Failure", freq: "4/month", status: "No pattern", opp: "Medium" },
                  { type: "Storage IOPS Throttling", freq: "3/month", status: "No pattern", opp: "Low" },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-foreground">{r.type}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.freq}</td>
                    <td className="px-4 py-2.5"><StatusBadge variant={r.status === "Refining" ? "refining" : "error"} label={r.status} /></td>
                    <td className="px-4 py-2.5"><StatusBadge variant={r.opp === "High" ? "active" : r.opp === "Medium" ? "warning" : "idle"} label={r.opp} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Predictive Insights" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">AI-generated predictions based on pattern analysis and trend monitoring</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-muted-foreground">Live monitoring active</span>
            </div>
          </div>
          {insights.map((p, i) => (
            <div key={i} className="bg-card rounded-md border border-border/40 p-5 hover:border-success/30 transition-all duration-300 shadow-sm group relative">
              <div className="flex items-center gap-2 mb-2">
                <p.icon size={14} className={p.color} />
                <h4 className="text-xs font-semibold text-foreground">{p.title}</h4>
                <StatusBadge variant={p.confidence > 85 ? "active" : p.confidence > 75 ? "warning" : "idle"} label={`${p.confidence}% confidence`} className="ml-auto" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal(p)}
                  className="h-7 px-3 rounded text-[10px] font-medium bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors flex items-center gap-1.5"
                >
                  <Play size={9} />
                  {p.action}
                </button>
                <button
                  onClick={() => toast.info(`Insight details: ${p.title}`)}
                  className="h-7 px-3 rounded text-[10px] font-medium bg-secondary text-foreground border border-border hover:bg-secondary/80 transition-colors"
                >
                  View Evidence
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Feedback Loop" && (
        <div className="space-y-6">
          <div className="bg-card rounded-md border border-border/40 p-8 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-8 text-center">Continuous Learning Cycle</h3>
            <div className="flex items-center justify-center flex-wrap gap-2">
              {feedbackSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground">
                    {step}
                  </div>
                  {i < feedbackSteps.length - 1 && <ArrowRight size={14} className="text-primary" />}
                </div>
              ))}
              <ArrowRight size={14} className="text-primary" />
              <span className="text-[10px] text-primary font-medium">↺ loops back</span>
            </div>
          </div>

          {/* Recent feedback */}
          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Recent Feedback Events</h3></div>
            <div className="divide-y divide-border">
              {[
                { icon: CheckCircle, color: "text-success", text: "Pattern 'MID Server JVM Heap → Restart' applied successfully on INC0012789. Confidence updated: 93% → 94%", time: "12 min ago" },
                { icon: AlertTriangle, color: "text-warning", text: "Pattern 'K8s Node Pressure → Reschedule' partial match on INC0012795. 2 of 3 pods rescheduled. Confidence adjusted: 75% → 72%", time: "1 hr ago" },
                { icon: CheckCircle, color: "text-success", text: "Pattern 'Disk Space Critical → Cleanup' applied successfully on INC0012780. Resolution time: 1m 32s", time: "3 hrs ago" },
                { icon: Shield, color: "text-info", text: "Shadow mode validation: 'API Timeout → Pool Reset' matched 4/5 test incidents correctly. Ready for promotion.", time: "6 hrs ago" },
              ].map((e, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <e.icon size={14} className={`${e.color} shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <p className="text-xs text-foreground/80">{e.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{e.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Learning Milestones</h3></div>
            <div className="divide-y divide-border">
              {milestones.map((m, i) => (
                <div key={i} className="p-4 flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    {i < milestones.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{m.week}</p>
                    <p className="text-[10px] text-muted-foreground">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-popover border border-border/60 rounded-md w-full max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border/40 sticky top-0 bg-popover/95 backdrop-blur-md z-10 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">{getModalTitle()}</h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
