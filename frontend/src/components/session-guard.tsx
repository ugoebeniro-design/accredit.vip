"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PROTECTED_ROUTES = ["/dashboard", "/admin", "/create-event"];

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const lastProtectedPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if current route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

    // Check if this is an auth-related page
    const isAuthPage =
      pathname.startsWith("/auth/") || pathname === "/" || pathname.startsWith("/events");

    if (user) {
      if (isProtectedRoute) {
        // User is in a protected area, update the reference
        lastProtectedPathRef.current = pathname;
      } else if (!isAuthPage) {
        // User navigated to a non-protected, non-auth page
        // This means they're leaving the app entirely, so logout
        logout();
      }
    }
  }, [pathname, user, logout]);

  return <>{children}</>;
}
