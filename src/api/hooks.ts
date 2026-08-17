import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback, useState } from "react";
import {
  healthService,
  sessionService,
  incidentService,
  controlService,
  monitorService,
  agentService,
  toolService,
  logService,
  streamService,
  midServerService,
  approvalService,
  notificationService,
} from "./services";
import type {
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateIncidentRequest,
  ConfigUpdateRequest,
  AddContainerRequest,
  ApprovalDecisionRequest,
  SSEEvent,
} from "./types";
import { isDemoMode } from "@/lib/demoMode";

// ── Query Keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  health: ["health"] as const,
  sessions: (projectId?: string) => ["sessions", projectId] as const,
  session: (id: string) => ["session", id] as const,
  incidents: {
    bySession: (sessionId: string, status?: string) => ["incidents", "session", sessionId, status] as const,
    recent: (limit?: number, status?: string) => ["incidents", "recent", limit, status] as const,
    detail: (id: string) => ["incidents", "detail", id] as const,
    report: (id: string) => ["incidents", "report", id] as const,
  },
  config: ["config"] as const,
  monitor: {
    containers: ["monitor", "containers"] as const,
    status: ["monitor", "status"] as const,
  },
  agents: (serviceType?: string) => ["agents", serviceType] as const,
  agent: (name: string) => ["agent", name] as const,
  tools: (category?: string, agent?: string) => ["tools", category, agent] as const,
  tool: (name: string) => ["tool", name] as const,
  logs: (params?: Record<string, unknown>) => ["logs", params] as const,
  notifications: {
    count: ["notifications", "count"] as const,
    list: (params?: Record<string, unknown>) => ["notifications", "list", params] as const,
  },
};

// ── Health ───────────────────────────────────────────────────────────────────

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthService.check(),
    refetchInterval: 30_000,
    retry: 1,
  });
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function useSessions(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.sessions(projectId),
    queryFn: () => sessionService.list(projectId),
  });
}

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => sessionService.get(sessionId),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: CreateSessionRequest) => sessionService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: UpdateSessionRequest }) =>
      sessionService.update(sessionId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionService.delete(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

// ── Incidents ────────────────────────────────────────────────────────────────

export function useRecentIncidents(limit?: number, status?: string) {
  return useQuery({
    queryKey: queryKeys.incidents.recent(limit, status),
    queryFn: () => incidentService.listRecent(limit, status),
    refetchInterval: 10_000,
  });
}

export function useSessionIncidents(sessionId: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.incidents.bySession(sessionId, status),
    queryFn: () => incidentService.listBySession(sessionId, status),
    enabled: !!sessionId,
  });
}

export function useIncidentDetail(incidentId: string) {
  return useQuery({
    queryKey: queryKeys.incidents.detail(incidentId),
    queryFn: () => incidentService.get(incidentId),
    enabled: !!incidentId,
    refetchInterval: 5_000,
  });
}

export function useIncidentReport(incidentId: string) {
  return useQuery({
    queryKey: queryKeys.incidents.report(incidentId),
    queryFn: () => incidentService.getReport(incidentId),
    enabled: !!incidentId,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: CreateIncidentRequest }) =>
      incidentService.create(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useRetryRca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) => incidentService.retryRca(incidentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

// ── Stream (SSE) ─────────────────────────────────────────────────────────────

export function useSSEStream(sessionId: string | null) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (!sessionId) return;
    if (cleanupRef.current) cleanupRef.current();

    const cleanup = streamService.subscribe(
      sessionId,
      (event) => {
        if (event.type === "connected") {
          setIsConnected(true);
        } else if (event.type !== "heartbeat") {
          setEvents((prev) => [...prev.slice(-200), event]);
        }
      },
      () => {
        setIsConnected(false);
      },
    );
    cleanupRef.current = cleanup;
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, isConnected, clearEvents };
}

// ── Control ──────────────────────────────────────────────────────────────────

export function useCancelRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => controlService.cancelRun(runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

export function useServerConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => controlService.getConfig(),
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfigUpdateRequest) => controlService.updateConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.config }),
  });
}

// ── Monitor ──────────────────────────────────────────────────────────────────

