import { clearToken } from "./auth-storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export async function apiClient<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...opts.headers,
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: opts.method || "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new Error("Unable to reach the server. Please check your connection and try again.");
    }

    if (res.status === 401) {
      clearToken();
      if (onUnauthorized) onUnauthorized();
      const errBody = await res.json().catch(() => ({ detail: "Session expired" }));
      throw new Error(typeof errBody.detail === "string" ? errBody.detail : "Session expired");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const detail =
        typeof err.detail === "string"
          ? err.detail
          : err.detail?.message || "Request failed";
      throw new Error(detail);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}
