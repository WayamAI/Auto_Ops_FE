import StatusBadge from "@/components/shared/StatusBadge";
import WhyPanel from "./WhyPanel";

export type ActionStatus = "active" | "paused" | "pending-review" | "completed";

export interface ActionItem {
  id: string;
  title: string;
  agent: string;
  icon: string;
  startTime: string;
  elapsed: string;
  incidentId: string;
  status: ActionStatus;
  progress: number;
  steps: StepData[];
  learningOutcome?: string[];
  logEntries: LogEntry[];
}

export interface StepData {
  title: string;
  time: string;
  status: "done" | "in-progress" | "pending" | "paused";
  content: React.ReactNode;
}

export interface LogEntry {
  time: string;
  level: "INFO" | "DEBUG" | "WARN" | "ERROR";
  source: string;
}

const _allActions: ActionItem[] = [
  // ACTION 1: MID Server — starts PAUSED
  {
    id: "ACT-001",
    title: "MID Server Service Down",
    agent: "MID Server Agent",
    icon: "⚡",
    startTime: "10:42:15 AM",
    elapsed: "3m 08s",
    incidentId: "INC0012789",
    status: "paused",
    progress: 50,
    steps: [
      {
        title: "Root Cause Analysis", time: "10:42:15 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Conclusion: JVM heap exhaustion on prod-mid-03 caused by stuck SOAP transaction</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <StatusBadge variant="active" label="87% — High" />
            </div>
            <WhyPanel title="Why This Conclusion?">
              <p className="font-semibold text-foreground">Evidence Gathered:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>ServiceNow CMDB: prod-mid-03 is a Linux MID Server, connected to 4 downstream discovery sources</li>
                <li>Incident History: 3 similar incidents in last 90 days — all resolved by restarting MID Server</li>
                <li>Log Analysis (SSH): wrapper.log shows java.lang.OutOfMemoryError at 10:41:58</li>
              </ul>
              <p className="font-semibold text-foreground mt-2">Historical Pattern Match:</p>
              <p>Matches pattern 'MID Server JVM heap exhaustion → service restart' (success rate: 94.4%)</p>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Remediation Planning", time: "10:42:48 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Strategy: Restart MID Server service. Risk: Low</p>
            <WhyPanel title="Why This Strategy?">
              <p>Historical data: 3 past incidents with identical root cause resolved by service restart</p>
              <p className="mt-1">Risk: Low — service restart affects only MID Server functions</p>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Executing Fix", time: "", status: "paused",
        content: <p className="text-xs text-muted-foreground">Paused — awaiting resume to execute midserver_start on prod-mid-03</p>
      },
      {
        title: "Validating Resolution", time: "", status: "pending",
        content: null
      },
    ],
    logEntries: [
      { time: "10:42:15", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "10:42:16", level: "INFO", source: "agent: rca event: agent_request" },
      { time: "10:42:18", level: "INFO", source: "Agent [rca] sending request to Codestral-2501" },
      { time: "10:42:20", level: "INFO", source: "Agent [rca] received response from Codestral-2501" },
      { time: "10:42:26", level: "INFO", source: "agent: plan event: agent_request" },
      { time: "10:42:28", level: "INFO", source: "Agent [plan] sending request to gpt-4o-mini" },
      { time: "10:42:30", level: "INFO", source: "Agent [plan] received response from gpt-4o-mini" },
      { time: "10:42:48", level: "WARN", source: "agent: pipeline_paused by operator" },
    ],
  },
  // ACTION 2: Pod OOMKilled — active, analyzing
  {
    id: "ACT-002",
    title: "Pod OOMKilled — auth-service",
    agent: "Container Agent",
    icon: "🐳",
    startTime: "10:44:56 AM",
    elapsed: "1m 27s",
    incidentId: "INC0012801",
    status: "active",
    progress: 25,
    steps: [
      {
        title: "Alert Received", time: "10:44:56 AM", status: "done",
        content: (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Source: Kubernetes Event Watcher</p>
            <p>Incident: <a href="/incident/INC0012801" className="incident-id cursor-pointer hover:underline">INC0012801</a> — Pod OOMKilled in auth-service namespace (prod-k8s-01)</p>
            <p>Severity: P2 · CI: auth-service-pod-7f8d4 (Kubernetes Pod, Production)</p>
            <p>Restart Count: 4 in last 30 minutes</p>
          </div>
        )
      },
      {
        title: "Root Cause Analysis", time: "10:45:12 AM", status: "in-progress",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Analyzing memory usage patterns and container resource limits...</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence (interim):</span>
              <StatusBadge variant="analyzing" label="64% — Building" />
            </div>
            <WhyPanel title="Analysis In Progress">
              <p className="font-semibold text-foreground">Evidence Gathered So Far:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>K8s API: Pod auth-service-7f8d4 in namespace 'auth-service' terminated with OOMKilled (exit code 137)</li>
                <li>Container memory limit: 512Mi — current request peak: 498Mi (97% utilization)</li>
                <li>Deployment history: Memory limit was reduced from 1Gi to 512Mi in change CHG0004521 (3 days ago)</li>
                <li>Similar pods in same deployment: 2 of 3 replicas showing high memory pressure</li>
              </ul>
              <p className="font-semibold text-foreground mt-2">Pending Checks:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Heap dump analysis from container runtime</li>
                <li>Correlation with recent code deployments</li>
                <li>Historical memory trend over 7 days</li>
              </ul>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Remediation Planning", time: "", status: "pending",
        content: null
      },
      {
        title: "Executing Fix", time: "", status: "pending",
        content: null
      },
      {
        title: "Validating Resolution", time: "", status: "pending",
        content: null
      },
    ],
    logEntries: [
      { time: "10:44:56", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "10:44:57", level: "INFO", source: "agent: alert_intake event: k8s_event_received" },
      { time: "10:44:58", level: "INFO", source: "agent: rca event: agent_request" },
      { time: "10:45:00", level: "INFO", source: "Agent [rca] sending request to Codestral-2501" },
      { time: "10:45:04", level: "INFO", source: "Agent [rca] querying K8s API for pod metrics" },
      { time: "10:45:08", level: "INFO", source: "Agent [rca] retrieved deployment history from CMDB" },
      { time: "10:45:12", level: "DEBUG", source: "Agent [rca] interim confidence: 64% — awaiting heap analysis" },
    ],
  },
  // ACTION 3: Pending Review — Firewall rule
  {
    id: "ACT-003",
    title: "Port 443 Blocked — gateway-lb-01",
    agent: "Network Agent",
    icon: "🌐",
    startTime: "10:38:22 AM",
    elapsed: "6m 45s",
    incidentId: "INC0012798",
    status: "pending-review",
    progress: 60,
    steps: [
      {
        title: "Alert Received", time: "10:38:22 AM", status: "done",
        content: (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Source: ServiceNow Event Management</p>
            <p>Incident: <span className="incident-id">INC0012798</span> — Port 443 blocked on gateway-lb-01</p>
            <p>Severity: P1 · CI: gateway-lb-01 (Load Balancer, Production)</p>
          </div>
        )
      },
      {
        title: "Root Cause Analysis", time: "10:38:40 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Conclusion: Firewall rule ACL-4821 was modified during maintenance window, blocking inbound HTTPS traffic</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <StatusBadge variant="active" label="72% — Medium" />
            </div>
            <WhyPanel title="Why This Conclusion?">
              <p className="font-semibold text-foreground">Evidence:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Port scan: Port 443 unreachable from external network, reachable internally</li>
                <li>Firewall audit log: Rule ACL-4821 modified at 10:35:00 by user 'net-admin-02'</li>
                <li>Change correlation: CHG0004589 (network maintenance) was active at time of change</li>
              </ul>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Remediation Planning", time: "10:39:15 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Strategy: Revert firewall rule ACL-4821 to pre maintenance state</p>
            <p className="text-xs text-warning font-medium">⚠ Requires approval — Production network change with medium confidence (72%)</p>
            <WhyPanel title="Why Approval Required?">
              <p>Two policy triggers:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Confidence 72% is below auto execute threshold (85%)</li>
                <li>Production network changes always require approval per policy</li>
              </ul>
              <p className="mt-1">Blast radius: 3 downstream services — payment-api, checkout-web, mobile-gateway</p>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Awaiting Approval", time: "10:39:15 AM", status: "in-progress",
        content: (
          <div className="text-xs text-warning space-y-1">
            <p className="font-medium">Waiting for human approval to execute firewall rule revert</p>
            <p className="text-muted-foreground">Elapsed wait: 5m 52s</p>
          </div>
        )
      },
      {
        title: "Executing Fix", time: "", status: "pending",
        content: null
      },
      {
        title: "Validating Resolution", time: "", status: "pending",
        content: null
      },
    ],
    logEntries: [
      { time: "10:38:22", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "10:38:24", level: "INFO", source: "agent: rca event: agent_request" },
      { time: "10:38:30", level: "INFO", source: "Agent [rca] running port scan on gateway-lb-01" },
      { time: "10:38:35", level: "INFO", source: "Agent [rca] querying firewall audit logs" },
      { time: "10:38:40", level: "INFO", source: "Agent [rca] completed — confidence: 72%" },
      { time: "10:39:00", level: "INFO", source: "agent: plan event: agent_request" },
      { time: "10:39:15", level: "WARN", source: "agent: approval_required — production network change + confidence < 85%" },
    ],
  },
  // ACTION 4: Pending Review — SSL cert
  {
    id: "ACT-004",
    title: "SSL Certificate Expiring — api.example.com",
    agent: "Security Operations Agent",
    icon: "🔒",
    startTime: "10:35:11 AM",
    elapsed: "9m 56s",
    incidentId: "INC0012712",
    status: "pending-review",
    progress: 60,
    steps: [
      {
        title: "Alert Received", time: "10:35:11 AM", status: "done",
        content: (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Source: Certificate Monitoring</p>
            <p>Incident: <span className="incident-id">INC0012712</span> — SSL cert expires in 5 days on api.example.com</p>
            <p>Severity: P3 · CI: api.example.com (Web Service, Production)</p>
          </div>
        )
      },
      {
        title: "Root Cause Analysis", time: "10:35:28 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Certificate CN=api.example.com expires March 31, 2026. Auto renewal failed due to DNS validation timeout.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <StatusBadge variant="active" label="91% — High" />
            </div>
          </div>
        )
      },
      {
        title: "Remediation Planning", time: "10:36:02 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Strategy: Trigger manual cert renewal via Let's Encrypt and update DNS TXT record</p>
            <p className="text-xs text-warning font-medium">⚠ Requires approval — Certificate operations require human sign off per security policy</p>
          </div>
        )
      },
      {
        title: "Awaiting Approval", time: "10:36:02 AM", status: "in-progress",
        content: (
          <div className="text-xs text-warning space-y-1">
            <p className="font-medium">Waiting for security team approval</p>
            <p className="text-muted-foreground">Elapsed wait: 9m 05s</p>
          </div>
        )
      },
      { title: "Executing Fix", time: "", status: "pending", content: null },
      { title: "Validating Resolution", time: "", status: "pending", content: null },
    ],
    logEntries: [
      { time: "10:35:11", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "10:35:15", level: "INFO", source: "Agent [rca] checking certificate details via openssl" },
      { time: "10:35:22", level: "INFO", source: "Agent [rca] querying Let's Encrypt renewal logs" },
      { time: "10:35:28", level: "INFO", source: "Agent [rca] completed — DNS validation timeout identified" },
      { time: "10:36:02", level: "WARN", source: "agent: approval_required — security policy: cert operations" },
    ],
  },
  // ACTION 5: Active — Disk space
  {
    id: "ACT-005",
    title: "Disk Space Critical — prod-app-07",
    agent: "Infrastructure Agent",
    icon: "💾",
    startTime: "10:46:30 AM",
    elapsed: "0m 42s",
    incidentId: "INC0012805",
    status: "active",
    progress: 75,
    steps: [
      {
        title: "Root Cause Analysis", time: "10:46:30 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">/var/log at 96% — old application logs consuming 18GB. Pattern match: Disk Space Critical → Temp File Cleanup (97.1% success rate)</p>
      },
      {
        title: "Remediation Planning", time: "10:46:42 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Strategy: Clean /tmp and rotate /var/log files older than 7 days. Risk: Low</p>
      },
      {
        title: "Executing Fix", time: "10:46:55 AM", status: "in-progress",
        content: <p className="text-xs text-muted-foreground">Running log rotation and tmp cleanup on prod-app-07...</p>
      },
      { title: "Validating Resolution", time: "", status: "pending", content: null },
    ],
    logEntries: [
      { time: "10:46:30", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "10:46:32", level: "INFO", source: "Agent [rca] checking disk usage via SSH" },
      { time: "10:46:38", level: "INFO", source: "Agent [rca] identified /var/log at 96% — pattern match found" },
      { time: "10:46:42", level: "INFO", source: "Agent [plan] auto approved — high confidence (96%), low risk, non critical path" },
      { time: "10:46:55", level: "INFO", source: "Agent [execution] running log_rotate + tmp_cleanup on prod-app-07" },
    ],
  },
  // Completed actions
  {
    id: "ACT-100",
    title: "MID Server Service Down",
    agent: "MID Server Agent",
    icon: "⚡",
    startTime: "9:37:28 AM",
    elapsed: "2m 26s",
    incidentId: "INC0012743",
    status: "completed",
    progress: 100,
    steps: [
      {
        title: "Alert Received", time: "9:37:28 AM", status: "done",
        content: (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Source: ServiceNow Event Management</p>
            <p>Incident: <span className="incident-id">INC0012743</span> — MID Server service unresponsive on prod-mid-03</p>
            <p>Severity: P2 · CI: prod-mid-03 (Linux Server, Production)</p>
          </div>
        )
      },
      {
        title: "Root Cause Analysis", time: "9:37:45 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Conclusion: JVM heap exhaustion caused by stuck SOAP transaction</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <StatusBadge variant="active" label="87% — High" />
            </div>
          </div>
        )
      },
      {
        title: "Remediation Planning", time: "9:38:12 AM", status: "done",
        content: <p className="text-xs text-foreground font-medium">Strategy: Restart MID Server service and validate heartbeat restoration</p>
      },
      {
        title: "Executing Fix", time: "9:38:48 AM", status: "done",
        content: (
          <div className="space-y-1 text-xs text-muted-foreground">
            <StatusBadge variant="completed" label="Success" />
            <p className="mt-1">MID Server service restarted successfully.</p>
            <p className="font-mono text-[10px] bg-secondary/50 rounded p-2 mt-1">Tool: midserver_start → "MID Server service is running successfully"</p>
          </div>
        )
      },
      {
        title: "Validating Resolution", time: "9:39:54 AM", status: "done",
        content: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <StatusBadge variant="active" label="100%" />
            </div>
            <p className="text-xs text-muted-foreground">MID Server running, no critical errors. System resources adequate.</p>
          </div>
        )
      },
    ],
    learningOutcome: [
      "Pattern 'MID Server JVM heap exhaustion → service restart' reinforced (18th successful application)",
      "Recommendation logged: Consider investigating JVM heap size configuration to prevent recurrence",
      "ServiceNow INC0012743 updated with resolution notes and full RCA",
    ],
    logEntries: [
      { time: "09:37:28", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "09:37:30", level: "INFO", source: "agent: rca event: agent_request" },
      { time: "09:37:35", level: "INFO", source: "Agent [rca] sending request to Codestral-2501" },
      { time: "09:37:45", level: "INFO", source: "Agent [rca] completed — confidence: 87%" },
      { time: "09:38:00", level: "INFO", source: "Agent [plan] sending request to gpt-4o-mini" },
      { time: "09:38:12", level: "INFO", source: "Agent [plan] completed — auto approved" },
      { time: "09:38:48", level: "INFO", source: "Agent [execution] tool: midserver_start — success" },
      { time: "09:39:54", level: "INFO", source: "Agent [validation] all checks passed — resolved" },
      { time: "09:39:54", level: "DEBUG", source: "agent: pipeline_complete total_time: 146s" },
    ],
  },
  {
    id: "ACT-101",
    title: "Database Connection Pool Exhaustion",
    agent: "Database Agent",
    icon: "🗄️",
    startTime: "9:15:03 AM",
    elapsed: "4m 10s",
    incidentId: "INC0012756",
    status: "completed",
    progress: 100,
    steps: [
      {
        title: "Root Cause Analysis", time: "9:15:03 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Connection pool on prod-db-02 exhausted (200/200 connections). 47 idle connections from stale app server sessions.</p>
      },
      {
        title: "Remediation Planning", time: "9:15:30 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Strategy: Kill idle connections {'>'} 30min and restart connection pool. Risk: Low</p>
      },
      {
        title: "Executing Fix", time: "9:16:12 AM", status: "done",
        content: (
          <div className="space-y-1 text-xs text-muted-foreground">
            <StatusBadge variant="completed" label="Success" />
            <p className="mt-1">47 idle connections terminated. Pool reset to 153/200 active.</p>
          </div>
        )
      },
      {
        title: "Validating Resolution", time: "9:19:13 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Connection pool healthy. New connections establishing normally. App response times returned to baseline.</p>
      },
    ],
    learningOutcome: [
      "Pattern 'DB connection exhaustion → idle connection cleanup' applied successfully (16th time)",
      "ServiceNow INC0012756 updated and resolved",
    ],
    logEntries: [
      { time: "09:15:03", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "09:15:15", level: "INFO", source: "Agent [rca] querying pg_stat_activity" },
      { time: "09:16:12", level: "INFO", source: "Agent [execution] killed 47 idle connections" },
      { time: "09:19:13", level: "INFO", source: "Agent [validation] pool healthy — resolved" },
    ],
  },
  {
    id: "ACT-102",
    title: "API Latency Spike — order-api",
    agent: "Application Performance Agent",
    icon: "📊",
    startTime: "8:52:17 AM",
    elapsed: "2m 50s",
    incidentId: "INC0012734",
    status: "completed",
    progress: 100,
    steps: [
      {
        title: "Root Cause Analysis", time: "8:52:17 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Redis cache hit rate dropped to 12% (baseline: 94%). Stale cache invalidation event triggered full cache eviction.</p>
      },
      {
        title: "Remediation Planning", time: "8:52:45 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Strategy: Flush and warm Redis cache, reset connection pool. Risk: Low</p>
      },
      {
        title: "Executing Fix", time: "8:53:20 AM", status: "done",
        content: (
          <div className="space-y-1 text-xs text-muted-foreground">
            <StatusBadge variant="completed" label="Success" />
            <p className="mt-1">Cache flushed and rewarmed. Hit rate restored to 91% within 60s.</p>
          </div>
        )
      },
      {
        title: "Validating Resolution", time: "8:55:07 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">API p95 latency: 145ms (back to baseline from 2,300ms). Cache hit rate: 93%.</p>
      },
    ],
    learningOutcome: [
      "Pattern 'API Latency Spike → Cache Flush + Pool Reset' reinforced (23rd application)",
      "ServiceNow INC0012734 resolved automatically",
    ],
    logEntries: [
      { time: "08:52:17", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "08:52:30", level: "INFO", source: "Agent [rca] checking Redis metrics" },
      { time: "08:53:20", level: "INFO", source: "Agent [execution] cache flush + warm complete" },
      { time: "08:55:07", level: "INFO", source: "Agent [validation] latency baseline restored — resolved" },
    ],
  },
  {
    id: "ACT-103",
    title: "Disk Space Critical — prod-web-12",
    agent: "Infrastructure Agent",
    icon: "💾",
    startTime: "8:30:44 AM",
    elapsed: "1m 38s",
    incidentId: "INC0012721",
    status: "completed",
    progress: 100,
    steps: [
      {
        title: "Root Cause Analysis", time: "8:30:44 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">/var/log at 94% — rotated logs not being cleaned. 22GB of compressed archives older than 30 days.</p>
      },
      {
        title: "Executing Fix", time: "8:31:15 AM", status: "done",
        content: (
          <div className="space-y-1 text-xs text-muted-foreground">
            <StatusBadge variant="completed" label="Success" />
            <p className="mt-1">Removed 22GB of archived logs. Disk usage: 94% → 61%.</p>
          </div>
        )
      },
      {
        title: "Validating Resolution", time: "8:32:22 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Disk usage stable at 61%. Cron job for log rotation verified active.</p>
      },
    ],
    learningOutcome: ["Pattern 'Disk Space Critical → Temp File Cleanup' applied (35th time)", "ServiceNow INC0012721 resolved"],
    logEntries: [
      { time: "08:30:44", level: "INFO", source: "agent: pipeline_start" },
      { time: "08:31:15", level: "INFO", source: "Agent [execution] removed 22GB archived logs" },
      { time: "08:32:22", level: "INFO", source: "Agent [validation] disk stable at 61% — resolved" },
    ],
  },
  {
    id: "ACT-104",
    title: "EC2 Instance Status Check Failed",
    agent: "Cloud Resource Agent",
    icon: "☁️",
    startTime: "8:10:05 AM",
    elapsed: "5m 42s",
    incidentId: "INC0012710",
    status: "completed",
    progress: 100,
    steps: [
      {
        title: "Root Cause Analysis", time: "8:10:05 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">Instance i-0a7f3c2e in us-east-1 failed system status check. Underlying hardware issue detected by AWS.</p>
      },
      {
        title: "Executing Fix", time: "8:11:30 AM", status: "done",
        content: (
          <div className="space-y-1 text-xs text-muted-foreground">
            <StatusBadge variant="completed" label="Success" />
            <p className="mt-1">Stop/start cycle performed to migrate to healthy hardware. Instance running on new host.</p>
          </div>
        )
      },
      {
        title: "Validating Resolution", time: "8:15:47 AM", status: "done",
        content: <p className="text-xs text-muted-foreground">All status checks passing. Application health check OK. No data loss detected.</p>
      },
    ],
    learningOutcome: ["Pattern 'EC2 Status Check Failure → Reboot' applied (12th time)", "ServiceNow INC0012710 resolved"],
    logEntries: [
      { time: "08:10:05", level: "INFO", source: "agent: pipeline_start" },
      { time: "08:11:30", level: "INFO", source: "Agent [execution] EC2 stop/start completed" },
      { time: "08:15:47", level: "INFO", source: "Agent [validation] all checks passing — resolved" },
    ],
  },
  // ACTION: Zombie Upgrade Loop — MID Server binary mismatch after patch
  {
    id: "ACT-006",
    title: "MID Server Zombie Upgrade Loop — prod-mid-07",
    agent: "MID Server Agent",
    icon: "🧟",
    startTime: "11:02:33 AM",
    elapsed: "4m 18s",
    incidentId: "INC0012815",
    status: "active",
    progress: 70,
    steps: [
      {
        title: "Alert Received", time: "11:02:33 AM", status: "done",
        content: (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Source: ServiceNow MID Server Monitor</p>
            <p>Incident: <a href="/incident/INC0012815" className="incident-id cursor-pointer hover:underline">INC0012815</a> — MID Server prod-mid-07 shows "Up" but rejecting all tasks after Vancouver→Washington patch</p>
            <p>Severity: P2 · CI: prod-mid-07 (Windows Server, Production — London DC)</p>
            <p>ECC Queue: 34 tasks stuck in "Ready" state for 12+ minutes</p>
          </div>
        )
      },
      {
        title: "Root Cause Analysis", time: "11:02:52 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Conclusion: File permission lock on agent/bin folder — GPO "AppLocker" policy prevented wrapper.exe replacement during auto upgrade. Local binary version (Vancouver) mismatches database version (Washington), causing task rejection.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <StatusBadge variant="active" label="91% — High" />
            </div>
            <WhyPanel title="Why This Conclusion?">
              <p className="font-semibold text-foreground">Evidence Gathered:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>ServiceNow CMDB: prod-mid-07 is a Windows MID Server (London DC), patched from Vancouver to Washington 45 min ago</li>
                <li>MID Server status API: Status="Up", but validated_version="Vancouver" while expected_version="Washington"</li>
                <li>Windows Event Log (via WinRM): "Access Denied" errors on agent\bin\wrapper.exe at 10:18:04 — source: AppLocker GPO</li>
                <li>ECC Queue: 34 output records stuck in "Ready" — MID Server rejecting due to version mismatch</li>
                <li>Incident History: Similar issue on prod-mid-04 (2 months ago) — resolved by granting Full Control + clearing work/temp dirs</li>
              </ul>
              <p className="font-semibold text-foreground mt-2">Historical Pattern Match:</p>
              <p>Matches pattern 'MID Server Upgrade Failed → Permission Fix + Cache Clear' (success rate: 88.9%, 8 of 9 occurrences)</p>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Remediation Planning", time: "11:03:18 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Strategy: Stop MID Server service, grant Full Control to service account, clear work/temp dirs, restart to trigger auto upgrade resync. Risk: Low</p>
            <WhyPanel title="Why This Strategy?">
              <p>Historical data: 8 of 9 past "Zombie Upgrade" incidents resolved by permission fix + cache clear + restart</p>
              <p className="mt-1">Risk: Low — only affects MID Server functions during restart window (~90s)</p>
              <p className="mt-1">Alternative considered: Manual binary replacement — rejected (higher risk, longer downtime)</p>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Executing Fix", time: "11:04:45 AM", status: "in-progress",
        content: (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Connecting to prod-mid-07 via WinRM...</p>
            <p className="font-mono text-[10px] bg-secondary/50 rounded p-2 mt-1">Tool: winrm_exec → "Stop-Service MIDServer -Force" — waiting for confirmation</p>
          </div>
        )
      },
      {
        title: "Validating Resolution", time: "", status: "pending",
        content: null
      },
    ],
    logEntries: [
      { time: "11:02:33", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "11:02:35", level: "INFO", source: "agent: alert_intake event: midserver_monitor_alert" },
      { time: "11:02:38", level: "INFO", source: "Agent [rca] sending request to Codestral-2501" },
      { time: "11:02:42", level: "INFO", source: "Agent [rca] querying MID Server status API — status: Up, version mismatch detected" },
      { time: "11:02:46", level: "INFO", source: "Agent [rca] connecting via WinRM to prod-mid-07 for event log analysis" },
      { time: "11:02:50", level: "INFO", source: "Agent [rca] found AppLocker GPO blocking wrapper.exe replacement — Access Denied at 10:18:04" },
      { time: "11:02:52", level: "INFO", source: "Agent [rca] completed — confidence: 91%, root cause: GPO file permission lock" },
      { time: "11:03:00", level: "INFO", source: "agent: plan event: agent_request" },
      { time: "11:03:10", level: "INFO", source: "Agent [plan] sending request to gpt-4o-mini" },
      { time: "11:03:18", level: "INFO", source: "Agent [plan] completed — auto approved (confidence 91%, low risk)" },
      { time: "11:04:45", level: "INFO", source: "Agent [execution] connecting to prod-mid-07 via WinRM" },
      { time: "11:04:48", level: "INFO", source: "Agent [execution] running: Stop-Service MIDServer -Force" },
      { time: "11:04:52", level: "INFO", source: "Agent [execution] verifying no java.exe or wrapper.exe processes running" },
    ],
  },
  // ACTION: ECC Queue Backlog — Thread Exhaustion (requires human approval for JVM memory change)
  {
    id: "ACT-007",
    title: "ECC Queue Backlog — Thread Exhaustion on prod-mid-09",
    agent: "MID Server Agent",
    icon: "🔄",
    startTime: "11:08:15 AM",
    elapsed: "5m 32s",
    incidentId: "INC0012823",
    status: "pending-review",
    progress: 55,
    steps: [
      {
        title: "Alert Received", time: "11:08:15 AM", status: "done",
        content: (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Source: ServiceNow ECC Queue Monitor</p>
            <p>Incident: <a href="/incident/INC0012823" className="incident-id cursor-pointer hover:underline">INC0012823</a> — 247 ECC Queue records stuck in "Ready" state; Discovery schedules timing out across APAC sites</p>
            <p>Severity: P1 · CI: prod-mid-09 (Linux Server, Production — Singapore DC)</p>
            <p>Impact: 3 Discovery schedules stalled, 12 JDBC integrations queued</p>
          </div>
        )
      },
      {
        title: "Root Cause Analysis", time: "11:08:42 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Conclusion: Max thread limit reached (25/25 threads busy). High network latency to APAC targets (avg 340ms RTT) keeping threads occupied 4x longer than baseline. JVM heap at 87% — insufficient for current workload.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <StatusBadge variant="active" label="89% — High" />
            </div>
            <WhyPanel title="Why This Conclusion?">
              <p className="font-semibold text-foreground">Evidence Gathered:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>threads.log analysis: 25/25 threads in "Busy" state — 18 Discovery, 7 JDBC integration</li>
                <li>Network latency: avg 340ms RTT to APAC targets (baseline: 80ms) — threads held 4x longer</li>
                <li>ECC Queue: 247 output records in "Ready" state, oldest: 12 minutes</li>
                <li>JVM heap: 87% utilization (1.74GB / 2GB) — approaching OOM threshold</li>
                <li>MID Server config: mid.threads.max = 25 (default), wrapper-override.conf: -Xmx2048m</li>
                <li>Similar incident on prod-mid-06 (3 weeks ago) resolved by increasing threads + JVM memory</li>
              </ul>
              <p className="font-semibold text-foreground mt-2">Historical Pattern Match:</p>
              <p>Matches pattern 'ECC Queue Backlog → Thread Limit + JVM Tuning' (success rate: 92.3%, 12 of 13 occurrences)</p>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Remediation Planning", time: "11:09:30 AM", status: "done",
        content: (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-medium">Strategy: Increase JVM memory to 4GB, raise mid.threads.max to 50, implement MID Server cluster for APAC site load balancing</p>
            <p className="text-xs text-warning font-medium">⚠ Requires approval — JVM memory allocation change on production MID Server requires human sign off per change policy</p>
            <WhyPanel title="Why Approval Required?">
              <p>Two policy triggers:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>JVM memory increase (-Xmx change) is a production configuration change requiring CAB approval</li>
                <li>Thread pool increase may affect system resources on shared infrastructure</li>
              </ul>
              <p className="mt-1">Blast radius: During restart, 3 Discovery schedules and 12 JDBC integrations will queue temporarily (~120s)</p>
              <p className="mt-1">Rollback: Revert wrapper-override.conf and mid.threads.max to original values</p>
            </WhyPanel>
          </div>
        )
      },
      {
        title: "Awaiting Approval", time: "11:09:30 AM", status: "in-progress",
        content: (
          <div className="text-xs text-warning space-y-1">
            <p className="font-medium">⏳ Waiting for human approval to increase JVM memory allocation (-Xmx 2GB → 4GB) and thread pool (25 → 50)</p>
            <p className="text-muted-foreground">Elapsed wait: 4m 17s · Policy: Production MID Server config changes require human in the loop</p>
          </div>
        )
      },
      {
        title: "Executing Fix", time: "", status: "pending",
        content: null
      },
      {
        title: "Validating Resolution", time: "", status: "pending",
        content: null
      },
    ],
    logEntries: [
      { time: "11:08:15", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
      { time: "11:08:17", level: "INFO", source: "agent: alert_intake event: ecc_queue_backlog_alert" },
      { time: "11:08:20", level: "INFO", source: "Agent [rca] sending request to Codestral-2501" },
      { time: "11:08:25", level: "INFO", source: "Agent [rca] analyzing threads.log on prod-mid-09 via SSH" },
      { time: "11:08:30", level: "INFO", source: "Agent [rca] 25/25 threads busy — 18 Discovery, 7 JDBC" },
      { time: "11:08:34", level: "INFO", source: "Agent [rca] network latency check: avg 340ms RTT to APAC targets" },
      { time: "11:08:38", level: "INFO", source: "Agent [rca] JVM heap at 87% (1.74GB/2GB)" },
      { time: "11:08:42", level: "INFO", source: "Agent [rca] completed — confidence: 89%, root cause: thread exhaustion + high latency" },
      { time: "11:09:00", level: "INFO", source: "agent: plan event: agent_request" },
      { time: "11:09:15", level: "INFO", source: "Agent [plan] sending request to gpt-4o-mini" },
      { time: "11:09:30", level: "WARN", source: "agent: approval_required — JVM memory change on production MID Server requires human approval" },
    ],
  },
];