export function useMonitoredContainers() {
  return useQuery({
    queryKey: queryKeys.monitor.containers,
    queryFn: () => monitorService.listContainers(),
    refetchInterval: 15_000,
  });
}

export function useMonitorStatus() {
  return useQuery({
    queryKey: queryKeys.monitor.status,
    queryFn: () => monitorService.getStatus(),
    refetchInterval: 15_000,
  });
}

export function useAddContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddContainerRequest) => monitorService.addContainer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.monitor.containers });
      qc.invalidateQueries({ queryKey: queryKeys.monitor.status });
    },
  });
}

export function useRemoveContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => monitorService.removeContainer(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.monitor.containers });
      qc.invalidateQueries({ queryKey: queryKeys.monitor.status });
    },
  });
}

// ── Registry: Agents ─────────────────────────────────────────────────────────

export function useAgents(serviceType?: string) {
  return useQuery({
    queryKey: queryKeys.agents(serviceType),
    queryFn: () => agentService.list(serviceType),
  });
}

export function useAgentCumulativeScore() {
  return useQuery({
    queryKey: ["agents", "cumulative-score"],
    queryFn: () => agentService.getCumulativeScore(),
  });
}

export function useAgentDetail(agentName: string) {
  return useQuery({
    queryKey: queryKeys.agent(agentName),
    queryFn: () => agentService.get(agentName),
    enabled: !!agentName,
  });
}

// ── Registry: Tools ──────────────────────────────────────────────────────────

export function useTools(category?: string, agent?: string) {
  return useQuery({
    queryKey: queryKeys.tools(category, agent),
    queryFn: () => toolService.list(category, agent),
  });
}

export function useToolDetail(toolName: string) {
  return useQuery({
    queryKey: queryKeys.tool(toolName),
    queryFn: () => toolService.get(toolName),
    enabled: !!toolName,
  });
}

// ── Approvals ────────────────────────────────────────────────────────────────

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () => approvalService.listPending(),
    refetchInterval: 5_000,
  });
}

export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ["approvals", status],
    queryFn: () => approvalService.list(status),
    refetchInterval: 10_000,
  });
}

