/**
 * Client side demo dataset for AutoOps AI, used in place of the real backend
 * (see API_REQUIREMENTS.md) when VITE_DEMO_MODE is on. Every shape here mirrors
 * the real response types in ./types so the demo and live paths are interchangeable
 * from the UI's point of view — swap `isDemoMode()` off and the real services take
 * over with zero further changes.
 */
import type {
  AgentMetadata,
  ApprovalResponse,
  CumulativeScoreResponse,
  EccQueueDetail,
  HealthResponse,
  IncidentReport,
  IncidentResponse,
  IncidentWithRunsResponse,
  LogEntry,
  MidServerResponse,
  MonitorStatus,
  MonitoredContainer,
  NotificationItem,
  ServerConfig,
  ToolMetadata,
} from "./types";

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

// ── Agents ───────────────────────────────────────────────────────────────────

export const demoAgents: AgentMetadata[] = [
  {
    name: "midserver_agent",
    display_name: "MID Server Agent",
    description: "Diagnoses and remediates ServiceNow MID Server infrastructure issues: JVM heap exhaustion, ECC queue backlogs, and zombie upgrade loops.",
    model: "gpt-4o",
    stage: "diagnosis",
    stage_order: 1,
    supported_service_types: ["midserver"],
    tools_by_service_type: { midserver: ["ssh_executor", "servicenow_probe", "vault_rotator"] },
    output_schema: { root_cause: "string", confidence: "number" },
    executions: 142,
    success_rate: "96.5%",
    avg_time: "3m 18s",
    run_history: [
      { incident_id: "inc-1001", title: "MID Server prod-mid-04 JVM heap exhaustion", date: ago(2 * HOUR), action: "Restarted MID service and increased heap allocation", outcome: "resolved", duration: "4m 02s", confidence: 0.94, severity: "high" },
      { incident_id: "inc-1004", title: "ECC queue backlog on prod-mid-02", date: ago(8 * HOUR), action: "Cleared stale ECC entries and restarted worker threads", outcome: "resolved", duration: "2m 45s", confidence: 0.91, severity: "medium" },
    ],
  },
  {
    name: "container_agent",
    display_name: "Container Agent",
    description: "Monitors and remediates containerized services: unhealthy pods, restart loops, and resource exhaustion.",
    model: "gpt-4o",
    stage: "diagnosis",
    stage_order: 1,
    supported_service_types: ["docker"],
    tools_by_service_type: { docker: ["docker_restart", "k8s_probe"] },
    output_schema: { root_cause: "string", confidence: "number" },
    executions: 98,
    success_rate: "93.9%",
    avg_time: "2m 51s",
    run_history: [
      { incident_id: "inc-1002", title: "Payment gateway container in CrashLoopBackOff", date: ago(5 * HOUR), action: "Rolled back to last stable image tag", outcome: "resolved", duration: "3m 10s", confidence: 0.89, severity: "critical" },
    ],
  },
  {
    name: "network_agent",
    display_name: "Network Agent",
    description: "Diagnoses connectivity, latency, and DNS resolution issues across the enterprise network fabric.",
    model: "gpt-4o-mini",
    stage: "diagnosis",
    stage_order: 1,
    supported_service_types: ["network"],
    tools_by_service_type: { network: ["ssh_executor", "servicenow_probe"] },
    output_schema: { root_cause: "string", confidence: "number" },
    executions: 61,
    success_rate: "88.5%",
    avg_time: "4m 40s",
    run_history: [
      { incident_id: "inc-1006", title: "Intermittent packet loss to APAC data center", date: ago(1 * HOUR), action: "Rerouted traffic via secondary link", outcome: "resolved", duration: "5m 12s", confidence: 0.82, severity: "high" },
    ],
  },
  {
    name: "security_ops_agent",
    display_name: "Security Ops Agent",
    description: "Manages credential lifecycle and authentication failures, including HashiCorp Vault backed rotations.",
    model: "gpt-4o",
    stage: "diagnosis",
    stage_order: 1,
    supported_service_types: ["servicenow_auth"],
    tools_by_service_type: { servicenow_auth: ["vault_rotator", "servicenow_probe"] },
    output_schema: { root_cause: "string", confidence: "number" },
    executions: 47,
    success_rate: "97.9%",
    avg_time: "1m 55s",
    run_history: [
      { incident_id: "inc-1008", title: "ServiceNow service account credential expiring", date: ago(30 * MIN), action: "Rotated credential via Vault and updated MID Server config", outcome: "resolved", duration: "2m 20s", confidence: 0.97, severity: "medium" },
    ],
  },
  {
    name: "database_agent",
    display_name: "Database Agent",
    description: "Diagnoses connection pool exhaustion, slow queries, and replication lag on operational data stores.",
    model: "gpt-4o-mini",
    stage: "diagnosis",
    stage_order: 1,
    supported_service_types: ["database"],
    tools_by_service_type: { database: ["ssh_executor"] },
    output_schema: { root_cause: "string", confidence: "number" },
    executions: 33,
    success_rate: "90.1%",
    avg_time: "3m 33s",
    run_history: [],
  },
];

