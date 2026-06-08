"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  // Auto-logout when user leaves dashboard (tab close, or nav to non-dashboard page)
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      navigator.sendBeacon("/api/v1/auth/logout");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      logout();
    };
  }, [user, logout]);

  return <>{children}</>;
}
