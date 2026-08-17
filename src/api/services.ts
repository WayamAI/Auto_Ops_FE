import { api } from "./client";
import { isDemoMode } from "@/lib/demoMode";
import {
  demoAgents,
  demoApprovals,
  demoConfig,
  demoContainers,
  demoCumulativeScore,
  demoEccQueue,
  demoHealth,
  demoIncidentReport,
  demoIncidents,
  demoIncidentWithRuns,
  demoLogs,
  demoMidServers,
  demoMonitorStatus,
  demoNotifications,
  demoTools,
} from "./demoData";
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

// Small helper so demo responses resolve asynchronously (like a real fetch)
// without ever touching the network, and never leak shared mutable state.
function demo<T>(data: T, delayMs = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), delayMs));
}

// ── Health ───────────────────────────────────────────────────────────────────

export const healthService = {
  check: () => (isDemoMode() ? demo(demoHealth) : api.get<HealthResponse>("/health")),
};

// ── Sessions ─────────────────────────────────────────────────────────────────

const demoSession: SessionResponse = {
  id: "sess-1", project_id: "demo-project", status: "active", config: {},
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

export const sessionService = {
  create: (data?: CreateSessionRequest) =>
    isDemoMode() ? demo(demoSession) : api.post<SessionResponse>("/sessions", data || {}),

  list: (projectId?: string) =>
    isDemoMode() ? demo([demoSession]) : api.get<SessionResponse[]>("/sessions", { project_id: projectId }),

  get: (sessionId: string) =>
    isDemoMode() ? demo(demoSession) : api.get<SessionResponse>(`/sessions/${sessionId}`),

  update: (sessionId: string, data: UpdateSessionRequest) =>
    isDemoMode() ? demo({ ...demoSession, ...data }) : api.patch<SessionResponse>(`/sessions/${sessionId}`, data),

  delete: (sessionId: string) =>
    isDemoMode() ? demo(undefined as void) : api.delete<void>(`/sessions/${sessionId}`),
};

// ── Incidents ────────────────────────────────────────────────────────────────

export const incidentService = {
  create: (sessionId: string, data: CreateIncidentRequest) => {
    if (isDemoMode()) {
      const created: IncidentResponse = {
        id: `inc-${Date.now()}`, session_id: sessionId, title: data.title, description: data.description,
        container_id: data.container_id ?? null, container_name: data.container_name ?? null,
        status: "new", severity: data.severity ?? "medium", service_type: data.service_type ?? "docker",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), resolved_at: null,
        incident_number: `INC00${Math.floor(10000 + Math.random() * 89999)}`, source: "ServiceNow",
      };
      demoIncidents.unshift(created);
      return demo(created);
    }
    return api.post<IncidentResponse>(`/sessions/${sessionId}/incidents`, data);
  },

  listBySession: (sessionId: string, status?: string) =>
    isDemoMode()
      ? demo(demoIncidents.filter((i) => !status || i.status === status))
      : api.get<IncidentResponse[]>(`/sessions/${sessionId}/incidents`, { status }),

  listRecent: (limit?: number, status?: string) =>
    isDemoMode()
      ? demo(demoIncidents.filter((i) => !status || i.status === status).slice(0, limit ?? 50))
      : api.get<IncidentResponse[]>("/incidents/recent", { limit, status }),

  get: (incidentId: string) =>
    isDemoMode() ? demo(demoIncidentWithRuns(incidentId)) : api.get<IncidentWithRunsResponse>(`/incidents/${incidentId}`),

  getReport: (incidentId: string) =>
    isDemoMode() ? demo(demoIncidentReport(incidentId)) : api.get<IncidentReport>(`/incidents/${incidentId}/report`),

  retryRca: (incidentId: string) => {
    if (isDemoMode()) {
      const incident = demoIncidents.find((i) => i.id === incidentId);
      if (incident) incident.status = "rca";
      return demo(incident ?? demoIncidents[0]);
    }
    return api.post<IncidentResponse>(`/incidents/${incidentId}/retry-rca`, {});
  },
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
    isDemoMode() ? demo({ message: `Run ${runId} cancelled` }) : api.post<{ message: string }>(`/runs/${runId}/cancel`),

  getConfig: () =>
    isDemoMode() ? demo(demoConfig) : api.get<ServerConfig>("/config"),

  updateConfig: (data: ConfigUpdateRequest) =>
    isDemoMode()
      ? demo({ updated: data as Record<string, unknown>, message: "Configuration updated" })
      : api.patch<{ updated: Record<string, unknown>; message: string }>("/config", data),
};