// ── Incidents ────────────────────────────────────────────────────────────────

export const demoIncidents: IncidentResponse[] = [
  {
    id: "inc-1001", session_id: "sess-1", title: "MID Server prod-mid-04 JVM heap exhaustion",
    description: "Heap usage sustained above 92% for 15 minutes, triggering GC thrashing and ECC queue backlog.",
    container_id: null, container_name: null, status: "resolved", severity: "high", service_type: "midserver",
    created_at: ago(2 * HOUR), updated_at: ago(2 * HOUR - 4 * MIN), resolved_at: ago(2 * HOUR - 4 * MIN),
    incident_number: "INC0012831", ci_name: "prod-mid-04", cmdb_ci: "MID_SERVER_PROD_04", source: "ServiceNow",
  },
  {
    id: "inc-1002", session_id: "sess-1", title: "Payment gateway container in CrashLoopBackOff",
    description: "Container repeatedly restarting after deploy of v2.14.0, health checks failing on /ready.",
    container_id: "c-payments-7f8", container_name: "payments-gateway", status: "resolved", severity: "critical", service_type: "docker",
    created_at: ago(5 * HOUR), updated_at: ago(5 * HOUR - 3 * MIN), resolved_at: ago(5 * HOUR - 3 * MIN),
    incident_number: "INC0012829", ci_name: "payments-gateway", cmdb_ci: "SVC_PAYMENTS_GW", source: "ServiceNow",
  },
  {
    id: "inc-1003", session_id: "sess-1", title: "ECC Queue backlog on prod-mid-07",
    description: "47 stale entries in ECC queue, oldest unprocessed for 22 minutes.",
    container_id: null, container_name: null, status: "executing", severity: "high", service_type: "midserver",
    created_at: ago(20 * MIN), updated_at: ago(2 * MIN), resolved_at: null,
    incident_number: "INC0012844", ci_name: "prod-mid-07", cmdb_ci: "MID_SERVER_PROD_07", source: "ServiceNow",
  },
  {
    id: "inc-1004", session_id: "sess-1", title: "ECC queue backlog on prod-mid-02",
    description: "Worker thread pool exhausted after upgrade, causing queue depth growth.",
    container_id: null, container_name: null, status: "resolved", severity: "medium", service_type: "midserver",
    created_at: ago(8 * HOUR), updated_at: ago(8 * HOUR - 2 * MIN), resolved_at: ago(8 * HOUR - 2 * MIN),
    incident_number: "INC0012815", ci_name: "prod-mid-02", cmdb_ci: "MID_SERVER_PROD_02", source: "ServiceNow",
  },
  {
    id: "inc-1005", session_id: "sess-1", title: "Zombie upgrade loop on prod-mid-13",
    description: "MID Server stuck retrying a failed auto upgrade every 5 minutes, service unreachable.",
    container_id: null, container_name: null, status: "awaiting_human_intervention", severity: "critical", service_type: "midserver",
    created_at: ago(45 * MIN), updated_at: ago(10 * MIN), resolved_at: null,
    incident_number: "INC0012847", ci_name: "prod-mid-13", cmdb_ci: "MID_SERVER_PROD_13", source: "ServiceNow",
  },
  {
    id: "inc-1006", session_id: "sess-1", title: "Intermittent packet loss to APAC data center",
    description: "3% packet loss observed on primary link, latency spikes above 400ms.",
    container_id: null, container_name: null, status: "resolved", severity: "high", service_type: "network",
    created_at: ago(1 * HOUR), updated_at: ago(1 * HOUR - 5 * MIN), resolved_at: ago(1 * HOUR - 5 * MIN),
    incident_number: "INC0012838", ci_name: "net-apac-primary", cmdb_ci: "NET_LINK_APAC_01", source: "ServiceNow",
  },
  {
    id: "inc-1007", session_id: "sess-1", title: "Order service database connection pool exhausted",
    description: "Connection pool hit max size of 50, new requests queuing and timing out.",
    container_id: null, container_name: null, status: "rca", severity: "high", service_type: "database",
    created_at: ago(6 * MIN), updated_at: ago(1 * MIN), resolved_at: null,
    incident_number: "INC0012850", ci_name: "orders-db-primary", cmdb_ci: "DB_ORDERS_PRIMARY", source: "ServiceNow",
  },
  {
    id: "inc-1008", session_id: "sess-1", title: "ServiceNow service account credential expiring",
    description: "Vault managed credential for MID Server auth expires in under 24 hours.",
    container_id: null, container_name: null, status: "resolved", severity: "medium", service_type: "servicenow_auth",
    created_at: ago(30 * MIN), updated_at: ago(28 * MIN), resolved_at: ago(28 * MIN),
    incident_number: "INC0012843", ci_name: "svc-account-mid", cmdb_ci: "CRED_SVC_MID", source: "ServiceNow",
  },
  {
    id: "inc-1009", session_id: "sess-1", title: "Inventory container OOMKilled under load",
    description: "Memory usage exceeded 512Mi limit during nightly batch job, pod evicted.",
    container_id: "c-inventory-2a1", container_name: "inventory-worker", status: "planned", severity: "medium", service_type: "docker",
    created_at: ago(12 * MIN), updated_at: ago(3 * MIN), resolved_at: null,
    incident_number: "INC0012849", ci_name: "inventory-worker", cmdb_ci: "SVC_INVENTORY_WK", source: "ServiceNow",
  },
  {
    id: "inc-1010", session_id: "sess-1", title: "MID Server prod-mid-09 heartbeat degraded",
    description: "Heartbeat interval increased from 30s to 140s, indicating resource contention.",
    container_id: null, container_name: null, status: "validating", severity: "low", service_type: "midserver",
    created_at: ago(15 * MIN), updated_at: ago(1 * MIN), resolved_at: null,
    incident_number: "INC0012848", ci_name: "prod-mid-09", cmdb_ci: "MID_SERVER_PROD_09", source: "ServiceNow",
  },
];

