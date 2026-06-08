"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ClipboardList, Settings, LogOut } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user?.is_admin) {
      router.push("/dashboard");
      return;
    }
  }, [user, router]);

  if (!user?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="border-b border-[#e8edf2] bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Admin Dashboard</h1>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex items-center gap-2 px-4 py-2 text-[#64748b] hover:text-[#0D1B2A] transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-[#0D1B2A] mb-8">Welcome, {user.full_name}!</h2>

        {/* Admin Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Moderation */}
          <button
            onClick={() => router.push("/admin/events")}
            className="block p-8 bg-white rounded-xl border border-[#e8edf2] shadow-sm hover:shadow-lg transition-all hover:border-[#E91E8C]"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#E91E8C]/10 rounded-lg">
                <ClipboardList className="h-8 w-8 text-[#E91E8C]" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-[#0D1B2A]">Event Moderation</h3>
                <p className="text-sm text-[#64748b]">Review and approve pending events</p>
              </div>
            </div>
            <p className="text-[#94a3b8] text-sm">
              Manage event submissions, approve public listings, and handle flagged content.
            </p>
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push("/admin/settings")}
            className="block p-8 bg-white rounded-xl border border-[#e8edf2] shadow-sm hover:shadow-lg transition-all hover:border-[#E91E8C]"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Settings className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-[#0D1B2A]">Settings</h3>
                <p className="text-sm text-[#64748b]">Coming soon</p>
              </div>
            </div>
            <p className="text-[#94a3b8] text-sm">
              Configure platform settings and moderation rules.
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
