"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { apiClient, setOnUnauthorized } from "@/lib/api-client";
import { checkIdleTimeout, touchActivity } from "@/lib/auth-storage";

export type User = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_admin: boolean;
  is_verified: boolean;
  verification_channel: string;
  last_login?: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    verification_channel?: string;
  }) => Promise<void>;
  socialLogin: (provider: string, idToken: string, email?: string, fullName?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const activityRef = useRef<(() => void) | null>(null);

  const logout = useCallback(() => {
    apiClient("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("last_activity");
      localStorage.removeItem("user_data");
      sessionStorage.clear();
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      localStorage.removeItem("user_data");
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        window.location.href = "/admin/login";
      }
    });
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const u = await apiClient<User>("/auth/me");
      setUser(u);
      localStorage.setItem("user_data", JSON.stringify(u));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (checkIdleTimeout()) {
          setUser(null);
          localStorage.removeItem("user_data");
          setLoading(false);
          return;
        }

        try {
          const u = await apiClient<User>("/auth/me");
          setUser(u);
          localStorage.setItem("user_data", JSON.stringify(u));
        } catch {
          setUser(null);
          localStorage.removeItem("user_data");
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    activityRef.current = touchActivity;
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => touchActivity();
    events.forEach((e) => window.addEventListener(e, handler));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    touchActivity();
    setUser(res.user);
    localStorage.setItem("user_data", JSON.stringify(res.user));
  };

  const socialLogin = async (provider: string, idToken: string, email?: string, fullName?: string) => {
    const res = await apiClient<{ access_token: string; user: User }>("/auth/social", {
      method: "POST",
      body: { provider, id_token: idToken, email, full_name: fullName },
    });
    touchActivity();
    setUser(res.user);
    localStorage.setItem("user_data", JSON.stringify(res.user));
  };

  const register = async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    verification_channel?: string;
  }) => {
    const res = await apiClient<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: data,
    });
    touchActivity();
    setUser(res.user);
    localStorage.setItem("user_data", JSON.stringify(res.user));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, socialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