export function demoIncidentWithRuns(incidentId: string): IncidentWithRunsResponse {
  const incident = demoIncidents.find((i) => i.id === incidentId) ?? demoIncidents[0];
  const resolved = incident.status === "resolved";
  return {
    ...incident,
    logs: [],
    runs: [
      {
        id: `run-${incident.id}`,
        incident_id: incident.id,
        run_number: 1,
        status: resolved ? "completed" : "running",
        rca_result: {
          root_cause: incident.description,
          category: incident.service_type,
          confidence: 0.91,
          evidence: [`${incident.ci_name} metrics breached threshold`, "Correlated with recent change record"],
          details: `Root cause analysis for ${incident.incident_number} on ${incident.ci_name}.`,
          suggested_fix: "Apply the standard remediation playbook for this service type.",
        },
        plan_result: {
          steps: [
            { step_number: 1, action: "Isolate the affected component", tool: "ssh_executor", risk_level: "low" },
            { step_number: 2, action: "Apply remediation and restart affected service", tool: "servicenow_probe", risk_level: "medium" },
            { step_number: 3, action: "Validate service health post remediation", tool: "servicenow_probe", risk_level: "low" },
          ],
          overall_strategy: "Rolling remediation with pre and post validation checkpoints.",
          estimated_risk: incident.severity === "critical" ? "high" : "medium",
          requires_downtime: false,
        },
        execution_result: resolved ? {
          executed_steps: [
            { step_number: 1, action_taken: "Isolated affected component", tool_used: "ssh_executor", success: true },
            { step_number: 2, action_taken: "Applied remediation and restarted service", tool_used: "servicenow_probe", success: true },
          ],
          overall_success: true,
          notes: "Remediation completed without incident.",
          container_status_after: "healthy",
        } : null,
        validation_result: resolved ? {
          validated: true,
          checks: [
            { check: "Service responding on health endpoint", result: "pass", passed: true },
            { check: "Metrics within normal range", result: "pass", passed: true },
          ],
          service_status: "healthy",
          confidence: 0.95,
          notes: "All post remediation checks passed.",
        } : null,
        started_at: incident.created_at,
        completed_at: resolved ? incident.resolved_at : null,
      },
    ],
  };
}

