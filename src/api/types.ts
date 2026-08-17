// ── Enums ────────────────────────────────────────────────────────────────────

export type IncidentStatus = "new" | "rca" | "rca_failed" | "planned" | "executing" | "validating" | "resolved" | "failed" | "cancelled" | "awaiting_human_intervention";
export type SessionStatus = "active" | "completed" | "cancelled";
export type RunStatus = "running" | "completed" | "failed" | "cancelled";
export type Severity = "low" | "medium" | "high" | "critical";
export type ServiceType = "docker" | "midserver" | "network" | "servicenow_auth" | "database";
export type EventType = "agent_start" | "tool_call" | "tool_result" | "agent_response" | "error";

// ── Request Models ───────────────────────────────────────────────────────────

export interface CreateSessionRequest {
  project_id?: string | null;
  config?: Record<string, unknown>;
}

export interface UpdateSessionRequest {
  config?: Record<string, unknown> | null;
  status?: SessionStatus | null;
}

export interface CreateIncidentRequest {
  title: string;
  description: string;
  container_id?: string | null;
  container_name?: string | null;
  severity?: Severity;
  service_type?: ServiceType;
}

export interface AddContainerRequest {
  container_name: string;
  image?: string;
  expected_status?: string;
}

export interface ConfigUpdateRequest {
  monitor_poll_interval?: number | null;
  orchestrator_poll_interval?: number | null;
  max_incident_retries?: number | null;
  max_tool_iterations?: number | null;
}

// ── Response Models ──────────────────────────────────────────────────────────

