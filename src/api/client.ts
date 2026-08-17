const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function shouldSkipNgrokBrowserWarning(): boolean {
  return /^https?:\/\//i.test(API_BASE) && /ngrok/i.test(API_BASE);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorCode = "unknown";
    let message = response.statusText;
    let details: Record<string, unknown> | undefined;
    try {
      const body = await response.json();
      errorCode = body.error || (body.meta && body.meta.status === false ? "auth_error" : errorCode);
      message = (body.meta && body.meta.message) || body.message || message;
      details = body.details;
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(response.status, errorCode, message, details);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function buildUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
  const url = `${API_BASE}${path}`;
  if (!params) return url;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `${url}?${qs}` : url;
}

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  if (shouldSkipNgrokBrowserWarning()) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function prepareHeaders(options: RequestInit, customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers = getAuthHeaders(customHeaders);

  // Set default Content-Type if not provided and body is not FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"] && options.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | undefined | null>
): Promise<T> {
  const url = buildUrl(path, params);
  const headers = prepareHeaders(options, options.headers as Record<string, string>);

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && !path.includes("/refresh_token") && !path.includes("/login")) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          return fetch(url, {
            ...options,
            headers: prepareHeaders(options, { ...options.headers as Record<string, string>, "Authorization": `Bearer ${token}` })
          }).then((r) => handleResponse<T>(r));
        });
      }

      isRefreshing = true;

      return new Promise((resolve, reject) => {
        fetch(buildUrl("/refresh_token"), {
          method: "POST",
          headers: getAuthHeaders(), // Use getAuthHeaders directly here to avoid recursive prepareHeaders if needed, or just prepareHeaders({method: "POST"})
        })
          .then((res) => res.json())
          .then((res) => {
            if (res.meta && res.meta.status && res.data && res.data.access_token) {
              const newToken = res.data.access_token;
              localStorage.setItem("access_token", newToken);
              processQueue(null, newToken);
              resolve(request<T>(path, options, params));
            } else {
              processQueue(new Error("Refresh token failed"), null);
              localStorage.removeItem("access_token");
              localStorage.removeItem("user");
              window.location.href = "/login";
              reject(new Error("Session expired"));
            }
          })
          .catch((err) => {
            processQueue(err, null);
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return handleResponse<T>(response);
  } catch (error) {
    throw error;
  }
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | undefined | null>): Promise<T> {
    return request<T>(path, { method: "GET" }, params);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },

  postFile<T>(path: string, formData: FormData): Promise<T> {
    const headers = getAuthHeaders();
    delete headers["Content-Type"];
    return request<T>(path, {
      method: "POST",
      headers,
      body: formData,
    });
  },

  streamSSE(path: string, onEvent: (event: { type: string; data: unknown }) => void, onError?: (err: Error) => void): () => void {
    const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
    const baseUrl = window.location.origin;
    const url = new URL(`${API_BASE}${path}`, baseUrl);
    if (token) {
      url.searchParams.set("token", token);
    }
    const eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      onEvent({ type: "connected", data: { status: "connected" } });
    };

    eventSource.onerror = (e) => {
      if (onError) onError(new Error("SSE connection error"));
    };

    // Listen to all named events
    const eventTypes = ["connected", "heartbeat", "agent_start", "tool_call", "tool_result", "agent_response", "approval_required", "approval_decision", "error"];
    for (const eventType of eventTypes) {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: eventType, data });
        } catch {
          onEvent({ type: eventType, data: e.data });
        }
      });
    }

    return () => eventSource.close();
  },
};