// Credential Expiry Completed Action
const credentialExpiryAction: ActionItem = {
  id: "ACT-105",
  title: "MID Server Credential Expiry — int-mid-03",
  agent: "MID Server Agent",
  icon: "🔑",
  startTime: "9:14:22 AM",
  elapsed: "3m 52s",
  incidentId: "INC0012801",
  status: "completed",
  progress: 100,
  steps: [
    {
      title: "Alert Received", time: "9:14:22 AM", status: "done",
      content: (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Source: ServiceNow Credential Monitor (scheduled check)</p>
          <p>Incident: <a href="/incident/INC0012801" className="incident-id cursor-pointer hover:underline">INC0012801</a> — MID Server int-mid-03 credential svc_snow_mid_int03@corp.internal expires in 2 days</p>
          <p>Severity: P3 · CI: int-mid-03 (Windows Server 2019, Integration DC)</p>
          <p>Impact: 6 JDBC integration jobs will fail on credential expiry</p>
        </div>
      )
    },
    {
      title: "Root Cause Analysis", time: "9:14:31 AM", status: "done",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-foreground font-medium">Conclusion: Service account password age = 88 days (policy max: 90 days). AD account status: Active, not locked. Last successful auth: 4h ago. Vault record days_until_expiry = 2.</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <StatusBadge variant="active" label="98% — High" />
          </div>
          <p className="text-xs text-muted-foreground">Classification: Proactive credential expiry (not yet failed)</p>
          <WhyPanel title="Why This Conclusion?">
            <p className="font-semibold text-foreground">Evidence:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>AD account svc_snow_mid_int03: password age 88 days, max 90 — expiry in 2 days</li>
              <li>HashiCorp Vault: days_until_expiry = 2, rotation not yet triggered</li>
              <li>Last auth: 4h ago — currently functional, but will fail on expiry</li>
              <li>6 JDBC integration jobs depend on this credential</li>
            </ul>
          </WhyPanel>
        </div>
      )
    },
    {
      title: "Remediation Planning", time: "9:14:45 AM", status: "done",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-foreground font-medium">Strategy: Trigger HashiCorp Vault AD rotation for svc_snow_mid_int03@corp.internal → update ServiceNow sys_credentials → restart int-mid-03 MID service → validate ECC queue resumes. Risk: Low.</p>
          <p className="text-xs text-muted-foreground">Backup MID available: int-mid-04 (same DC, same job scope)</p>
          <WhyPanel title="Why This Strategy?">
            <p>Proactive rotation prevents credential expiry failure. Vault API handles AD password rotation automatically.</p>
            <p className="mt-1">Risk: Low — backup MID available, rotation takes ~4 minutes</p>
          </WhyPanel>
        </div>
      )
    },
    {
      title: "Executing Fix", time: "9:15:03 AM", status: "done",
      content: (
        <div className="space-y-1 text-xs text-muted-foreground">
          <StatusBadge variant="completed" label="Success" />
          <p className="mt-1 font-mono text-[10px] bg-secondary/50 rounded p-2">Tool: vault_rotate → corp-vault-01.internal/ad/creds/svc_snow_mid_int03<br/>Result: New password generated, AD updated successfully</p>
          <p className="font-mono text-[10px] bg-secondary/50 rounded p-2 mt-1">Tool: servicenow_api → PATCH /api/now/table/sys_credentials/[id]<br/>Result: ServiceNow credential record updated</p>
          <p className="font-mono text-[10px] bg-secondary/50 rounded p-2 mt-1">Tool: winrm_exec → Restart-Service MIDServer -Force on int-mid-03<br/>Result: Service restarted in 18 seconds</p>
        </div>
      )
    },
    {
      title: "Validating Resolution", time: "9:17:14 AM", status: "done",
      content: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <StatusBadge variant="active" label="100%" />
          </div>
          <p className="text-xs text-muted-foreground">Heartbeat: Resumed — int-mid-03 reporting green (6s ago)</p>
          <p className="text-xs text-muted-foreground">ECC Queue: All 6 JDBC jobs transitioned from Ready to Processing</p>
          <p className="text-xs text-muted-foreground">Credential: Valid · New expiry: 90 days from now</p>
          <p className="text-xs text-success">Auto resolved: INC0012801 closed with resolution notes written to ServiceNow</p>
        </div>
      )
    },
  ],
  learningOutcome: [
    "Pattern 'Credential Expiry → Service Account Rotation + Job Restart' reinforced (24th successful application)",
    "Proactive detection prevented 6 JDBC integration failures",
    "ServiceNow INC0012801 resolved with full vault rotation audit trail",
  ],
  logEntries: [
    { time: "09:14:22", level: "INFO", source: "agent: orchestrator event: pipeline_start" },
    { time: "09:14:25", level: "INFO", source: "Agent [rca] checking credential expiry via Vault API" },
    { time: "09:14:31", level: "INFO", source: "Agent [rca] completed — confidence: 98%, proactive credential expiry" },
    { time: "09:14:45", level: "INFO", source: "Agent [plan] completed — auto approved (high confidence, low risk)" },
    { time: "09:15:03", level: "INFO", source: "Agent [execution] vault_rotate: password rotated successfully" },
    { time: "09:15:30", level: "INFO", source: "Agent [execution] servicenow_api: credential record updated" },
    { time: "09:16:12", level: "INFO", source: "Agent [execution] winrm_exec: MID Server restarted in 18s" },
    { time: "09:17:14", level: "INFO", source: "Agent [validation] heartbeat green, 6 JDBC jobs processing — resolved" },
    { time: "09:17:14", level: "DEBUG", source: "agent: pipeline_complete total_time: 172s" },
  ],
};

// Reorder: Zombie Upgrade Loop and ECC Queue Backlog first, credential expiry as first completed
export const allActions: ActionItem[] = [
  _allActions.find(a => a.id === "ACT-006")!,
  _allActions.find(a => a.id === "ACT-007")!,
  ..._allActions.filter(a => a.id !== "ACT-006" && a.id !== "ACT-007" && a.status !== "completed"),
  credentialExpiryAction,
  ..._allActions.filter(a => a.id !== "ACT-006" && a.id !== "ACT-007" && a.status === "completed"),
];
