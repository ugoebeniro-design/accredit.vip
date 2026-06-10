"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileText,
  Gem,
  Lock,
  Menu,
  Mic,
  Moon,
  Music,
  PartyPopper,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { NotificationBell } from "@/components/notification-bell";
import { getEvents, type EventData, type EventFilters } from "@/lib/api/events";
import { apiClient } from "@/lib/api-client";
import { ErrorBoundary } from "@/components/shared/error-boundary";

const CATEGORY_ICONS: Record<string, ReactNode> = {
  concert: <Music className="h-9 w-9" />,
  conference: <Mic className="h-9 w-9" />,
  festival: <PartyPopper className="h-9 w-9" />,
  nightlife: <Moon className="h-9 w-9" />,
  sports: <Trophy className="h-9 w-9" />,
  corporate: <Briefcase className="h-9 w-9" />,
  private: <Lock className="h-9 w-9" />,
  wedding: <Gem className="h-9 w-9" />,
};

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visibleStart = local.slice(0, Math.min(8, local.length));
  const visibleEnd = local.length > 1 ? local.slice(-1) : "";
  return `${visibleStart}******${visibleEnd}@${domain}`;
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
      <div className="skeleton h-28" />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-5 w-20 rounded-full mt-1" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, loading, logout } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [walletBalances, setWalletBalances] = useState<Record<string, number> | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();

  const loadEvents = useCallback(async (filters?: EventFilters) => {
    setEventsLoading(true);
    try {
      const data = await getEvents(filters);
      setEvents(data);
    } catch {}
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) { loadEvents(); apiClient<any>("/wallet").then((d) => setWalletBalances(d.balances || { NGN: d.balance })).catch(() => {}); }
  }, [user, loading, router, loadEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvents({ search: search || undefined, category: category || undefined });
  };

  const handleReset = () => {
    setSearch(""); setCategory(""); loadEvents();
  };

  if (loading || !user) return null;

  const firstName = user.full_name?.split(" ")[0] || "there";

  // Stats
  const totalEvents = events.length;
  const activeEvents = events.filter((e) => e.status === "active" || e.status === "published").length;
  const draftEvents = events.filter((e) => e.status === "draft").length;

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
        style={{
          background: "#0D1B2A",
          width: sidebarOpen ? "256px" : "80px",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-24 px-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center flex-1 min-w-0">
            <Image src="/logo-dark-trim.png" alt="accredit.vip" width={4086} height={801} className="h-16 w-auto object-contain drop-shadow-[0_0_12px_rgba(233,30,140,0.25)]" />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 hidden lg:block ml-2"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {sidebarOpen && <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Main Menu</p>}

          {[
            {
              href: "/dashboard", label: "Dashboard", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )
            },
            {
              href: "/dashboard/events", label: "Events", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )
            },
            {
              href: "/dashboard/create", label: "Create Event", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )
            },
            {
              href: "/dashboard/wallet", label: "Wallet", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              )
            },

          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all"
              style={{ "--tw-bg-opacity": "0.08" } as React.CSSProperties}
              title={!sidebarOpen ? item.label : ""}
            >
              <span className="text-white/40">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}

          {sidebarOpen && (
            <div className="pt-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Discover</p>
              <Link
                href="/attend"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all"
              >
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Events
              </Link>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}
            >
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
              <p className="text-white/55 text-[11px] leading-tight" title={maskEmail(user.email)}>{maskEmail(user.email)}</p>
            </div>
          </div>
          <Link href="/dashboard/change-password" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#E91E8C] bg-[#E91E8C]/10 hover:bg-[#E91E8C]/20 transition-all w-full">
            <Lock className="w-4 h-4" />
            Change Password
          </Link>
          <button onClick={() => setShowLogoutConfirm(true)} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-red-500 border-2 border-red-800/40 hover:bg-red-500/10 hover:border-red-500/50 font-bold text-sm transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="h-16 flex items-center justify-between px-6 flex-shrink-0"
          style={{ background: "white", borderBottom: "1px solid #e8edf2" }}
        >
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <p className="text-xs text-gray-400 font-medium">Welcome back,</p>
              <p className="flex items-center gap-1.5 text-sm font-bold text-[#0D1B2A]">
                {user.full_name || firstName}
                <ShieldCheck className="h-4 w-4 text-[#E91E8C]" aria-hidden="true" />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link href="/dashboard/wallet" className="flex items-center gap-1.5 rounded-xl border border-[#e8edf2] bg-white px-3 py-1.5 text-xs font-bold text-[#0D1B2A] hover:border-pink-300 hover:text-pink-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {walletBalances ? `₦${(walletBalances.NGN ?? 0).toLocaleString()}` : "Wallet"}
            </Link>
            <Link href="/dashboard/create" className="btn-primary text-xs py-2 px-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Event
            </Link>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 px-6 py-8 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {[
              {
                label: "Total Events",
                value: totalEvents,
                icon: <CalendarDays className="h-6 w-6" />,
                color: "#E91E8C",
                bg: "rgba(233,30,140,0.08)",
              },
              {
                label: "Active Events",
                value: activeEvents,
                icon: <CheckCircle2 className="h-6 w-6" />,
                color: "#10b981",
                bg: "rgba(16,185,129,0.08)",
              },
              {
                label: "Draft Events",
                value: draftEvents,
                icon: <FileText className="h-6 w-6" />,
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.08)",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{ background: "white", border: "1px solid #e8edf2", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: stat.bg, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[#0D1B2A]">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "white", border: "1px solid #e8edf2" }}
          >
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Search</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by title or venue..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-premium pl-9"
                  />
                </div>
              </div>
              <div className="w-44">
                <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-premium"
                >
                  <option value="">All Categories</option>
                  <option value="concert">Concert</option>
                  <option value="conference">Conference</option>
                  <option value="festival">Festival</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="sports">Sports</option>
                  <option value="corporate">Corporate</option>
                  <option value="private">Private</option>
                  <option value="wedding">Wedding</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-xs py-2.5 px-4">
                  Search
                </button>
                {(search || category) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs px-4 py-2.5 rounded-xl border border-[#e8edf2] text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Events Grid */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0D1B2A]">Your Events</h2>
            <Link
              href="/dashboard/events"
              className="text-xs font-semibold hover:underline"
              style={{ color: "#E91E8C" }}
            >
              View all →
            </Link>
          </div>

          {eventsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: "white", border: "2px dashed #e8edf2" }}
            >
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl mb-5"
                style={{ background: "rgba(233,30,140,0.08)" }}
              >
                <CalendarDays className="h-8 w-8 text-[#E91E8C]" />
              </div>
              <h3 className="text-lg font-bold text-[#0D1B2A] mb-2">
                {search || category ? "No matching events" : "No events yet"}
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                {search || category
                  ? "Try different search terms or clear your filters."
                  : "Create your first event and start managing guests."}
              </p>
              {!search && !category && (
                <Link href="/dashboard/create" className="btn-primary inline-flex">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Event
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/dashboard/events/${event.id}`} className="block group">
                  <div
                    className="rounded-2xl overflow-hidden transition-all duration-200 group-hover:-translate-y-1 flex flex-col"
                    style={{
                      background: "white",
                      border: "1px solid #e8edf2",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Color accent top */}
                    <div
                      className="h-24 flex items-center justify-center text-white/90"
                      style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1a2e45 100%)" }}
                    >
                      {CATEGORY_ICONS[event.category || event.event_type || ""] || <PartyPopper className="h-9 w-9" />}
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <span className="badge-pink text-[10px] mb-2.5 self-start">
                        {(event.category || event.event_type || "event").toUpperCase()}
                      </span>
                      <h3 className="font-bold text-[#0D1B2A] text-sm line-clamp-2 group-hover:text-[#E91E8C] transition-colors mb-1">
                        {event.title}
                      </h3>
                      <div className="mt-auto pt-3 space-y-1" style={{ borderTop: "1px solid #f1f5f9" }}>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {event.venue}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {event.event_date} · {event.event_time}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-lg">Log Out</p>
                <p className="text-white/60 text-sm">Are you sure you want to log out?</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/70 hover:text-white bg-white/08 hover:bg-white/12 transition-all">
                Cancel
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); logout(); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
