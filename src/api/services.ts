import { api } from "./client";
import type {
  AddContainerRequest,
  AgentMetadata,
  ApprovalDecisionRequest,
  ApprovalResponse,
  ConfigUpdateRequest,
  CreateIncidentRequest,
  CreateSessionRequest,
  CumulativeScoreResponse,
  EccQueueDetail,
  HealthResponse,
  IncidentReport,
  IncidentResponse,
  IncidentWithRunsResponse,
  LogEntry,
  MidServerResponse,
  MonitoredContainer,
  MonitorStatus,
  ServerConfig,
  SessionResponse,
  SSEEvent,
  ToolMetadata,
  UpdateSessionRequest,
  NotificationCountResponse,
  NotificationListResponse,
  NotificationDeleteResponse,
  NotificationClearAllResponse,
  NotificationMarkAsReadResponse,
  NotificationMarkAllAsReadResponse,
} from "./types";

// ── Health ───────────────────────────────────────────────────────────────────

export const healthService = {
  check: () => api.get<HealthResponse>("/health"),
};

// ── Sessions ─────────────────────────────────────────────────────────────────

export const sessionService = {
  create: (data?: CreateSessionRequest) =>
    api.post<SessionResponse>("/sessions", data || {}),

  list: (projectId?: string) =>
    api.get<SessionResponse[]>("/sessions", { project_id: projectId }),

  get: (sessionId: string) =>
    api.get<SessionResponse>(`/sessions/${sessionId}`),

  update: (sessionId: string, data: UpdateSessionRequest) =>
    api.patch<SessionResponse>(`/sessions/${sessionId}`, data),

  delete: (sessionId: string) =>
    api.delete<void>(`/sessions/${sessionId}`),
};

// ── Incidents ────────────────────────────────────────────────────────────────

export const incidentService = {
  create: (sessionId: string, data: CreateIncidentRequest) =>
    api.post<IncidentResponse>(`/sessions/${sessionId}/incidents`, data),

  listBySession: (sessionId: string, status?: string) =>
    api.get<IncidentResponse[]>(`/sessions/${sessionId}/incidents`, { status }),

  listRecent: (limit?: number, status?: string) =>
    api.get<IncidentResponse[]>("/incidents/recent", { limit, status }),

  get: (incidentId: string) =>
    api.get<IncidentWithRunsResponse>(`/incidents/${incidentId}`),

  getReport: (incidentId: string) =>
    api.get<IncidentReport>(`/incidents/${incidentId}/report`),

  retryRca: (incidentId: string) =>
    api.post<IncidentResponse>(`/incidents/${incidentId}/retry-rca`, {}),
};

// ── Stream ───────────────────────────────────────────────────────────────────

export const streamService = {
  subscribe: (
    sessionId: string,
    onEvent: (event: SSEEvent) => void,
    onError?: (err: Error) => void,
  ) => api.streamSSE(`/sessions/${sessionId}/stream`, onEvent, onError),
};

// ── Control ──────────────────────────────────────────────────────────────────

export const controlService = {
  cancelRun: (runId: string) =>
    api.post<{ message: string }>(`/runs/${runId}/cancel`),

  getConfig: () =>
    api.get<ServerConfig>("/config"),

  updateConfig: (data: ConfigUpdateRequest) =>
    api.patch<{ updated: Record<string, unknown>; message: string }>("/config", data),
};

// ── Monitor ──────────────────────────────────────────────────────────────────

export const monitorService = {
  addContainer: (data: AddContainerRequest) =>
    api.post<MonitoredContainer & { message: string }>("/monitor/containers", data),

  removeContainer: (containerName: string) =>
    api.delete<{ container_name: string; message: string }>(`/monitor/containers/${containerName}`),

  listContainers: () =>
    api.get<MonitoredContainer[]>("/monitor/containers"),

  getStatus: () =>
    api.get<MonitorStatus>("/monitor/status"),
};

// ── Registry ─────────────────────────────────────────────────────────────────

export const agentService = {
  list: (serviceType?: string) =>
    api.get<AgentMetadata[]>("/agents", { service_type: serviceType }),

  get: (agentName: string) =>
    api.get<AgentMetadata>(`/agents/${agentName}`),

  getCumulativeScore: () =>
    api.get<CumulativeScoreResponse>("/agents/cumulative-score"),
};

export const toolService = {
  list: (category?: string, agent?: string) =>
    api.get<ToolMetadata[]>("/tools", { category, agent }),

  get: (toolName: string) =>
    api.get<ToolMetadata>(`/tools/${toolName}`),
};

// ── Approvals ────────────────────────────────────────────────────────────────

export const approvalService = {
  list: (status?: string) =>
    api.get<ApprovalResponse[]>("/approvals", { status }),

  listPending: () =>
    api.get<ApprovalResponse[]>("/approvals/pending"),

  get: (approvalId: string) =>
    api.get<ApprovalResponse>(`/approvals/${approvalId}`),

  decide: (approvalId: string, data: ApprovalDecisionRequest) =>
    api.post<ApprovalResponse>(`/approvals/${approvalId}/decide`, data),

  listForIncident: (incidentId: string) =>
    api.get<ApprovalResponse[]>(`/approvals/incident/${incidentId}`),
};

// ── MID Servers ──────────────────────────────────────────────────────────────

export const midServerService = {
  list: () =>
    api.get<MidServerResponse[]>("/midservers"),

  getEccQueue: (midName: string) =>
    api.get<EccQueueDetail>(`/midservers/${midName}/ecc`),
};

// ── Logs ─────────────────────────────────────────────────────────────────────

export const logService = {
  get: (params?: { limit?: number; incident_id?: string; run_id?: string; agent?: string }) =>
    api.get<LogEntry[]>("/logs", params as Record<string, string | number | undefined>),
};

// ── Notifications ────────────────────────────────────────────────────────────

export const notificationService = {
  getCount: () =>
    api.get<NotificationCountResponse>("/notification_history/count"),

  list: (params?: { per_page?: number; page_no?: number }) =>
    api.get<NotificationListResponse>("/notification_history/list", params as Record<string, string | number | undefined>),

  delete: (id: string) =>
    api.delete<NotificationDeleteResponse>(`/notification_history/delete/${id}`),

  clearAll: () =>
    api.delete<NotificationClearAllResponse>("/notification_history/delete_all"),

  markAsRead: (id: string) =>
    api.put<NotificationMarkAsReadResponse>(`/notification_history/mark_as_read/${id}`),

  markAllAsRead: () =>
    api.put<NotificationMarkAllAsReadResponse>("/notification_history/mark_all_as_read"),
};