export function demoIncidentReport(incidentId: string): IncidentReport {
  const incident = demoIncidents.find((i) => i.id === incidentId) ?? demoIncidents[0];
  return {
    markdown: `# Incident Report: ${incident.incident_number}\n\n**${incident.title}**\n\nRoot cause: ${incident.description}\n\nStatus: ${incident.status}`,
    json: {
      incident: {
        id: incident.id, title: incident.title, description: incident.description,
        container_name: incident.container_name, status: incident.status, severity: incident.severity,
        created_at: incident.created_at, resolved_at: incident.resolved_at,
        duration: incident.resolved_at ? "4m 02s" : "in progress",
      },
      runs: [],
      total_events: 12,
      tool_performance: {
        ssh_executor: { count: 8, total_ms: 24000, avg_ms: 3000, success: 8, failure: 0 },
        servicenow_probe: { count: 6, total_ms: 9000, avg_ms: 1500, success: 6, failure: 0 },
      },
    },
  };
}

// ── Approvals ────────────────────────────────────────────────────────────────

export const demoApprovals: ApprovalResponse[] = [
  {
    id: "appr-1", incident_id: "inc-1005", run_id: "run-inc-1005", status: "pending",
    plan_summary: "Force terminate stuck upgrade process and restart MID Server prod-mid-13 in safe mode.",
    plan_steps: [
      { step_number: 1, action: "Kill zombie upgrade process", command: "kill -9 <pid>", expected_outcome: "Process terminated" },
      { step_number: 2, action: "Restart MID Server in safe mode", command: "systemctl restart mid-server --safe", expected_outcome: "Service comes online without auto-upgrade" },
    ],
    risk_level: "high", estimated_time: "6m", rollback_plan: "Restore from last known good MID Server snapshot.",
    blast_radius: "Single MID Server, affects 3 dependent ServiceNow integrations.",
    reason: "High risk action requires human approval before forced process termination on production infrastructure.",
    decision_by: null, decision_notes: null, created_at: ago(10 * MIN), decided_at: null, expiry_at: ago(-50 * MIN),
  },
  {
    id: "appr-2", incident_id: "inc-1009", run_id: "run-inc-1009", status: "pending",
    plan_summary: "Increase memory limit for inventory-worker from 512Mi to 1Gi and redeploy.",
    plan_steps: [
      { step_number: 1, action: "Patch deployment memory limit", command: "kubectl set resources deploy/inventory-worker --limits=memory=1Gi" },
      { step_number: 2, action: "Rolling restart", command: "kubectl rollout restart deploy/inventory-worker" },
    ],
    risk_level: "medium", estimated_time: "3m", rollback_plan: "Revert deployment to previous resource limits.",
    blast_radius: "Single service, brief rolling restart with no downtime expected.",
    reason: "Resource limit changes require approval per governance policy.",
    decision_by: null, decision_notes: null, created_at: ago(3 * MIN), decided_at: null, expiry_at: ago(-57 * MIN),
  },
  {
    id: "appr-3", incident_id: "inc-1001", run_id: "run-inc-1001", status: "approved",
    plan_summary: "Restart MID Server service and increase JVM heap allocation from 2G to 4G.",
    plan_steps: [
      { step_number: 1, action: "Update wrapper.conf heap settings" },
      { step_number: 2, action: "Restart MID Server service" },
    ],
    risk_level: "medium", estimated_time: "4m", rollback_plan: "Revert wrapper.conf and restart service.",
    blast_radius: "Single MID Server, brief service interruption during restart.",
    reason: "Service restart requires approval.",
    decision_by: "Priya Sharma", decision_notes: "Approved, low risk during maintenance window.",
    created_at: ago(2 * HOUR + 5 * MIN), decided_at: ago(2 * HOUR), expiry_at: null,
  },
];

// ── MID Servers ──────────────────────────────────────────────────────────────

