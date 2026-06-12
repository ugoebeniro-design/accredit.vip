"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { ChevronLeft, Search, CheckCircle2, XCircle, Eye, Trash2, Menu, X, BarChart3, Calendar, Users, Settings, LogOut, Loader, Clock, AlertTriangle, CreditCard, DollarSign, Database } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { NotificationBell } from "@/components/notification-bell";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visibleStart = local.slice(0, Math.min(8, local.length));
  const visibleEnd = local.length > 1 ? local.slice(-1) : "";
  return `${visibleStart}******${visibleEnd}@${domain}`;
}

export default function AdminEventsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "admin" && user.role !== "super_admin"))) {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const itemsPerPage = 10;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let data: any;
      if (filterStatus === "all") {
        data = await apiClient<any>("/admin/events?per_page=50");
      } else if (filterStatus === "pending") {
        data = await apiClient<any>("/admin/events/pending?limit=50");
      } else if (filterStatus === "flagged") {
        data = await apiClient<any>("/admin/events/flagged?limit=50");
      } else if (filterStatus === "approved") {
        data = await apiClient<any>("/admin/events?per_page=50");
      }
      setEvents(data?.events || []);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [filterStatus]);

  const handleAction = async (eventId: number, action: "approve" | "reject" | "delete") => {
    try {
      if (action === "delete") {
        await apiClient(`/admin/events/${eventId}`, { method: "DELETE" });
      } else if (action === "reject") {
        setRejectModal(eventId);
        return;
      } else {
        await apiClient(`/admin/events/${eventId}/${action}`, { method: "POST" });
      }
      fetchEvents();
    } catch {}
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    try {
      await apiClient(`/admin/events/${rejectModal}/reject`, {
        method: "POST",
        body: { reason: rejectReason || "No reason provided" },
      });
      setRejectModal(null);
      setRejectReason("");
      fetchEvents();
    } catch {}
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]"><Loader className="w-8 h-8 animate-spin text-[#E91E8C]" /></div>;

  const totalPages = Math.ceil(events.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = events.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <aside className={`fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40 ${sidebarOpen ? "w-64" : "w-20"}`} style={{ background: "#0D1B2A", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="h-20 flex items-center justify-between px-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {sidebarOpen && <Link href="/admin"><Image src="/logo-dark-trim.png" alt="accredit.vip" width={4086} height={801} className="h-8 w-auto object-contain" /></Link>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {sidebarOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {[
            { label: "Dashboard", href: "/admin", Icon: BarChart3 },
            { label: "Event Moderation", href: "/admin/events", Icon: Calendar },
            { label: "Users", href: "/admin/users", Icon: Users },
            { label: "Sessions", href: "/admin/sessions", Icon: Clock },
            { label: "Payments", href: "/admin/payments", Icon: DollarSign },
            { label: "Withdrawals", href: "/admin/withdrawals", Icon: CreditCard },
            { label: "Fraud", href: "/admin/fraud", Icon: AlertTriangle },
            ...(user?.role === "super_admin" ? [{ label: "Audience Data", href: "/admin/audience", Icon: Database }] : []),
            { label: "Settings", href: "/admin/settings", Icon: Settings },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all" style={{ "--tw-bg-opacity": "0.08" } as React.CSSProperties} title={!sidebarOpen ? item.label : ""}>
              <item.Icon className="w-5 h-5 text-white/40" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 flex-shrink-0 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {sidebarOpen && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Account</div>
              <div className="text-xs text-white font-medium truncate" title={maskEmail(user.email)}>
                {maskEmail(user.email)}
              </div>
              <div className="text-[11px] text-white/55">
                Last logged in: {new Date(user.last_login || Date.now()).toLocaleDateString()} at {new Date(user.last_login || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
          <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white font-bold text-sm transition-all hover:bg-red-600 active:scale-95">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <header className="h-20 border-b border-[#e8edf2] bg-white sticky top-0 z-30">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-[#64748b] hover:text-[#0D1B2A]"><ChevronLeft className="w-5 h-5" /></Link>
              <h1 className="text-2xl font-black text-[#0D1B2A]">Event Moderation</h1>
            </div>
            <NotificationBell admin />
          </div>
        </header>

        <main className="p-6">
          <div className="bg-white rounded-2xl border border-[#e8edf2] p-6 mb-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                <input type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#e8edf2] focus:outline-none focus:border-[#E91E8C] text-[#0D1B2A]" />
              </div>
              <div className="flex gap-2">
                {["All", "Pending", "Approved", "Flagged"].map((label) => (
                  <button key={label} onClick={() => setFilterStatus(label.toLowerCase())} className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${filterStatus === label.toLowerCase() ? "bg-[#E91E8C] text-white" : "bg-[#f0f1f7] text-[#64748b] hover:bg-[#e8edf2]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {events.length > 0 && (
              <div className="border-t border-[#e8edf2] pt-4 flex items-center justify-between">
                <p className="text-sm text-[#64748b]">Showing page <input type="text" inputMode="numeric" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const maxPages = Math.ceil(events.length / itemsPerPage); const num = parseInt(e.currentTarget.value); if (!e.currentTarget.value || isNaN(num) || num < 1) { setCurrentPage(1); setPageInput("1"); } else if (num > maxPages) { setCurrentPage(maxPages); setPageInput(String(maxPages)); } else { setCurrentPage(num); setPageInput(String(num)); } e.currentTarget.blur(); } }} onBlur={(e) => { const maxPages = Math.ceil(events.length / itemsPerPage); const num = parseInt(e.target.value); if (!e.target.value || isNaN(num) || num < 1) { setCurrentPage(1); setPageInput("1"); } else if (num > maxPages) { setCurrentPage(maxPages); setPageInput(String(maxPages)); } else { setCurrentPage(num); setPageInput(String(num)); } }} className="w-12 px-2 py-1 rounded-lg border-2 border-[#E91E8C] text-center font-bold text-[#0D1B2A] focus:outline-none focus:border-[#E91E8C] bg-[#E91E8C]/5" /> of {Math.ceil(events.length / itemsPerPage)}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-[#E91E8C] text-white font-bold text-sm hover:bg-[#C4166F] disabled:opacity-40 disabled:cursor-not-allowed transition-all">← Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(events.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(events.length / itemsPerPage)} className="px-4 py-2 rounded-lg bg-[#E91E8C] text-white font-bold text-sm hover:bg-[#C4166F] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next →</button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-[#e8edf2] p-12 text-center">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#94a3b8]">Loading events...</p>
            </div>
          ) : (
            <div className="space-y-4">
                {events
                  .sort((a, b) => new Date(b.created_at || b.event_date || 0).getTime() - new Date(a.created_at || a.event_date || 0).getTime())
                  .filter((e) => !searchQuery || e.title?.toLowerCase().includes(searchQuery.toLowerCase()) || e.host_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((event) => {
                    const displayStatus = event.review_status || event.status || "unknown";
                    const statusColor = displayStatus === "pending_review" || displayStatus === "pending" ? "bg-amber-50 text-amber-600" : displayStatus === "approved" || displayStatus === "published" ? "bg-green-50 text-green-600" : displayStatus === "flagged" || displayStatus === "rejected" ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600";
                    return (
                      <div key={event.id} className="bg-white rounded-2xl border border-[#e8edf2] hover:border-[#E91E8C] p-6 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-black text-[#0D1B2A]">{event.title}</h3>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusColor}`}>
                              {displayStatus.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm text-[#64748b]">
                            <div><p className="text-xs text-[#94a3b8]">Organizer</p><p className="text-[#0D1B2A] font-medium">{event.host_name || event.organizer || event.organizer_email || "Unknown"}</p></div>
                            <div><p className="text-xs text-[#94a3b8]">Date</p><p className="text-[#0D1B2A] font-medium">{event.event_date || event.date || "N/A"}</p></div>
                            <div><p className="text-xs text-[#94a3b8]">Venue</p><p className="text-[#0D1B2A] font-medium">{event.venue || "N/A"}</p></div>
                            <div><p className="text-xs text-[#94a3b8]">Type</p><p className="text-[#0D1B2A] font-medium">{event.event_type || "N/A"}</p></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(displayStatus === "pending_review" || displayStatus === "flagged") && (
                            <>
                              <button onClick={() => handleAction(event.id, "approve")} className="p-3 hover:bg-green-50 rounded-xl" title="Approve"><CheckCircle2 className="w-5 h-5 text-green-600" /></button>
                              <button onClick={() => handleAction(event.id, "reject")} className="p-3 hover:bg-red-50 rounded-xl" title="Reject"><XCircle className="w-5 h-5 text-red-600" /></button>
                            </>
                          )}
                          <button onClick={() => { if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) handleAction(event.id, "delete"); }} className="p-3 hover:bg-red-50 rounded-xl" title="Delete"><Trash2 className="w-5 h-5 text-[#94a3b8]" /></button>
                        </div>
                      </div>
                    );
                  })}
              {events.length === 0 && (
                <div className="bg-white rounded-2xl border border-[#e8edf2] p-12 text-center">
                  <p className="text-[#94a3b8]">No events found</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0D1B2A] mb-2">Reject Event</h3>
            <p className="text-sm text-[#64748b] mb-4">Provide a reason for rejection (optional):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-24 rounded-xl border border-[#d9e2ec] p-3 text-sm outline-none focus:border-[#E91E8C] resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="flex-1 h-11 rounded-xl border border-[#d9e2ec] text-sm font-semibold text-[#64748b] hover:bg-[#f8fafc]">Cancel</button>
              <button onClick={confirmReject} className="flex-1 h-11 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700">Reject Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