// ── Monitor ──────────────────────────────────────────────────────────────────

export const monitorService = {
  addContainer: (data: AddContainerRequest) => {
    if (isDemoMode()) {
      const container: MonitoredContainer = {
        container_name: data.container_name, image: data.image ?? "unknown", expected_status: data.expected_status ?? "running",
      };
      demoContainers.push(container);
      demoMonitorStatus.monitored_containers = demoContainers.length;
      demoMonitorStatus.containers = demoContainers.map((c) => c.container_name);
      return demo({ ...container, message: "Container added to monitoring" });
    }
    return api.post<MonitoredContainer & { message: string }>("/monitor/containers", data);
  },

  removeContainer: (containerName: string) => {
    if (isDemoMode()) {
      const idx = demoContainers.findIndex((c) => c.container_name === containerName);
      if (idx >= 0) demoContainers.splice(idx, 1);
      demoMonitorStatus.monitored_containers = demoContainers.length;
      demoMonitorStatus.containers = demoContainers.map((c) => c.container_name);
      return demo({ container_name: containerName, message: "Container removed from monitoring" });
    }
    return api.delete<{ container_name: string; message: string }>(`/monitor/containers/${containerName}`);
  },

  listContainers: () =>
    isDemoMode() ? demo(demoContainers) : api.get<MonitoredContainer[]>("/monitor/containers"),

  getStatus: () =>
    isDemoMode() ? demo(demoMonitorStatus) : api.get<MonitorStatus>("/monitor/status"),
};

// ── Registry ─────────────────────────────────────────────────────────────────

export const agentService = {
  list: (serviceType?: string) =>
    isDemoMode()
      ? demo(demoAgents.filter((a) => !serviceType || a.supported_service_types.includes(serviceType)))
      : api.get<AgentMetadata[]>("/agents", { service_type: serviceType }),

  get: (agentName: string) =>
    isDemoMode()
      ? demo(demoAgents.find((a) => a.name === agentName) ?? demoAgents[0])
      : api.get<AgentMetadata>(`/agents/${agentName}`),

  getCumulativeScore: () =>
    isDemoMode() ? demo(demoCumulativeScore) : api.get<CumulativeScoreResponse>("/agents/cumulative-score"),
};

export const toolService = {
  list: (category?: string, agent?: string) =>
    isDemoMode()
      ? demo(demoTools.filter((t) => (!category || t.category === category) && (!agent || t.used_by_agents.includes(agent))))
      : api.get<ToolMetadata[]>("/tools", { category, agent }),

  get: (toolName: string) =>
    isDemoMode()
      ? demo(demoTools.find((t) => t.name === toolName) ?? demoTools[0])
      : api.get<ToolMetadata>(`/tools/${toolName}`),
};

// ── Approvals ────────────────────────────────────────────────────────────────