export const demoMidServers: MidServerResponse[] = [
  { name: "prod-mid-01", os: "RHEL 8.6", version: "Utah Patch 4", status: "operational", heartbeat: "24s", heartbeatSec: 24, eccReady: 3, eccError: 0, eccProcessing: 1, activeJobs: 2, credStatus: "valid", credExpiry: ago(-1800 * HOUR), agent: "MID Server Agent", lastAction: "None", incidentId: null, hostName: "mid01.prod.internal", sysId: "9f1a2b3c", validated: "true" },
  { name: "prod-mid-02", os: "RHEL 8.6", version: "Utah Patch 4", status: "operational", heartbeat: "18s", heartbeatSec: 18, eccReady: 5, eccError: 0, eccProcessing: 0, activeJobs: 1, credStatus: "valid", credExpiry: ago(-1500 * HOUR), agent: "MID Server Agent", lastAction: "Cleared ECC backlog", incidentId: "inc-1004", hostName: "mid02.prod.internal", sysId: "9f1a2b3d", validated: "true" },
  { name: "prod-mid-03", os: "Windows Server 2019", version: "Utah Patch 3", status: "operational", heartbeat: "31s", heartbeatSec: 31, eccReady: 2, eccError: 0, eccProcessing: 2, activeJobs: 3, credStatus: "valid", credExpiry: ago(-900 * HOUR), agent: "MID Server Agent", lastAction: "None", incidentId: null, hostName: "mid03.prod.internal", sysId: "9f1a2b3e", validated: "true" },
  { name: "prod-mid-04", os: "RHEL 8.6", version: "Utah Patch 4", status: "degraded", heartbeat: "52s", heartbeatSec: 52, eccReady: 1, eccError: 6, eccProcessing: 4, activeJobs: 4, credStatus: "valid", credExpiry: ago(-1200 * HOUR), agent: "MID Server Agent", lastAction: "Restarted service, heap increased", incidentId: "inc-1001", hostName: "mid04.prod.internal", sysId: "9f1a2b3f", validated: "true" },
  { name: "prod-mid-05", os: "RHEL 8.6", version: "Utah Patch 4", status: "operational", heartbeat: "22s", heartbeatSec: 22, eccReady: 4, eccError: 0, eccProcessing: 0, activeJobs: 1, credStatus: "expiring", credExpiry: ago(-18 * HOUR), agent: "MID Server Agent", lastAction: "None", incidentId: null, hostName: "mid05.prod.internal", sysId: "9f1a2b40", validated: "true" },
  { name: "prod-mid-07", os: "Windows Server 2022", version: "Utah Patch 4", status: "degraded", heartbeat: "41s", heartbeatSec: 41, eccReady: 0, eccError: 47, eccProcessing: 12, activeJobs: 5, credStatus: "valid", credExpiry: ago(-800 * HOUR), agent: "MID Server Agent", lastAction: "Clearing ECC backlog", incidentId: "inc-1003", hostName: "mid07.prod.internal", sysId: "9f1a2b41", validated: "true" },
  { name: "prod-mid-09", os: "RHEL 9.2", version: "Utah Patch 4", status: "operational", heartbeat: "35s", heartbeatSec: 35, eccReady: 3, eccError: 0, eccProcessing: 1, activeJobs: 2, credStatus: "valid", credExpiry: ago(-1000 * HOUR), agent: "MID Server Agent", lastAction: "Validating post remediation health", incidentId: "inc-1010", hostName: "mid09.prod.internal", sysId: "9f1a2b42", validated: "false" },
  { name: "prod-mid-13", os: "RHEL 8.6", version: "Utah Patch 2", status: "unreachable", heartbeat: "12m 40s", heartbeatSec: 760, eccReady: 0, eccError: 0, eccProcessing: 0, activeJobs: 0, credStatus: "unknown", credExpiry: null, agent: "MID Server Agent", lastAction: "Awaiting approval to force restart", incidentId: "inc-1005", hostName: "mid13.prod.internal", sysId: "9f1a2b43", validated: "false" },
];

export function demoEccQueue(midName: string): EccQueueDetail {
  const mid = demoMidServers.find((m) => m.name === midName);
  return {
    ready: mid?.eccReady ?? 2,
    processing: mid?.eccProcessing ?? 1,
    error: mid?.eccError ?? 0,
    error_details: (mid?.eccError ?? 0) > 0 ? [
      { topic: "ImportSetTransform", source: mid?.name ?? midName, error: "Timeout waiting for target system response", created: ago(15 * MIN) },
      { topic: "SNCScriptedProbe", source: mid?.name ?? midName, error: "Authentication failure against target CI", created: ago(40 * MIN) },
    ] : [],
  };
}

// ── Tools ────────────────────────────────────────────────────────────────────

