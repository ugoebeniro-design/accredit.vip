"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { ChevronLeft, Search, Menu, X, BarChart3, Calendar, Users, Settings, LogOut, Loader, Clock, AlertTriangle, CreditCard, DollarSign, Database } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { NotificationBell } from "@/components/notification-bell";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visibleStart = local.slice(0, Math.min(8, local.length));
  const visibleEnd = local.length > 1 ? local.slice(-1) : "";
  return `${visibleStart}******${visibleEnd}@${domain}`;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = "/admin/users?per_page=200";
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const data = await apiClient<any>(url);
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [searchQuery]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]"><Loader className="w-8 h-8 animate-spin text-[#E91E8C]" /></div>;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) return null;

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = users.slice(startIndex, startIndex + itemsPerPage);

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
              <h1 className="text-2xl font-black text-[#0D1B2A]">Users</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#64748b]">
              <NotificationBell admin />
              <span className="font-medium">{users.length} user{users.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="bg-white rounded-2xl border border-[#e8edf2] p-6 mb-6">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#e8edf2] focus:outline-none focus:border-[#E91E8C] text-[#0D1B2A]" />
            </div>
            {users.length > 0 && (
              <div className="border-t border-[#e8edf2] pt-4 flex items-center justify-between">
                <p className="text-sm text-[#64748b]">Showing page <input type="text" inputMode="numeric" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const num = parseInt(e.currentTarget.value); if (!e.currentTarget.value || isNaN(num) || num < 1) { setCurrentPage(1); setPageInput("1"); } else if (num > totalPages) { setCurrentPage(totalPages); setPageInput(String(totalPages)); } else { setCurrentPage(num); setPageInput(String(num)); } e.currentTarget.blur(); } }} onBlur={(e) => { const num = parseInt(e.target.value); if (!e.target.value || isNaN(num) || num < 1) { setCurrentPage(1); setPageInput("1"); } else if (num > totalPages) { setCurrentPage(totalPages); setPageInput(String(totalPages)); } else { setCurrentPage(num); setPageInput(String(num)); } }} className="w-12 px-2 py-1 rounded-lg border-2 border-[#E91E8C] text-center font-bold text-[#0D1B2A] focus:outline-none focus:border-[#E91E8C] bg-[#E91E8C]/5" /> of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-[#E91E8C] text-white font-bold text-sm hover:bg-[#C4166F] disabled:opacity-40 disabled:cursor-not-allowed transition-all">← Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-lg bg-[#E91E8C] text-white font-bold text-sm hover:bg-[#C4166F] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next →</button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-[#e8edf2] p-12 text-center">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#94a3b8]">Loading users...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e8edf2] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8edf2] bg-[#f8f9fc]">
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase">ID</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase">Name</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase">Email</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase">Role</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((u) => (
                    <tr key={u.id} className="border-b border-[#e8edf2] hover:bg-[#f8f9fc]">
                      <td className="px-6 py-4 text-sm text-[#64748b]">#{u.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[#0D1B2A]">{u.full_name}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${u.role === "super_admin" || u.role === "admin" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${u.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-center text-[#94a3b8] py-12">No users found</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
