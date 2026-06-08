"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Briefcase, CalendarDays, Compass, Gem, LayoutGrid, Lock, LogOut, Menu, Mic, Moon, Music, PartyPopper, Plus, Trophy, Wallet as WalletIcon, X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getEvents, type EventData } from "@/lib/api/events";

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

export default function EventsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      getEvents().then(setEvents).catch(() => {}).finally(() => setEventsLoading(false));
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <h2 className="text-lg font-bold text-[#0D1B2A] mb-2">Sign Out?</h2>
            <p className="text-[#64748b] mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#e8edf2] text-[#0D1B2A] font-semibold hover:bg-[#f8f9fc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
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
        <div className="flex items-center justify-between h-20 px-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center flex-1 min-w-0">
            <Image src="/logo-white.png" alt="accredit.vip" width={180} height={180} className="h-8 w-auto object-contain" />
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
            { href: "/dashboard", label: "Dashboard", icon: <LayoutGrid className="w-4 h-4" /> },
            { href: "/dashboard/events", label: "Events", icon: <CalendarDays className="w-4 h-4" />, active: true },
            { href: "/dashboard/create", label: "Create Event", icon: <Plus className="w-4 h-4" /> },
            { href: "/dashboard/wallet", label: "Wallet", icon: <WalletIcon className="w-4 h-4" /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: item.active ? "rgba(233,30,140,0.15)" : "transparent",
                color: item.active ? "#E91E8C" : "rgba(255,255,255,0.6)",
              }}
              title={!sidebarOpen ? item.label : ""}
            >
              <span className={item.active ? "text-[#E91E8C]" : "text-white/40"}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}

          {/* Discover Section */}
          {sidebarOpen && (
            <div className="pt-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Discover</p>
              <Link
                href="/attend"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all"
              >
                <Compass className="w-4 h-4" />
                Browse Events
              </Link>
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 flex-shrink-0 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
              {user.full_name?.charAt(0) || "U"}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
                <p className="text-white/40 text-xs truncate">{user.email}</p>
              </div>
            )}
          </div>

          {/* Change Password & Logout */}
          {sidebarOpen && (
            <>
              <Link
                href="/change-password"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all"
              >
                <Eye className="w-4 h-4" />
                Change Password
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-red-500 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold text-sm transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "white", borderBottom: "1px solid #e8edf2" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu className="w-5 h-5 text-[#0D1B2A]" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#0D1B2A]">All Events</h1>
              <p className="text-xs text-gray-400">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
            </div>
          </div>
          <Link href="/dashboard/create" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            New Event
          </Link>
        </header>

        <main className="flex-1 px-6 py-8">
          {eventsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #e8edf2" }}>
                  <div className="skeleton h-24" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: "white", border: "2px dashed #e8edf2" }}>
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5 text-[#E91E8C]" style={{ background: "rgba(233,30,140,0.08)" }}>
                <CalendarDays className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0D1B2A] mb-2">No events yet</h3>
              <p className="text-sm text-gray-400 mb-6">Create your first event to get started.</p>
              <Link href="/dashboard/create" className="btn-primary inline-flex">Create Your First Event</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/dashboard/events/${event.id}`} className="block group">
                  <div
                    className="rounded-2xl overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg flex flex-col"
                    style={{ background: "white", border: "1px solid #e8edf2", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                  >
                    <div className="h-24 flex items-center justify-center text-white/90" style={{ background: "linear-gradient(135deg, #0D1B2A, #1a2e45)" }}>
                      {CATEGORY_ICONS[event.category || event.event_type || ""] || <PartyPopper className="h-9 w-9" />}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="badge-pink text-[10px]">{(event.status || "draft").toUpperCase()}</span>
                      </div>
                      <h3 className="font-bold text-[#0D1B2A] text-sm line-clamp-2 group-hover:text-[#E91E8C] transition-colors">{event.title}</h3>
                      <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px solid #f1f5f9" }}>
                        <p className="text-xs text-gray-400">{event.venue}</p>
                        <p className="text-xs text-gray-400">{event.event_date}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