export const approvalService = {
  list: (status?: string) =>
    isDemoMode()
      ? demo(demoApprovals.filter((a) => !status || a.status === status))
      : api.get<ApprovalResponse[]>("/approvals", { status }),

  listPending: () =>
    isDemoMode() ? demo(demoApprovals.filter((a) => a.status === "pending")) : api.get<ApprovalResponse[]>("/approvals/pending"),

  get: (approvalId: string) =>
    isDemoMode()
      ? demo(demoApprovals.find((a) => a.id === approvalId) ?? demoApprovals[0])
      : api.get<ApprovalResponse>(`/approvals/${approvalId}`),

  decide: (approvalId: string, data: ApprovalDecisionRequest) => {
    if (isDemoMode()) {
      const approval = demoApprovals.find((a) => a.id === approvalId);
      if (approval) {
        approval.status = data.decision === "approved" ? "approved" : data.decision === "rejected" ? "rejected" : "modified";
        approval.decision_by = data.decided_by ?? "Demo User";
        approval.decision_notes = data.notes ?? null;
        approval.decided_at = new Date().toISOString();
      }
      return demo(approval ?? demoApprovals[0]);
    }
    return api.post<ApprovalResponse>(`/approvals/${approvalId}/decide`, data);
  },

  listForIncident: (incidentId: string) =>
    isDemoMode()
      ? demo(demoApprovals.filter((a) => a.incident_id === incidentId))
      : api.get<ApprovalResponse[]>(`/approvals/incident/${incidentId}`),
};

// ── MID Servers ──────────────────────────────────────────────────────────────

export const midServerService = {
  list: () =>
    isDemoMode() ? demo(demoMidServers) : api.get<MidServerResponse[]>("/midservers"),

  getEccQueue: (midName: string) =>
    isDemoMode() ? demo(demoEccQueue(midName)) : api.get<EccQueueDetail>(`/midservers/${midName}/ecc`),
};

// ── Logs ─────────────────────────────────────────────────────────────────────

export const logService = {
  get: (params?: { limit?: number; incident_id?: string; run_id?: string; agent?: string }) =>
    isDemoMode()
      ? demo(demoLogs.filter((l) => !params?.incident_id || l.incident_id === params.incident_id).slice(0, params?.limit ?? 100))
      : api.get<LogEntry[]>("/logs", params as Record<string, string | number | undefined>),
};

// ── Notifications ────────────────────────────────────────────────────────────

export const notificationService = {
  getCount: () =>
    isDemoMode()
      ? demo({ meta: { status: true, message: "OK" }, data: { total_count: demoNotifications.length, unread_count: demoNotifications.filter((n) => !n.is_read).length } })
      : api.get<NotificationCountResponse>("/notification_history/count"),

  list: (params?: { per_page?: number; page_no?: number }) =>
    isDemoMode()
      ? demo({
          meta: { status: true, message: "OK" },
          data: {
            items: demoNotifications, page_no: params?.page_no ?? 1, per_page: params?.per_page ?? 20,
            total: demoNotifications.length, unread_count: demoNotifications.filter((n) => !n.is_read).length,
          },
        })
      : api.get<NotificationListResponse>("/notification_history/list", params as Record<string, string | number | undefined>),

  delete: (id: string) => {
    if (isDemoMode()) {
      const idx = demoNotifications.findIndex((n) => n.id === id);
      if (idx >= 0) demoNotifications.splice(idx, 1);
      return demo({ meta: { status: true, message: "Notification deleted" }, data: { notification_id: id } });
    }
    return api.delete<NotificationDeleteResponse>(`/notification_history/delete/${id}`);
  },

  clearAll: () => {
    if (isDemoMode()) {
      const count = demoNotifications.length;
      demoNotifications.length = 0;
      return demo({ meta: { status: true, message: "All notifications cleared" }, data: { deleted_count: count } });
    }
    return api.delete<NotificationClearAllResponse>("/notification_history/delete_all");
  },

  markAsRead: (id: string) => {
    if (isDemoMode()) {
      const notification = demoNotifications.find((n) => n.id === id);
      if (notification) notification.is_read = true;
      return demo({ meta: { status: true, message: "Marked as read" }, data: notification ?? demoNotifications[0] });
    }
    return api.put<NotificationMarkAsReadResponse>(`/notification_history/mark_as_read/${id}`);
  },

  markAllAsRead: () => {
    if (isDemoMode()) {
      demoNotifications.forEach((n) => { n.is_read = true; });
      return demo({ meta: { status: true, message: "All marked as read" }, data: { updated_count: demoNotifications.length } });
    }
    return api.put<NotificationMarkAllAsReadResponse>("/notification_history/mark_all_as_read");
  },
};
