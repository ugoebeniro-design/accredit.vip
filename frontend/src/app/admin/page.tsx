"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Admin Dashboard Stats (Mock data - replace with real API calls)
  const stats = [
    { label: "Total Events", value: "234", change: "+12%", icon: Calendar, color: "#E91E8C" },
    { label: "Total Users", value: "1,847", change: "+8%", icon: Users, color: "#0D1B2A" },
    { label: "Pending Review", value: "23", change: "-3%", icon: AlertCircle, color: "#F5A623" },
    { label: "Revenue", value: "₦2.4M", change: "+24%", icon: TrendingUp, color: "#00D98E" },
  ];

  // Show admin dashboard if user is logged in as admin
  if (user?.role === "admin") {
    return (
      <div className="min-h-screen bg-[#f8f9fc]">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 h-screen bg-white border-r border-[#e8edf2] transition-all duration-300 z-40 ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-4 border-b border-[#e8edf2]">
            {sidebarOpen && (
              <Image
                src="/logo-dark-trim.png"
                alt="accredit.vip"
                width={4071}
                height={761}
                className="h-8 w-auto object-contain"
              />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[#f0f1f7] rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {[
              { label: "Dashboard", href: "/admin", icon: BarChart3 },
              { label: "Event Moderation", href: "/admin/events", icon: Calendar },
              { label: "User Management", href: "/admin/users", icon: Users },
              { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
              { label: "Settings", href: "/admin/settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748b] hover:bg-[#f0f1f7] hover:text-[#E91E8C] transition-all group"
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium group-hover:font-bold">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-400 font-bold text-sm transition-all hover:shadow-lg active:scale-95"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
          {/* Header */}
          <header className="h-20 border-b border-[#e8edf2] bg-white sticky top-0 z-30">
            <div className="h-full px-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#0D1B2A]">Dashboard</h1>
                <p className="text-xs text-[#94a3b8] mt-1">Welcome back, {user.full_name}!</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#C4166F] flex items-center justify-center text-white font-bold text-sm">
                {user.full_name.charAt(0)}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-white rounded-2xl border border-[#e8edf2] p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="p-3 rounded-lg"
                        style={{ background: `${stat.color}15` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: stat.color }} />
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-[#94a3b8] text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-black text-[#0D1B2A] mt-2">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8edf2] p-6">
                <h2 className="text-lg font-black text-[#0D1B2A] mb-6">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Review Events",
                      desc: "23 pending",
                      href: "/admin/events",
                      icon: Calendar,
                      color: "#E91E8C",
                    },
                    {
                      label: "Manage Users",
                      desc: "1,847 total",
                      href: "/admin/users",
                      icon: Users,
                      color: "#0D1B2A",
                    },
                    {
                      label: "View Analytics",
                      desc: "Performance",
                      href: "/admin/analytics",
                      icon: TrendingUp,
                      color: "#00D98E",
                    },
                    {
                      label: "Settings",
                      desc: "Configure",
                      href: "/admin/settings",
                      icon: Settings,
                      color: "#F5A623",
                    },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.label}
                        href={action.href}
                        className="group p-4 rounded-xl border border-[#e8edf2] hover:border-[#E91E8C] hover:bg-[#fff1f8] transition-all"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ background: `${action.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: action.color }} />
                        </div>
                        <p className="font-bold text-[#0D1B2A] text-sm group-hover:text-[#E91E8C] transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-1">{action.desc}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-2xl border border-[#e8edf2] p-6">
                <h2 className="text-lg font-black text-[#0D1B2A] mb-6">System Status</h2>
                <div className="space-y-4">
                  {[
                    { label: "Database", status: "healthy", color: "#00D98E" },
                    { label: "API Server", status: "healthy", color: "#00D98E" },
                    { label: "Payment Gateway", status: "healthy", color: "#00D98E" },
                    { label: "Email Service", status: "healthy", color: "#00D98E" },
                  ].map((service) => (
                    <div key={service.label} className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#64748b]">{service.label}</p>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: service.color }}
                        />
                        <span className="text-xs font-bold text-[#94a3b8] capitalize">{service.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="mt-6 bg-white rounded-2xl border border-[#e8edf2] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-[#0D1B2A]">Recent Events</h2>
                <Link href="/admin/events" className="text-sm font-bold text-[#E91E8C] hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { title: "Tech Conference 2026", status: "approved", date: "Today" },
                  { title: "Summer Music Festival", status: "pending", date: "Yesterday" },
                  { title: "Wedding Reception", status: "approved", date: "2 days ago" },
                  { title: "Corporate Retreat", status: "flagged", date: "3 days ago" },
                ].map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[#e8edf2] hover:border-[#E91E8C] transition-all">
                    <div>
                      <p className="font-bold text-[#0D1B2A] text-sm">{event.title}</p>
                      <p className="text-xs text-[#94a3b8]">{event.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.status === "approved" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {event.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                      {event.status === "flagged" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5" /> Flagged
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
              <h2 className="text-2xl font-black text-[#0D1B2A] mb-3">Sign Out?</h2>
              <p className="text-sm text-[#64748b] mb-6">
                Are you sure you want to sign out? You'll need to log in again to access the admin panel.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-[#e8edf2] bg-white text-[#0D1B2A] font-bold hover:bg-[#f0f1f7] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => logout()}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin Login Page
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient<{ access_token: string; user: any }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (res.user.role !== "admin") {
        setError("❌ Access denied. Admin credentials required.");
        setLoading(false);
        return;
      }

      localStorage.setItem("access_token", res.access_token);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#1a2a3a] to-[#E91E8C]/20 flex flex-col items-center justify-center px-4 py-12">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#E91E8C]/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00D98E]/10 rounded-full blur-3xl -z-10" />

      {/* Logo */}
      <Link href="/" className="mb-12 hover:opacity-80 transition-opacity">
        <Image
          src="/logo-dark-trim.png"
          alt="accredit.vip"
          width={4071}
          height={761}
          className="h-12 w-auto object-contain"
        />
      </Link>

      {/* Login Card */}
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-8 md:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-block px-4 py-2 rounded-lg bg-[#E91E8C] text-white mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em]">🔐 Secure Access</p>
            </div>
            <h1 className="text-4xl font-black text-[#0D1B2A] mt-4">Admin Portal</h1>
            <p className="text-sm text-[#64748b] mt-3">
              Restricted access for authorized administrators
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-[#0D1B2A] mb-2.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@accredit.vip"
                required
                disabled={loading}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#e8edf2] bg-white text-[#0D1B2A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-[#0D1B2A] mb-2.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-[#e8edf2] bg-white text-[#0D1B2A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0D1B2A] transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 relative overflow-hidden group"
              style={{
                background: loading ? "#94a3b8" : "linear-gradient(135deg, #E91E8C, #C4166F)",
                boxShadow: loading ? "none" : "0 10px 30px rgba(233,30,140,0.4)",
              }}
            >
              <span className="relative z-10">
                {loading ? "Logging in..." : "Access Admin Portal"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-500" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#e8edf2] text-center">
            <p className="text-xs text-[#94a3b8]">
              Not an admin?{" "}
              <Link href="/" className="font-bold text-[#E91E8C] hover:underline">
                Back to Home
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/70 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}