export function useIncidentApprovals(incidentId: string | null) {
  return useQuery({
    queryKey: ["approvals", "incident", incidentId],
    queryFn: () => approvalService.listForIncident(incidentId!),
    enabled: !!incidentId,
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ approvalId, data }: { approvalId: string; data: ApprovalDecisionRequest }) =>
      approvalService.decide(approvalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

// ── MID Servers ──────────────────────────────────────────────────────────────

export function useMidServers() {
  return useQuery({
    queryKey: ["midservers"],
    queryFn: () => midServerService.list(),
    refetchInterval: 15_000,
  });
}

export function useMidServerEcc(midName: string) {
  return useQuery({
    queryKey: ["midservers", "ecc", midName],
    queryFn: () => midServerService.getEccQueue(midName),
    enabled: !!midName,
    refetchInterval: 15_000,
  });
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export function useLogs(params?: { limit?: number; incident_id?: string; run_id?: string; agent?: string }) {
  return useQuery({
    queryKey: queryKeys.logs(params),
    queryFn: () => logService.get(params),
    refetchInterval: 10_000,
  });
}

// ── Stream Incident Detail Custom Hook ───────────────────────────────────────

export function useIncidentStream(incidentId?: string | null) {
  const [data, setData] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedStage, setStreamedStage] = useState<string | null>(null);

  useEffect(() => {
    if (!incidentId) return;
    // In demo mode there is no live backend to stream from — restDetail (from
    // the demo data provider) already has the full picture, so skip the raw
    // SSE fetch rather than let its placeholder data override real fields.
    if (isDemoMode()) return;

    let abortController = new AbortController();
    let isMounted = true;

    async function fetchStream() {
      setIsStreaming(true);
      try {
        const url = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
        const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
        const response = await fetch(`${url}/incidents/${incidentId}/stream`, {
          signal: abortController.signal,
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });

        if (!response.body) throw new Error("No body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Progressive state
        let currentData: any = {
          id: incidentId,
          session_id: "",
          title: "Resolving Incident...",
          description: "",
          container_id: null,
          container_name: null,
          status: "new",
          severity: "high",
          service_type: "servicenow_incident",
          incident_number: "",
          ci_name: "",
          cmdb_ci: "",
          source: "",
          incident_url: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          resolved_at: null,
          runs: [{
            id: `run-${incidentId}`,
            incident_id: incidentId!,
            run_number: 1,
            status: "running",
            rca_result: null,
            plan_result: null,
            execution_result: null,
            validation_result: null,
            started_at: new Date().toISOString(),
            completed_at: null,
          }],
          logs: [],
          stage_logs: { rca: [], planned: [], executing: [], validating: [] }
        };

        if (isMounted) setData({ ...currentData });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() || "";

          for (const eventStr of events) {
            if (!eventStr.trim()) continue;

            let eventType = "message";
            let dataStr = "";

            const lines = eventStr.split(/\r?\n/);
            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataStr += line.slice(5).trim();
              }
            }

            if (!dataStr) continue;

            try {
              const payload = JSON.parse(dataStr);
              
              if (eventType === "stage_start") {
                setStreamedStage(payload.stage);
                currentData.status = payload.stage;
              } else {
                setStreamedStage(eventType);
              }

              if (eventType === "approval_required") {
                currentData.status = "awaiting_approval";
              } else if (eventType === "incident_metadata") {
                currentData = { ...currentData, ...payload.incident };
                currentData.status = "rca";
              } else if (eventType === "rca_result" || (eventType === "stage_complete" && payload.stage === "rca")) {
                if (payload.explanation) payload.result.explanation = payload.explanation;
                if (currentData.runs.length > 0) currentData.runs[currentData.runs.length - 1].rca_result = payload.result;
                if (currentData.status !== "awaiting_approval" && currentData.status !== "execution" && currentData.status !== "validation") {
                  currentData.status = "planned"; // transition to plan
                }
              } else if (eventType === "plan_result" || (eventType === "stage_complete" && payload.stage === "plan")) {
                if (payload.explanation) payload.result.explanation = payload.explanation;
                if (currentData.runs.length > 0) currentData.runs[currentData.runs.length - 1].plan_result = payload.result;
                currentData.status = "executing"; // transition to executing
              } else if (eventType === "execution_result" || (eventType === "stage_complete" && payload.stage === "execution")) {
                if (payload.explanation) payload.result.explanation = payload.explanation;
                if (currentData.runs.length > 0) currentData.runs[currentData.runs.length - 1].execution_result = payload.result;
                currentData.status = "validating";
              } else if (eventType === "validation_result" || (eventType === "stage_complete" && payload.stage === "validation")) {
                if (payload.explanation) payload.result.explanation = payload.explanation;
                if (currentData.runs.length > 0) currentData.runs[currentData.runs.length - 1].validation_result = payload.result;
                currentData.status = "resolved";
              } else if (eventType === "complete") {
                if (payload.status) currentData.status = payload.status;
                setIsStreaming(false);
              } else if (eventType === "logs") {
                if (payload.logs) {
                  currentData.logs = [...(currentData.logs || []), ...payload.logs];

                  // Attach to specific stage
                  const st = currentData.status === "new" ? "rca" : currentData.status;
                  if (!currentData.stage_logs) currentData.stage_logs = { rca: [], planned: [], executing: [], validating: [] };
                  if (currentData.stage_logs[st]) {
                    currentData.stage_logs[st] = [...currentData.stage_logs[st], ...payload.logs];
                  } else {
                    currentData.stage_logs[st] = payload.logs;
                  }
                }
              }

              if (isMounted) setData({ ...currentData });
            } catch (e) {
              console.error("Failed to parse chunk", eventType, e);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error", err);
        }
      } finally {
        if (isMounted) {
          setIsStreaming(false);
          setStreamedStage("complete");
        }
      }
    }

    fetchStream();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [incidentId]);

  return { data, isStreaming, currentStage: streamedStage };
}

// ── Notifications ────────────────────────────────────────────────────────────

export function useNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.count,
    queryFn: () => notificationService.getCount(),
    refetchInterval: 60_000, // Refresh count every minute
  });
}

export function useNotifications(params?: { per_page?: number; page_no?: number }) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationService.list(params),
    enabled: true,
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.clearAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
