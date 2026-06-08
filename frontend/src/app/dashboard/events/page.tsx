"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Briefcase, CalendarDays, Gem, Lock, Mic, Moon, Music, PartyPopper, Trophy } from "lucide-react";
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      getEvents().then(setEvents).catch(() => {}).finally(() => setEventsLoading(false));
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col flex-shrink-0 transition-transform duration-300 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`} style={{ background: "#0D1B2A" }}>
        <div className="flex items-center h-16 px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" onClick={() => setMobileNavOpen(false)}>
            <Image src="/logo-white.png" alt="accredit.vip" width={4071} height={761} className="h-8 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Main Menu</p>
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/dashboard/events", label: "Events", active: true },
            { href: "/dashboard/create", label: "Create Event" },
            { href: "/dashboard/wallet", label: "Wallet" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              onClick={() => setMobileNavOpen(false)}
              style={{
                background: item.active ? "rgba(233,30,140,0.15)" : "transparent",
                color: item.active ? "#E91E8C" : "rgba(255,255,255,0.6)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "white", borderBottom: "1px solid #e8edf2" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-[#0D1B2A]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#0D1B2A]">All Events</h1>
              <p className="text-xs text-gray-400">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
            </div>
          </div>
          <Link href="/dashboard/create" className="btn-primary text-xs py-2 px-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
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