export interface SessionResponse {
  id: string;
  project_id: string;
  status: SessionStatus;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IncidentResponse {
  id: string;
  session_id: string;
  title: string;
  description: string;
  container_id: string | null;
  container_name: string | null;
  status: IncidentStatus;
  severity: Severity;
  service_type: ServiceType;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  incident_number?: string;
  ci_name?: string;
  cmdb_ci?: string;
  source?: string;
  incident_url?: string;
  incident_sys_id?: string;
  runs?: RunResponse[];
}

export interface RcaResult {
  root_cause: string;
  category: string;
  confidence: number;
  evidence: string[];
  details: string;
  suggested_fix: string;
  explanation?: string;
  error?: string;
}

export interface PlanStep {
  step_number: number;
  action: string;
  expected_outcome?: string;
  tool?: string;
  risk_level?: string;
}

export interface PlanResult {
  steps: PlanStep[];
  overall_strategy: string;
  estimated_risk: string;
  requires_downtime: boolean;
  explanation?: string;
  error?: string;
}

export interface ExecutedStep {
  step_number: number;
  action_taken: string;
  tool_used: string;
  success: boolean;
  output?: string;
}

export interface ExecutionResult {
  executed_steps: ExecutedStep[];
  overall_success: boolean;
  notes: string;
  container_status_after: string;
  explanation?: string;
  error?: string;
  requires_human_intervention?: boolean;
}

export interface ValidationCheck {
  check: string;
  result: string;
  passed: boolean;
}

export interface ValidationResult {
  validated: boolean;
  checks: ValidationCheck[];
  service_status: string;
  confidence: number;
  notes: string;
  explanation?: string;
  error?: string;
}

export interface RunResponse {
  id: string;
  incident_id: string;
  run_number: number;
  status: RunStatus;
  rca_result: RcaResult | null;
  plan_result: PlanResult | null;
  execution_result: ExecutionResult | null;
  validation_result: ValidationResult | null;
  severity?: Severity;
  incident_number?: string;
  cmdb_ci?: string;
  incident_sys_id?: string;
  started_at: string;
  completed_at: string | null;
}

export interface EventResponse {
  id: string;
  run_id: string;
  agent_name: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface IncidentWithRunsResponse extends IncidentResponse {
  runs: RunResponse[];
  logs: Record<string, unknown>[];
}

// ── Monitor ──────────────────────────────────────────────────────────────────

export interface MonitoredContainer {
  container_name: string;
  image: string;
  expected_status: string;
}

export interface MonitorStatus {
  monitored_containers: number;
  containers: string[];
  status: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

export interface ServerConfig {
  monitor_poll_interval: number;
  orchestrator_poll_interval: number;
  max_incident_retries: number;
  max_tool_iterations: number;
  codestral_deployment: string;
  gpt4o_mini_deployment: string;
  host: string;
  port: number;
}

// ── Registry ─────────────────────────────────────────────────────────────────

export interface AgentMetadata {
  name: string;
  display_name: string;
  description: string;
  model: string;
  stage: string;
  stage_order: number;
  supported_service_types: string[];
  tools_by_service_type: Record<string, string[]>;
  output_schema: Record<string, string>;
  tools_for_requested_service?: string[];
  executions?: number;
  success_rate?: string;
  avg_time?: string;
  run_history?: AgentRunHistoryItem[];
}

export interface AgentRunHistoryItem {
  incident_id: string;
  title: string;
  date: string;
  action: string;
  outcome: "resolved" | "failed" | "escalated" | "unknown";
  duration: string;
  confidence: number;
  severity: string;
}

export interface CumulativeScoreMetric {
  type: "success" | "failed";
  value: number;
}

export interface AgentCumulativeScore {
  agent: string;
  metrics: CumulativeScoreMetric[];
}

export interface CumulativeScoreResponse {
  created_by_id: string;
  agents: AgentCumulativeScore[];
}

export interface ToolParameter {
  type: string;
  required?: boolean;
  default?: unknown;
  description: string;
}

export interface ToolMetadata {
  name: string;
  display_name: string;
  category: string;
  description: string;
  actions: string[];
  parameters: Record<string, ToolParameter>;
  used_by_agents: string[];
}

// ── Approvals ────────────────────────────────────────────────────────────────

export type ApprovalStatusType = "pending" | "approved" | "rejected" | "modified";

export interface ApprovalResponse {
  id: string;
  incident_id: string;
  run_id: string;
  status: ApprovalStatusType;
  plan_summary: string;
  plan_steps: { step_number?: number; action?: string; command?: string; expected_outcome?: string; rollback?: string }[];
  risk_level: string;
  estimated_time: string;
  rollback_plan: string;
  blast_radius: string;
  reason: string;
  decision_by: string | null;
  decision_notes: string | null;
  created_at: string;
  decided_at: string | null;
  expiry_at: string | null;
}

export interface ApprovalDecisionRequest {
  decision: "approved" | "rejected" | "modified";
  notes?: string;
  decided_by?: string;
}

// ── MID Servers ──────────────────────────────────────────────────────────────

export type MidServerStatus = "operational" | "degraded" | "unreachable" | "upgrading";
export type CredentialStatus = "valid" | "expiring" | "locked" | "expired" | "unknown";

export interface MidServerResponse {
  name: string;
  os: string;
  version: string;
  status: MidServerStatus;
  heartbeat: string;
  heartbeatSec: number;
  eccReady: number;
  eccError: number;
  eccProcessing: number;
  activeJobs: number;
  credStatus: CredentialStatus;
  credExpiry: string | null;
  agent: string;
  lastAction: string;
  incidentId: string | null;
  hostName: string;
  sysId: string;
  validated: string;
}

export interface EccQueueDetail {
  ready: number;
  processing: number;
  error: number;
  error_details: {
    topic: string;
    source: string;
    error: string;
    created: string;
  }[];
}

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
}

// ── Report ───────────────────────────────────────────────────────────────────

export interface IncidentReportJson {
  incident: {
    id: string;
    title: string;
    description: string;
    container_name: string | null;
    status: string;
    severity: string;
    created_at: string;
    resolved_at: string | null;
    duration: string;
  };
  runs: {
    id: string;
    run_number: number;
    status: string;
    started_at: string;
    completed_at: string | null;
    duration: string;
    rca_result: RcaResult | null;
    plan_result: PlanResult | null;
    execution_result: ExecutionResult | null;
    validation_result: ValidationResult | null;
  }[];
  total_events: number;
  tool_performance: Record<string, {
    count: number;
    total_ms: number;
    avg_ms: number;
    success: number;
    failure: number;
  }>;
}

export interface IncidentReport {
  markdown: string;
  json: IncidentReportJson;
}

// ── Log Entry ────────────────────────────────────────────────────────────────

export interface LogEntry {
  timestamp?: string;
  event?: string;
  agent?: string;
  incident_id?: string;
  run_id?: string;
  [key: string]: unknown;
}

// ── SSE Event ────────────────────────────────────────────────────────────────

export interface SSEEvent {
  type: string;
  data: unknown;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
}

export interface SignupRequest {
  first_name: string;
  last_name: string;
  company_name: string;
  phone_number: string;
  email: string;
  company_size: string;
}

export interface VerifyOtpRequest {
  user_id: string;
  otp: string;
}

export interface ResendOtpRequest {
  user_id: string;
}

export interface AuthResponseBase<T> {
  meta: {
    status: boolean;
    message: string;
  };
  data: T;
}

export interface LoginData {
  user_id: string;
  otp_expires_at: string;
}

export interface SignupData {
  user_id: string;
  email: string;
  phone_number: string;
  role_code: string;
}

export interface VerifyOtpData {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

export interface ResendOtpData {
  user_id: string;
  otp: string;
  otp_expires_at: string;
}

export interface UploadData {
  file_name: string;
  blob_name: string;
  content_type: string;
  size_bytes: number;
  container_name: string;
  url: string;
  signed_url: string;
  signed_url_expires_at: string;
  uploaded_at: string;
}

export interface ModuleMaster {
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface RoleData {
  _id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  module_master: ModuleMaster[];
}

export interface AccessModuleData {
  user_id: string;
  email: string;
  role: RoleData;
}

export interface UserDetails {
  first_name: string;
  last_name: string;
  company_name: string;
  phone_number: string;
  email: string;
  company_size: string;
  role_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  profile_url?: string;
}

export interface UserUpdateRequest {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_size?: string;
  profile_url?: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  updated_by_id: string;
}

export interface NotificationCountData {
  total_count: number;
  unread_count: number;
}

export interface NotificationListData {
  items: NotificationItem[];
  page_no: number;
  per_page: number;
  total: number;
  unread_count: number;
}

export interface NotificationDeleteData {
  notification_id: string;
}

export interface NotificationClearAllData {
  deleted_count: number;
}

export interface NotificationMarkAllAsReadData {
  updated_count: number;
}

export interface NotificationCountResponse extends AuthResponseBase<NotificationCountData> {}
export interface NotificationListResponse extends AuthResponseBase<NotificationListData> {}
export interface NotificationDeleteResponse extends AuthResponseBase<NotificationDeleteData> {}
export interface NotificationClearAllResponse extends AuthResponseBase<NotificationClearAllData> {}
export interface NotificationMarkAsReadResponse extends AuthResponseBase<NotificationItem> {}
export interface NotificationMarkAllAsReadResponse extends AuthResponseBase<NotificationMarkAllAsReadData> {}
