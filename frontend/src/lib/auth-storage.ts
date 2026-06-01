export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function clearToken() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("last_activity");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function checkIdleTimeout(): boolean {
  const lastActivity = localStorage.getItem("last_activity");
  if (!lastActivity) return false;
  const elapsed = Date.now() - parseInt(lastActivity, 10);
  return elapsed > IDLE_TIMEOUT_MS;
}

export function touchActivity() {
  localStorage.setItem("last_activity", String(Date.now()));
}