export const demoTools: ToolMetadata[] = [
  { name: "ssh_executor", display_name: "SSH Executor", category: "infrastructure", description: "Executes vetted remediation commands over SSH against target infrastructure.", actions: ["run_command", "read_file", "restart_service"], parameters: { host: { type: "string", required: true, description: "Target hostname" } }, used_by_agents: ["midserver_agent", "network_agent", "database_agent"] },
  { name: "docker_restart", display_name: "Docker Restart", category: "containers", description: "Restarts or rolls back containerized workloads via the Kubernetes API.", actions: ["restart", "rollback", "scale"], parameters: { deployment: { type: "string", required: true, description: "Target deployment name" } }, used_by_agents: ["container_agent"] },
  { name: "servicenow_probe", display_name: "ServiceNow Probe", category: "servicenow", description: "Queries and updates ServiceNow CMDB records and incident tickets.", actions: ["get_ci", "update_incident", "create_change"], parameters: { sys_id: { type: "string", required: false, description: "CMDB sys_id" } }, used_by_agents: ["midserver_agent", "security_ops_agent"] },
  { name: "vault_rotator", display_name: "Vault Credential Rotator", category: "security", description: "Rotates service account credentials through HashiCorp Vault and propagates updates.", actions: ["rotate", "revoke"], parameters: { path: { type: "string", required: true, description: "Vault secret path" } }, used_by_agents: ["security_ops_agent", "midserver_agent"] },
  { name: "k8s_probe", display_name: "Kubernetes Probe", category: "containers", description: "Reads pod, deployment, and event state from the Kubernetes API for diagnosis.", actions: ["get_pods", "get_events", "get_logs"], parameters: { namespace: { type: "string", required: false, description: "Kubernetes namespace" } }, used_by_agents: ["container_agent"] },
];

// ── Health, config, monitor ──────────────────────────────────────────────────

export const demoHealth: HealthResponse = { status: "healthy", version: "2.4.1" };

export const demoConfig: ServerConfig = {
  monitor_poll_interval: 30, orchestrator_poll_interval: 10, max_incident_retries: 3,
  max_tool_iterations: 8, codestral_deployment: "codestral-2501", gpt4o_mini_deployment: "gpt-4o-mini",
  host: "0.0.0.0", port: 8080,
};

export const demoContainers: MonitoredContainer[] = [
  { container_name: "payments-gateway", image: "registry.internal/payments-gateway:2.14.0", expected_status: "running" },
  { container_name: "inventory-worker", image: "registry.internal/inventory-worker:1.9.2", expected_status: "running" },
  { container_name: "orders-api", image: "registry.internal/orders-api:3.1.0", expected_status: "running" },
];

export const demoMonitorStatus: MonitorStatus = {
  monitored_containers: demoContainers.length,
  containers: demoContainers.map((c) => c.container_name),
  status: "active",
};

export const demoCumulativeScore: CumulativeScoreResponse = {
  created_by_id: "demo",
  agents: demoAgents.map((a) => ({
    agent: a.display_name,
    metrics: [
      { type: "success", value: Math.round((parseFloat(a.success_rate || "90") / 100) * (a.executions || 50)) },
      { type: "failed", value: Math.max(0, (a.executions || 50) - Math.round((parseFloat(a.success_rate || "90") / 100) * (a.executions || 50))) },
    ],
  })),
};

// ── Logs ─────────────────────────────────────────────────────────────────────

export const demoLogs: LogEntry[] = demoIncidents.slice(0, 6).flatMap((incident) => ([
  { timestamp: incident.created_at, event: "incident_detected", agent: "Orchestrator", incident_id: incident.id },
  { timestamp: ago(new Date(incident.updated_at).getTime() > 0 ? Date.now() - new Date(incident.updated_at).getTime() : 0), event: "rca_started", agent: "RCA Agent", incident_id: incident.id },
]));

// ── Notifications ────────────────────────────────────────────────────────────

export const demoNotifications: NotificationItem[] = [
  { id: "notif-1", subject: "Approval required", body: "Force restart of prod-mid-13 needs your approval.", is_read: false, created_by_id: "system", created_at: ago(10 * MIN), updated_at: ago(10 * MIN), updated_by_id: "system" },
  { id: "notif-2", subject: "Approval required", body: "Memory limit increase for inventory-worker needs your approval.", is_read: false, created_by_id: "system", created_at: ago(3 * MIN), updated_at: ago(3 * MIN), updated_by_id: "system" },
  { id: "notif-3", subject: "Incident resolved", body: "INC0012831 on prod-mid-04 was auto resolved by the MID Server Agent.", is_read: true, created_by_id: "system", created_at: ago(2 * HOUR), updated_at: ago(2 * HOUR), updated_by_id: "system" },
  { id: "notif-4", subject: "Credential rotated", body: "Service account credential for MID Server auth was rotated successfully.", is_read: true, created_by_id: "system", created_at: ago(28 * MIN), updated_at: ago(28 * MIN), updated_by_id: "system" },
];
