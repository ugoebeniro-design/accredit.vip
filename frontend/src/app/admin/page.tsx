"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  getAdminStats,
  getAdminUsers,
  getAdminEvents,
  getAdminRevenue,
  getAdminRevenueTimeline,
  getAdminUsersTimeline,
  getAdminEventsTimeline,
  getAdminDeliveryStats,
  getAdminTickets,
  getAdminCheckins,
  getAdminStaff,
  getAdminPayments,
  getAdminTicketPurchases,
  getAdminAuditLogs,
  getAdminFraudFlags,
  getAdminAccreditationRequests,
  getAdminUserDetail,
  getAdminEventDetail,
  updateUserRole,
  updateTicketStatus,
  downloadAdminExport,
  getAdminCommunityPosts,
  createAdminCommunityPost,
  updateAdminCommunityPost,
  deleteAdminCommunityPost,
  type CommunityPost,
  type AdminStats,
  type AdminUser,
  type AdminUserDetail,
  type AdminEvent,
  type AdminEventDetail,
  type RevenueRow,
  type RevenueTimelinePoint,
  type TimelinePoint,
  type DeliveryStats,
  type SupportTicket,
  type CheckInLog,
  type StaffAssignment,
  type PaymentRecord,
  type TicketPurchaseRecord,
  type AuditLogEntry,
  type FraudFlags,
  type AccreditationRequest,
} from "@/lib/api/admin";

function TabIcon({ id }: { id: string }) {
  const cls = "w-4 h-4";
  const icons: Record<string, React.ReactNode> = {
    overview: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    analytics: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    users: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>,
    events: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    payments: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    delivery: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    support: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9h2m0 0h2m-2 0v2" /></svg>,
    scans: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 8H3m15-4a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    staff: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    accreditation: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    audit: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    fraud: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>,
    community: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
    revenue: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    tickets: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>,
    export: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33A3 3 0 0116.5 19.5H6.75z" /></svg>,
  };
  return <>{icons[id] || <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>}</>;
}

function StatCard({ label, value, icon, color, bg }: { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "white", border: "1px solid #e8edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>{icon}</div>
      <div>
        <p className="text-3xl font-extrabold text-[#0D1B2A] leading-none" style={{ letterSpacing: "-0.02em" }}>{value}</p>
        <p className="text-xs text-gray-400 mt-1.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function MiniBar({ data, color, height = 40 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.slice(-30).map((d, i) => (
        <div key={i} title={`${d.label}: ${d.value}`} className="flex-1 rounded-t-sm transition-all hover:opacity-80" style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: d.value > 0 ? 4 : 0 }} />
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-[#0D1B2A]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type TabId = "overview" | "users" | "events" | "payments" | "delivery" | "support" | "scans" | "staff" | "analytics" | "audit" | "fraud" | "accreditation" | "community" | "revenue" | "tickets" | "export";

export default function AdminPage() {
  const { user, loading, logout, login } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [revenueTimeline, setRevenueTimeline] = useState<RevenueTimelinePoint[]>([]);
  const [usersTimeline, setUsersTimeline] = useState<TimelinePoint[]>([]);
  const [eventsTimeline, setEventsTimeline] = useState<TimelinePoint[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [checkins, setCheckins] = useState<CheckInLog[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlags | null>(null);
  const [accredRequests, setAccredRequests] = useState<AccreditationRequest[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [editingPost, setEditingPost] = useState<Partial<CommunityPost> | null>(null);
  const [postForm, setPostForm] = useState({ title: "", excerpt: "", content: "", tag: "", author: "", image: "" });
  const [postUploading, setPostUploading] = useState(false);
  const [postSaving, setPostSaving] = useState(false);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({ general: true, content: true, financial: true, operations: true, monitoring: true });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");
  const [statsLoading, setStatsLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; variant?: "danger" | "warning" | "default"; onConfirm: () => void } | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userActiveFilter, setUserActiveFilter] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("");
  const [eventVisibilityFilter, setEventVisibilityFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminEventDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [eventTotal, setEventTotal] = useState(0);
  const [ticketPurchases, setTicketPurchases] = useState<TicketPurchaseRecord[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [staffFormUser, setStaffFormUser] = useState("");
  const [staffFormEvent, setStaffFormEvent] = useState("");
  const [staffFormRole, setStaffFormRole] = useState("accreditation");
  const [staffFormLoading, setStaffFormLoading] = useState(false);
  const [staffFormError, setStaffFormError] = useState("");

  const loadUserPage = useCallback(async (page: number, search: string, roleFilter = "", activeFilter = "") => {
    const res = await getAdminUsers({
      page,
      per_page: 20,
      search: search || undefined,
      role: roleFilter || undefined,
      is_active: activeFilter === "true" ? true : activeFilter === "false" ? false : undefined,
    });
    setUsers(res.users);
    setUserTotal(res.total);
    setUserPage(res.page);
  }, []);

  const loadEventPage = useCallback(async (page: number, search: string, statusFilter = "", visibilityFilter = "") => {
    const res = await getAdminEvents({
      page,
      per_page: 20,
      search: search || undefined,
      status: statusFilter || undefined,
      is_public: visibilityFilter === "true" ? true : visibilityFilter === "false" ? false : undefined,
    });
    setEvents(res.events);
    setEventTotal(res.total);
    setEventPage(res.page);
  }, []);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      setStatsLoading(true);
      Promise.all([
        getAdminStats().then(setStats).catch(() => {}),
        getAdminUsers({ page: 1, per_page: 20 }).then((r) => { setUsers(r.users); setUserTotal(r.total); }).catch(() => {}),
        getAdminEvents({ page: 1, per_page: 20 }).then((r) => { setEvents(r.events); setEventTotal(r.total); }).catch(() => {}),
        getAdminRevenue().then(setRevenue).catch(() => {}),
      ]).finally(() => setStatsLoading(false));
    }
  }, [user]);

  const loadSection = async (section: TabId) => {
    setSectionLoading(true);
    try {
      if (section === "delivery") await getAdminDeliveryStats().then(setDeliveryStats).catch(() => {});
      if (section === "support") await getAdminTickets().then(setTickets).catch(() => {});
      if (section === "scans") await getAdminCheckins(1, 100).then((r) => setCheckins(r.checkins)).catch(() => {});
      if (section === "staff") await getAdminStaff().then(setStaffAssignments).catch(() => {});
      if (section === "payments") await getAdminPayments(1, 100).then((r) => setPayments(r.payments)).catch(() => {});
      if (section === "tickets") await getAdminTicketPurchases(1, 100).then((r) => { setTicketPurchases(r.ticket_purchases); setTicketTotal(r.total); setTicketPage(r.page); }).catch(() => {});
      if (section === "audit") await getAdminAuditLogs({ page: 1, per_page: 100 }).then((r) => setAuditLogs(r.logs)).catch(() => {});
      if (section === "fraud") await getAdminFraudFlags().then(setFraudFlags).catch(() => {});
      if (section === "accreditation") await getAdminAccreditationRequests().then(setAccredRequests).catch(() => {});
      if (section === "community") await getAdminCommunityPosts().then(setCommunityPosts).catch(() => {});
      if (section === "analytics") {
        await Promise.all([
          getAdminRevenueTimeline(30).then(setRevenueTimeline).catch(() => {}),
          getAdminUsersTimeline(30).then(setUsersTimeline).catch(() => {}),
          getAdminEventsTimeline(30).then(setEventsTimeline).catch(() => {}),
        ]);
      }
    } finally {
      setSectionLoading(false);
    }
  };

  const handleTabChange = (id: TabId) => {
    setTab(id);
    loadSection(id);
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: "#f8fafc" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <Image src="/logo-trim.png" alt="accredit.vip" width={4086} height={801} className="h-10 w-auto object-contain mx-auto" />
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#fce7f3" }}>
            <svg className="w-8 h-8" style={{ color: "#E91E8C" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1B2A" }}>Admin Access</h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>Sign in with your admin account below.</p>
          <form onSubmit={async (e) => { e.preventDefault(); setLoginError(""); setLoginLoading(true); try { await login(loginEmail, loginPassword); } catch (err) { setLoginError(err instanceof Error ? err.message : "Login failed"); } setLoginLoading(false); }} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full h-11 rounded-xl border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C]" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full h-11 rounded-xl border border-gray-300 pl-4 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C]" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <Button type="submit" disabled={loginLoading} className="w-full h-12 text-base font-bold">{loginLoading ? "Signing in..." : "Sign In"}</Button>
          </form>
          <p className="text-xs text-gray-400">Not an admin? <Link href="/login" className="text-[#E91E8C] hover:underline">Sign in as organizer</Link></p>
        </div>
      </div>
    );
  }

  if (user.role === "organizer") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: "#f8fafc" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <Image src="/logo-trim.png" alt="accredit.vip" width={4086} height={801} className="h-10 w-auto object-contain mx-auto" />
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#fef3c7" }}>
            <svg className="w-8 h-8" style={{ color: "#D97706" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1B2A" }}>Admin Access Required</h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>Your account does not have admin privileges. Contact support if you need access.</p>
          <Link href="/dashboard"><Button variant="outline" className="w-full h-12 text-base font-bold">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: statsLoading ? "—" : (stats?.users ?? 0), color: "#E91E8C", bg: "rgba(233,30,140,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { label: "Total Events", value: statsLoading ? "—" : (stats?.events ?? 0), color: "#0D1B2A", bg: "rgba(13,27,42,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { label: "Guests Managed", value: statsLoading ? "—" : (stats?.guests ?? 0), color: "#10b981", bg: "rgba(16,185,129,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
    { label: "Check-ins", value: statsLoading ? "—" : (stats?.checkins ?? 0), color: "#3b82f6", bg: "rgba(59,130,246,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: "Transactions", value: statsLoading ? "—" : (stats?.payments ?? 0), color: "#f59e0b", bg: "rgba(245,158,11,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
    { label: "Total Revenue", value: statsLoading ? "—" : (stats ? `₦${(stats.total_revenue / 1000).toFixed(1)}k` : "₦0"), color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: "Support Tickets", value: statsLoading ? "—" : (stats?.tickets ?? 0), color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9h2m0 0h2m-2 0v2" /></svg> },
    { label: "Accred. Requests", value: statsLoading ? "—" : (stats?.accreditation_requests ?? 0), color: "#06b6d4", bg: "rgba(6,182,212,0.08)", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
  ];

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    { id: "users", label: `Users (${userTotal})` },
    { id: "events", label: `Events (${eventTotal})` },
    { id: "revenue", label: "Revenue" },
    { id: "tickets", label: "Tickets" },
    { id: "payments", label: "Payments" },
    { id: "delivery", label: "Delivery" },
    { id: "support", label: "Support" },
    { id: "scans", label: "Scans" },
    { id: "staff", label: "Staff" },
    { id: "accreditation", label: "Accred." },
    { id: "audit", label: "Audit" },
    { id: "fraud", label: "Fraud" },
    { id: "community", label: "Community" },
    { id: "export", label: "Export" },
  ];

  type PanelGroup = { key: string; icon: React.ReactNode; label: string; items: TabId[] };
  const panelGroups: PanelGroup[] = [
    { key: "general", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>, label: "General", items: ["overview", "analytics", "users", "events"] },
    { key: "content", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>, label: "Content", items: ["community"] },
    { key: "financial", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: "Financial", items: ["revenue", "tickets", "payments"] },
    { key: "operations", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: "Operations", items: ["delivery", "support", "scans", "staff", "accreditation"] },
    { key: "monitoring", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, label: "Monitoring", items: ["audit", "fraud", "export"] },
  ];

  const handleRoleChange = async (userId: number, newRole: string) => {
    setRoleUpdating(userId);
    try { await updateUserRole(userId, newRole); setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))); } catch { /* ignore */ }
    setRoleUpdating(null);
  };

  const openUserDetail = async (userId: number) => {
    setUserDetailLoading(true);
    try { setSelectedUser(await getAdminUserDetail(userId)); } catch { /* ignore */ }
    setUserDetailLoading(false);
  };

  const openEventDetail = async (eventId: number) => {
    setEventDetailLoading(true);
    try { setSelectedEvent(await getAdminEventDetail(eventId)); } catch { /* ignore */ }
    setEventDetailLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f8f9fc" }}>
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-5 flex-shrink-0" style={{ background: "white", borderBottom: "1px solid #e8edf2" }}>
        <div className="flex items-center gap-2">
          <Link href="/"><Image src="/logo-trim.png" alt="accredit.vip" width={4086} height={801} className="h-8 w-auto object-contain" /></Link>
          <span className="ml-2 text-[11px] font-bold uppercase tracking-widest text-gray-300 hidden sm:block">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-[11px] font-semibold transition-colors">Main Site</Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:flex hidden items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3zM15 3v18" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#E91E8C] flex items-center justify-center text-white text-[11px] font-bold">{user.full_name?.charAt(0) || "A"}</div>
            <span className="text-gray-600 text-sm font-semibold hidden sm:block">{user.full_name}</span>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-700 text-xs font-medium transition-colors">Sign out</button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto py-6">
        {/* Stats row */}
        <div className="px-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map((s) => (<StatCard key={s.label} {...s} />))}
          </div>
        </div>

        {/* Tab bar + Content */}
        <div className="flex" style={{ minHeight: "calc(100vh - 140px)" }}>
          {/* Content area (first) */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile tabs */}
            <div className="lg:hidden flex overflow-x-auto px-3 py-2 gap-1 border-b border-[#e8edf2]" style={{ background: "white" }}>
              {tabs.map((t) => (
                <button key={t.id} onClick={() => handleTabChange(t.id)}
                  className="flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                  style={{ color: tab === t.id ? "#E91E8C" : "#94a3b8", background: tab === t.id ? "rgba(233,30,140,0.06)" : "transparent" }}
                >{t.label}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
            {sectionLoading && <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[#E91E8C] border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-xs text-gray-400 mt-2">Loading...</p></div>}

            {!sectionLoading && tab === "overview" && (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Recent Users</h2>
                  <div className="space-y-2">
                    {users.slice(0, 6).map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:shadow-sm transition-shadow" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }} onClick={() => openUserDetail(u.id)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>{u.full_name?.charAt(0) || "U"}</div>
                          <div><p className="text-sm font-semibold text-[#0D1B2A]">{u.full_name}</p><p className="text-xs text-gray-400">{u.email} · {u.role}</p></div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: u.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: u.is_active ? "#10b981" : "#ef4444" }}>{u.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No users yet.</p>}
                  </div>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Recent Events</h2>
                  <div className="space-y-2">
                    {events.slice(0, 6).map((e) => (
                      <div key={e.id} className="p-3 rounded-xl cursor-pointer hover:shadow-sm transition-shadow" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }} onClick={() => openEventDetail(e.id)}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-[#0D1B2A] truncate pr-2">{e.title}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: e.status === "active" || e.status === "published" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: e.status === "active" || e.status === "published" ? "#10b981" : "#f59e0b" }}>{e.status}</span>
                        </div>
                        <p className="text-xs text-gray-400">{e.organizer} · {e.event_type} · {e.is_public ? "Public" : "Private"}</p>
                      </div>
                    ))}
                    {events.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No events yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {!sectionLoading && tab === "analytics" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Revenue (Last 30 Days)</h2>
                  {revenueTimeline.length > 0 ? (
                    <div>
                      <MiniBar data={revenueTimeline.map((d) => ({ label: d.date, value: d.revenue }))} color="#E91E8C" height={60} />
                      <p className="text-xs text-gray-400 mt-2">₦{revenueTimeline.reduce((s, d) => s + d.revenue, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} total · {revenueTimeline.reduce((s, d) => s + d.transactions, 0)} transactions</p>
                    </div>
                  ) : <p className="text-sm text-gray-400 py-4 text-center">No revenue data yet.</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-base font-bold text-[#0D1B2A] mb-4">User Signups (Last 30 Days)</h2>
                    {usersTimeline.length > 0 ? (
                      <div>
                        <MiniBar data={usersTimeline.map((d) => ({ label: d.date, value: d.count }))} color="#E91E8C" height={50} />
                        <p className="text-xs text-gray-400 mt-2">{usersTimeline.reduce((s, d) => s + d.count, 0)} total signups</p>
                      </div>
                    ) : <p className="text-sm text-gray-400 py-4 text-center">No signup data yet.</p>}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Events Created (Last 30 Days)</h2>
                    {eventsTimeline.length > 0 ? (
                      <div>
                        <MiniBar data={eventsTimeline.map((d) => ({ label: d.date, value: d.count }))} color="#0D1B2A" height={50} />
                        <p className="text-xs text-gray-400 mt-2">{eventsTimeline.reduce((s, d) => s + d.count, 0)} total events</p>
                      </div>
                    ) : <p className="text-sm text-gray-400 py-4 text-center">No event data yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {!sectionLoading && tab === "users" && (
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h2 className="text-base font-bold text-[#0D1B2A]">All Users</h2>
                  <input type="text" placeholder="Search name or email..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); loadUserPage(1, e.target.value, userRoleFilter, userActiveFilter); }} className="h-9 rounded-lg border border-gray-300 px-3 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30" />
                  <select value={userRoleFilter} onChange={(e) => { setUserRoleFilter(e.target.value); loadUserPage(1, userSearch, e.target.value, userActiveFilter); }} className="h-9 rounded-lg border border-gray-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30">
                    <option value="">All Roles</option>
                    <option value="organizer">Organizer</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <select value={userActiveFilter} onChange={(e) => { setUserActiveFilter(e.target.value); loadUserPage(1, userSearch, userRoleFilter, e.target.value); }} className="h-9 rounded-lg border border-gray-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30">
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <button onClick={() => downloadAdminExport("users")} className="text-xs font-semibold text-[#E91E8C] hover:underline ml-auto">Export CSV</button>
                </div>
                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr></thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => openUserDetail(u.id)}>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>{u.full_name?.charAt(0) || "U"}</div>
                              <span className="font-semibold text-[#0D1B2A] hover:text-[#E91E8C] transition-colors">{u.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: u.role === "admin" || u.role === "super_admin" ? "rgba(233,30,140,0.08)" : "rgba(13,27,42,0.06)", color: u.role === "admin" || u.role === "super_admin" ? "#E91E8C" : "#0D1B2A" }}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: u.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: u.is_active ? "#10b981" : "#ef4444" }}>{u.is_active ? "Active" : "Inactive"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {["organizer", "admin", "support_agent", "staff"].map((role) => (
                                <button key={role} disabled={roleUpdating === u.id || u.role === role} onClick={() => handleRoleChange(u.id, role)}
                                  className="text-[10px] font-bold px-2 py-1 rounded-md transition-all"
                                  style={{ background: u.role === role ? "rgba(233,30,140,0.12)" : "#f1f5f9", color: u.role === role ? "#E91E8C" : "#94a3b8", opacity: roleUpdating === u.id ? 0.5 : 1 }}
                                >{role === "support_agent" ? "support" : role}</button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No users found.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-400">{userTotal} total users</p>
                  <div className="flex gap-2">
                    <button disabled={userPage <= 1} onClick={() => loadUserPage(userPage - 1, userSearch)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors">Previous</button>
                    <button disabled={userPage * 20 >= userTotal} onClick={() => loadUserPage(userPage + 1, userSearch)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors">Next</button>
                  </div>
                </div>
              </div>
            )}

            {!sectionLoading && tab === "events" && (
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h2 className="text-base font-bold text-[#0D1B2A]">All Events</h2>
                  <input type="text" placeholder="Search title..." value={eventSearch} onChange={(e) => { setEventSearch(e.target.value); loadEventPage(1, e.target.value, eventStatusFilter, eventVisibilityFilter); }} className="h-9 rounded-lg border border-gray-300 px-3 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30" />
                  <select value={eventStatusFilter} onChange={(e) => { setEventStatusFilter(e.target.value); loadEventPage(1, eventSearch, e.target.value, eventVisibilityFilter); }} className="h-9 rounded-lg border border-gray-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30">
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="active">Active</option>
                  </select>
                  <select value={eventVisibilityFilter} onChange={(e) => { setEventVisibilityFilter(e.target.value); loadEventPage(1, eventSearch, eventStatusFilter, e.target.value); }} className="h-9 rounded-lg border border-gray-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30">
                    <option value="">All Visibility</option>
                    <option value="true">Public</option>
                    <option value="false">Private</option>
                  </select>
                  <button onClick={() => downloadAdminExport("events")} className="text-xs font-semibold text-[#E91E8C] hover:underline ml-auto">Export CSV</button>
                </div>
                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Organizer</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Visibility</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    </tr></thead>
                    <tbody>
                      {events.map((e, i) => (
                        <tr key={e.id} className="cursor-pointer hover:bg-gray-50/50" style={{ borderBottom: i < events.length - 1 ? "1px solid #f1f5f9" : "none" }} onClick={() => openEventDetail(e.id)}>
                          <td className="px-4 py-3 font-semibold text-[#0D1B2A] hover:text-[#E91E8C] transition-colors">{e.title}</td>
                          <td className="px-4 py-3 text-gray-500">{e.organizer}</td>
                          <td className="px-4 py-3 text-gray-500 capitalize">{e.event_type}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: e.is_public ? "rgba(59,130,246,0.08)" : "rgba(13,27,42,0.06)", color: e.is_public ? "#3b82f6" : "#64748b" }}>{e.is_public ? "Public" : "Private"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: e.status === "active" || e.status === "published" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: e.status === "active" || e.status === "published" ? "#10b981" : "#f59e0b" }}>{e.status}</span>
                          </td>
                        </tr>
                      ))}
                      {events.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No events found.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-400">{eventTotal} total events</p>
                  <div className="flex gap-2">
                    <button disabled={eventPage <= 1} onClick={() => loadEventPage(eventPage - 1, eventSearch)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors">Previous</button>
                    <button disabled={eventPage * 20 >= eventTotal} onClick={() => loadEventPage(eventPage + 1, eventSearch)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors">Next</button>
                  </div>
                </div>
              </div>
            )}

            {!sectionLoading && tab === "payments" && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-[#0D1B2A]">All Payments</h2>
                  <button onClick={() => downloadAdminExport("payments")} className="text-xs font-semibold text-[#E91E8C] hover:underline ml-auto">Export CSV</button>
                </div>
                {payments.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                    <table className="w-full text-sm">
                      <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Organizer</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Provider</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      </tr></thead>
                      <tbody>
                        {payments.map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                            <td className="px-4 py-3 font-semibold text-[#0D1B2A]">{p.event_title}</td>
                            <td className="px-4 py-3 text-gray-500">{p.organizer_name}</td>
                            <td className="px-4 py-3 font-bold text-[#E91E8C]">₦{(p.amount / 1000).toFixed(1)}k</td>
                            <td className="px-4 py-3 text-gray-500 capitalize">{p.provider}</td>
                            <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: p.status === "paid" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: p.status === "paid" ? "#10b981" : "#f59e0b" }}>{p.status}</span></td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(233,30,140,0.08)" }}>
                      <svg className="w-8 h-8 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No payment records yet.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "revenue" && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-[#0D1B2A]">Revenue Breakdown</h2>
                  <button onClick={() => downloadAdminExport("payments")} className="text-xs font-semibold text-[#E91E8C] hover:underline ml-auto">Export CSV</button>
                </div>
                {revenue.length > 0 ? (
                  <div>
                    <div className="mb-6 grid grid-cols-3 gap-4">
                      <div className="rounded-xl p-4" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                        <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
                        <p className="text-2xl font-extrabold text-[#E91E8C]">₦{revenue.reduce((s, r) => s + r.total, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                        <p className="text-xs text-gray-400 mb-1">Transactions</p>
                        <p className="text-2xl font-extrabold text-[#0D1B2A]">{revenue.reduce((s, r) => s + r.count, 0)}</p>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                        <p className="text-xs text-gray-400 mb-1">Avg Transaction</p>
                        <p className="text-2xl font-extrabold text-[#0D1B2A]">₦{revenue.length > 0 ? (revenue.reduce((s, r) => s + r.total, 0) / revenue.reduce((s, r) => s + r.count, 0)).toFixed(0) : "0"}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                      <table className="w-full text-sm">
                        <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Provider</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Transactions</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                        </tr></thead>
                        <tbody>
                          {revenue.map((r, i) => (
                            <tr key={r.provider} style={{ borderBottom: i < revenue.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                              <td className="px-4 py-3 font-semibold text-[#0D1B2A] capitalize">{r.provider}</td>
                              <td className="px-4 py-3 text-gray-500">{r.count}</td>
                              <td className="px-4 py-3 font-bold text-[#E91E8C]">₦{r.total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(233,30,140,0.08)" }}>
                      <svg className="w-8 h-8 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No revenue data yet.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "tickets" && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-[#0D1B2A]">Ticket Purchases</h2>
                  <button onClick={() => downloadAdminExport("payments")} className="text-xs font-semibold text-[#E91E8C] hover:underline ml-auto">Export CSV</button>
                </div>
                {ticketPurchases.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                    <table className="w-full text-sm">
                      <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Buyer</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Qty</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Fee (5%)</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      </tr></thead>
                      <tbody>
                        {ticketPurchases.map((t, i) => (
                          <tr key={t.id} style={{ borderBottom: i < ticketPurchases.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.reference}</td>
                            <td className="px-4 py-3 font-semibold text-[#0D1B2A]">{t.event_title}</td>
                            <td className="px-4 py-3 text-gray-500">{t.buyer_name}</td>
                            <td className="px-4 py-3 text-gray-500">{t.quantity}</td>
                            <td className="px-4 py-3 font-bold text-[#E91E8C]">₦{(t.amount / 1000).toFixed(1)}k</td>
                            <td className="px-4 py-3 font-semibold text-[#E91E8C]">₦{(t.platform_fee / 1000).toFixed(1)}k</td>
                            <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: t.status === "paid" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: t.status === "paid" ? "#10b981" : "#f59e0b" }}>{t.status}</span></td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(233,30,140,0.08)" }}>
                      <svg className="w-8 h-8 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No ticket purchases yet.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "export" && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-[#0D1B2A] mb-6">Export Data</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={() => downloadAdminExport("users")} className="rounded-2xl p-6 text-center transition-all hover:shadow-lg" style={{ background: "white", border: "1px solid #e8edf2" }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(233,30,140,0.08)" }}>
                      <svg className="w-6 h-6 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <p className="font-bold text-[#0D1B2A] mb-1">Export Users</p>
                    <p className="text-xs text-gray-400">All user accounts</p>
                  </button>
                  <button onClick={() => downloadAdminExport("events")} className="rounded-2xl p-6 text-center transition-all hover:shadow-lg" style={{ background: "white", border: "1px solid #e8edf2" }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(13,27,42,0.08)" }}>
                      <svg className="w-6 h-6 text-[#0D1B2A]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <p className="font-bold text-[#0D1B2A] mb-1">Export Events</p>
                    <p className="text-xs text-gray-400">All events</p>
                  </button>
                  <button onClick={() => downloadAdminExport("payments")} className="rounded-2xl p-6 text-center transition-all hover:shadow-lg" style={{ background: "white", border: "1px solid #e8edf2" }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(139,92,246,0.08)" }}>
                      <svg className="w-6 h-6 text-[#8b5cf6]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="font-bold text-[#0D1B2A] mb-1">Export Payments</p>
                    <p className="text-xs text-gray-400">All payments</p>
                  </button>
                </div>
              </div>
            )}

            {!sectionLoading && tab === "delivery" && deliveryStats && (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Delivery Overview</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-4 text-center" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-2xl font-extrabold text-[#0D1B2A]">{deliveryStats.total_messages}</p><p className="text-xs text-gray-400 mt-1">Total Messages</p></div>
                    <div className="rounded-xl p-4 text-center" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-2xl font-extrabold text-[#10b981]">{deliveryStats.delivered}</p><p className="text-xs text-gray-400 mt-1">Delivered</p></div>
                    <div className="rounded-xl p-4 text-center" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-2xl font-extrabold text-[#f59e0b]">{deliveryStats.pending}</p><p className="text-xs text-gray-400 mt-1">Pending</p></div>
                    <div className="rounded-xl p-4 text-center" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-2xl font-extrabold text-[#ef4444]">{deliveryStats.failed}</p><p className="text-xs text-gray-400 mt-1">Failed</p></div>
                  </div>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">By Channel</h2>
                  <div className="space-y-3">
                    {Object.entries(deliveryStats.by_channel).length > 0 ? Object.entries(deliveryStats.by_channel).map(([channel, count]) => (
                      <div key={channel} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                        <span className="text-sm font-semibold text-[#0D1B2A] capitalize">{channel}</span>
                        <span className="text-sm font-bold text-[#E91E8C]">{count}</span>
                      </div>
                    )) : <p className="text-sm text-gray-400 text-center py-6">No delivery data yet.</p>}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-2">Delivery Batches</h2>
                  <p className="text-xs text-gray-400">{deliveryStats.total_batches} total batches sent across the platform</p>
                </div>
              </div>
            )}

            {!sectionLoading && tab === "support" && (
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Support Tickets</h2>
                {tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <div key={t.id} className="rounded-xl p-4" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-bold text-[#0D1B2A]">{t.subject}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: t.status === "open" ? "rgba(239,68,68,0.1)" : t.status === "resolved" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: t.status === "open" ? "#ef4444" : t.status === "resolved" ? "#10b981" : "#f59e0b" }}>{t.status}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.message}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">{t.user_name} · {t.user_email}</p>
                          <div className="flex gap-2">
                            <button onClick={() => updateTicketStatus(t.id, "in_progress").then(() => loadSection("support"))} className="text-[10px] font-bold px-3 py-1 rounded-md bg-[#f1f5f9] text-[#0D1B2A] hover:bg-gray-200 transition-colors">Take</button>
                            <button onClick={() => updateTicketStatus(t.id, "resolved").then(() => loadSection("support"))} className="text-[10px] font-bold px-3 py-1 rounded-md bg-[rgba(16,185,129,0.1)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)] transition-colors">Resolve</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(233,30,140,0.08)" }}>
                      <svg className="w-8 h-8 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9h2m0 0h2m-2 0v2" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No support tickets yet.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "scans" && (
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Check-in Logs</h2>
                {checkins.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                    <table className="w-full text-sm">
                      <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Guest</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Scanned By</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                      </tr></thead>
                      <tbody>
                        {checkins.map((c, i) => (
                          <tr key={c.id} style={{ borderBottom: i < checkins.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            <td className="px-4 py-3 font-semibold text-[#0D1B2A]">{c.guest_name}</td>
                            <td className="px-4 py-3 text-gray-500">{c.guest_email}</td>
                            <td className="px-4 py-3 text-gray-500">{c.event_title}</td>
                            <td className="px-4 py-3 text-gray-500">{c.scanned_by}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.checked_in_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(59,130,246,0.08)" }}>
                      <svg className="w-8 h-8 text-[#3b82f6]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No check-in records yet.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "staff" && (
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Staff Assignments</h2>

                <div className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ border: "1px solid #e8edf2", background: "#f8f9fc" }}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">User (email or name)</label>
                    <input
                      list="staff-users"
                      placeholder="Type to search..."
                      value={staffFormUser}
                      onChange={(e) => setStaffFormUser(e.target.value)}
                      className="flex h-9 rounded-lg border border-input bg-white px-3 py-2 text-sm min-w-[200px]"
                    />
                    <datalist id="staff-users">
                      {users.filter((u) => u.role === "staff").map((u) => (
                        <option key={u.id} value={`${u.full_name} (${u.email})`} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Event</label>
                    <input
                      list="staff-events"
                      placeholder="Type to search..."
                      value={staffFormEvent}
                      onChange={(e) => setStaffFormEvent(e.target.value)}
                      className="flex h-9 rounded-lg border border-input bg-white px-3 py-2 text-sm min-w-[200px]"
                    />
                    <datalist id="staff-events">
                      {events.map((e) => (
                        <option key={e.id} value={`${e.title} (ID: ${e.id})`} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
                    <select value={staffFormRole} onChange={(e) => setStaffFormRole(e.target.value)} className="flex h-9 rounded-lg border border-input bg-white px-3 py-2 text-sm">
                      <option value="accreditation">Accreditation</option>
                      <option value="scanning">Scanning</option>
                      <option value="check-in">Check-in</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      setStaffFormError("");
                      setStaffFormLoading(true);
                      try {
                        const { createStaffAssignment, getAdminStaff } = await import("@/lib/api/admin");
                        const userMatch = staffFormUser.match(/\(([^)]+)\)$/);
                        const eventMatch = staffFormEvent.match(/ID:\s*(\d+)\)$/);
                        if (!userMatch || !eventMatch) { setStaffFormError("Select a valid user and event from the suggestions."); return; }
                        const email = userMatch[1];
                        const userRes = await (await import("@/lib/api/admin")).getAdminUsers({ search: email });
                        const foundUser = userRes.users.find((u) => u.email === email);
                        if (!foundUser) { setStaffFormError("User not found."); return; }
                        await createStaffAssignment(foundUser.id, parseInt(eventMatch[1]), staffFormRole);
                        setStaffFormUser(""); setStaffFormEvent(""); setStaffFormRole("accreditation");
                        const updated = await getAdminStaff();
                        setStaffAssignments(updated);
                      } catch (err: any) {
                        setStaffFormError(err instanceof Error ? err.message : "Could not create assignment");
                      }
                      setStaffFormLoading(false);
                    }}
                    disabled={staffFormLoading}
                    className="h-9 rounded-lg px-4 text-sm font-semibold text-white" style={{ background: "#10b981" }}
                  >
                    {staffFormLoading ? "Adding..." : "Add Staff"}
                  </button>
                  {staffFormError && <p className="w-full text-xs text-red-500 mt-1">{staffFormError}</p>}
                </div>

                {staffAssignments.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                    <table className="w-full text-sm">
                      <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Staff</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider"></th>
                      </tr></thead>
                      <tbody>
                        {staffAssignments.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: i < staffAssignments.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            <td className="px-4 py-3 font-semibold text-[#0D1B2A]">{s.staff_name}</td>
                            <td className="px-4 py-3 text-gray-500">{s.staff_email}</td>
                            <td className="px-4 py-3 text-gray-500">{s.event_title}</td>
                            <td className="px-4 py-3 capitalize text-gray-500">{s.role}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.assigned_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setConfirmDialog({
                                    title: "Remove staff assignment",
                                    message: "Are you sure you want to remove this staff assignment? This action cannot be undone.",
                                    variant: "danger",
                                    onConfirm: async () => {
                                      const { deleteStaffAssignment, getAdminStaff } = await import("@/lib/api/admin");
                                      await deleteStaffAssignment(s.id);
                                      const updated = await getAdminStaff();
                                      setStaffAssignments(updated);
                                    },
                                  });
                                }}
                                className="text-xs font-semibold text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(16,185,129,0.08)" }}>
                      <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No staff assignments yet.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "accreditation" && (
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Accreditation Requests</h2>
                {accredRequests.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e8edf2" }}>
                    <table className="w-full text-sm">
                      <thead><tr style={{ background: "#f8f9fc", borderBottom: "1px solid #e8edf2" }}>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Organizer</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Staff</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Scanner</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      </tr></thead>
                      <tbody>
                        {accredRequests.map((r, i) => (
                          <tr key={r.id} style={{ borderBottom: i < accredRequests.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            <td className="px-4 py-3 font-semibold text-[#0D1B2A]">{r.event_title}</td>
                            <td className="px-4 py-3 text-gray-500">{r.organizer_name}</td>
                            <td className="px-4 py-3 text-gray-500">{r.staff_count}</td>
                            <td className="px-4 py-3">{r.scanner_rental ? <span className="text-xs font-bold text-[#10b981]">Yes</span> : <span className="text-xs text-gray-400">No</span>}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                                background: r.status === "pending" ? "rgba(245,158,11,0.1)" : r.status === "approved" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                color: r.status === "pending" ? "#f59e0b" : r.status === "approved" ? "#10b981" : "#ef4444",
                              }}>{r.status}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(6,182,212,0.08)" }}>
                      <svg className="w-8 h-8 text-[#06b6d4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No accreditation requests yet.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "audit" && (
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Activity Log</h2>
                {auditLogs.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl text-xs" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                        <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: log.action === "role_change" ? "#E91E8C" : log.action === "login" ? "#10b981" : "#3b82f6" }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0D1B2A] capitalize">{log.action.replace("_", " ")} <span className="text-gray-400 font-normal">on {log.resource}{log.resource_id ? ` #${log.resource_id}` : ""}</span></p>
                          {log.details && <p className="text-gray-500 mt-0.5">{log.details}</p>}
                          <p className="text-gray-400 mt-0.5">User #{log.user_id} · {log.ip_address || "N/A"} · {new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#f8f9fc", border: "2px dashed #e8edf2" }}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: "rgba(99,102,241,0.08)" }}>
                      <svg className="w-8 h-8 text-[#6366f1]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">No audit logs yet. Logs will appear as actions are taken on the platform.</p>
                  </div>
                )}
              </div>
            )}

            {!sectionLoading && tab === "fraud" && fraudFlags && (
              <div className="space-y-6">
                <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Fraud Monitoring</h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="rounded-xl p-5 text-center" style={{ background: fraudFlags.inactive_users > 10 ? "rgba(239,68,68,0.06)" : "#f8f9fc", border: `1px solid ${fraudFlags.inactive_users > 10 ? "#ef4444" : "#e8edf2"}` }}>
                    <p className="text-3xl font-extrabold" style={{ color: fraudFlags.inactive_users > 10 ? "#ef4444" : "#0D1B2A" }}>{fraudFlags.inactive_users}</p>
                    <p className="text-xs text-gray-400 mt-1">Inactive Users</p>
                  </div>
                  <div className="rounded-xl p-5 text-center" style={{ background: fraudFlags.unverified_users > 10 ? "rgba(245,158,11,0.06)" : "#f8f9fc", border: `1px solid ${fraudFlags.unverified_users > 10 ? "#f59e0b" : "#e8edf2"}` }}>
                    <p className="text-3xl font-extrabold" style={{ color: fraudFlags.unverified_users > 10 ? "#f59e0b" : "#0D1B2A" }}>{fraudFlags.unverified_users}</p>
                    <p className="text-xs text-gray-400 mt-1">Unverified Users</p>
                  </div>
                  <div className="rounded-xl p-5 text-center" style={{ background: fraudFlags.failed_payments > 5 ? "rgba(239,68,68,0.06)" : "#f8f9fc", border: `1px solid ${fraudFlags.failed_payments > 5 ? "#ef4444" : "#e8edf2"}` }}>
                    <p className="text-3xl font-extrabold" style={{ color: fraudFlags.failed_payments > 5 ? "#ef4444" : "#0D1B2A" }}>{fraudFlags.failed_payments}</p>
                    <p className="text-xs text-gray-400 mt-1">Failed Payments</p>
                  </div>
                  <div className="rounded-xl p-5 text-center" style={{ background: fraudFlags.failed_deliveries > 10 ? "rgba(239,68,68,0.06)" : "#f8f9fc", border: `1px solid ${fraudFlags.failed_deliveries > 10 ? "#ef4444" : "#e8edf2"}` }}>
                    <p className="text-3xl font-extrabold" style={{ color: fraudFlags.failed_deliveries > 10 ? "#ef4444" : "#0D1B2A" }}>{fraudFlags.failed_deliveries}</p>
                    <p className="text-xs text-gray-400 mt-1">Failed Deliveries</p>
                  </div>
                </div>
                {(fraudFlags.inactive_users + fraudFlags.unverified_users + fraudFlags.failed_payments + fraudFlags.failed_deliveries) === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No flags detected — platform health looks good.</p>
                )}
              </div>
            )}

            {!sectionLoading && tab === "community" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#0D1B2A]">Community Posts</h2>
                  <button
                    onClick={() => { setEditingPost({ id: 0 } as any); setPostForm({ title: "", excerpt: "", content: "", tag: "", author: "", image: "" }); }}
                    className="rounded-xl bg-[#E91E8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#C4166F] transition-colors"
                  >
                    + New Post
                  </button>
                </div>

                {editingPost && (
                  <div className="rounded-xl p-4 space-y-3" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                    <input
                      placeholder="Title *" value={postForm.title}
                      onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e2ec] text-sm outline-none focus:border-[#E91E8C]"
                    />
                    <input
                      placeholder="Tag (e.g. Event Spotlight)"
                      value={postForm.tag}
                      onChange={(e) => setPostForm({ ...postForm, tag: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e2ec] text-sm outline-none focus:border-[#E91E8C]"
                    />
                    <textarea
                      placeholder="Excerpt / short description"
                      value={postForm.excerpt} rows={2}
                      onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e2ec] text-sm outline-none focus:border-[#E91E8C] resize-none"
                    />
                    <textarea
                      placeholder="Full content (optional)"
                      value={postForm.content} rows={4}
                      onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e2ec] text-sm outline-none focus:border-[#E91E8C] resize-none"
                    />
                    <input
                      placeholder="Author name"
                      value={postForm.author}
                      onChange={(e) => setPostForm({ ...postForm, author: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e2ec] text-sm outline-none focus:border-[#E91E8C]"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors" style={{ background: "#3b82f6" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {postUploading ? "Uploading..." : "Upload Image/Video"}
                        <input type="file" accept="image/*,video/*" className="hidden" disabled={postUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            setPostUploading(true);
                            const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
                            const token = localStorage.getItem("token");
                            const fd = new FormData(); fd.append("file", file);
                            try {
                              const res = await fetch(`${base.replace("/api/v1", "")}/api/v1/upload-community`, {
                                method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
                              });
                              if (res.ok) { const data = await res.json(); setPostForm({ ...postForm, image: data.url }); }
                            } catch { /* ignore */ }
                            setPostUploading(false);
                          }}
                        />
                      </label>
                      {postForm.image && (
                        <button onClick={() => setPostForm({ ...postForm, image: "" })} className="text-xs font-semibold text-[#ef4444] hover:underline">Remove</button>
                      )}
                    </div>
                    {postForm.image && (
                      <div className="rounded-lg overflow-hidden max-w-xs">
                        {postForm.image.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                          <video src={postForm.image.startsWith("http") ? postForm.image : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000"}${postForm.image}`} controls className="w-full h-40 object-cover rounded-lg" />
                        ) : (
                          <img src={postForm.image.startsWith("http") ? postForm.image : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000"}${postForm.image}`} alt="" className="w-full h-40 object-cover rounded-lg" />
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        disabled={!postForm.title || postSaving}
                        onClick={async () => {
                          setPostSaving(true);
                          try {
                            if (editingPost.id) {
                              await updateAdminCommunityPost(editingPost.id, postForm);
                            } else {
                              await createAdminCommunityPost(postForm);
                            }
                            setEditingPost(null);
                            await getAdminCommunityPosts().then(setCommunityPosts);
                          } catch { /* ignore */ }
                          setPostSaving(false);
                        }}
                        className="rounded-xl bg-[#E91E8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#C4166F] transition-colors disabled:opacity-50"
                      >
                        {postSaving ? "Saving..." : editingPost.id ? "Update" : "Create"}
                      </button>
                      <button onClick={() => setEditingPost(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                {communityPosts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No community posts yet.</p>
                ) : (
                  <div className="space-y-3">
                    {communityPosts.map((post) => (
                      <div key={post.id} className="rounded-xl p-4 flex items-start justify-between" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E91E8C]">{post.tag || "Community"}</span>
                            {!post.is_published && <span className="text-[10px] font-bold text-[#f59e0b]">(Draft)</span>}
                          </div>
                          <h3 className="text-sm font-bold text-[#0D1B2A] truncate">{post.title}</h3>
                          {post.excerpt && <p className="text-xs text-gray-400 mt-0.5 truncate">{post.excerpt}</p>}
                          <p className="text-[10px] text-gray-300 mt-1">{post.author ? `By ${post.author} · ` : ""}{post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-3">
                          <button
                            onClick={() => { setEditingPost(post); setPostForm({ title: post.title, excerpt: post.excerpt || "", content: post.content || "", tag: post.tag || "", author: post.author || "", image: post.image || "" }); }}
                            className="text-xs font-semibold text-[#3b82f6] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                title: "Delete post",
                                message: `Delete "${post.title}"? This cannot be undone.`,
                                variant: "danger",
                                onConfirm: async () => {
                                  try {
                                    await deleteAdminCommunityPost(post.id);
                                    await getAdminCommunityPosts().then(setCommunityPosts);
                                  } catch { /* ignore */ }
                                },
                              });
                            }}
                            className="text-xs font-semibold text-[#ef4444] hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Sidebar (desktop, on the right) */}
          <aside className={`${sidebarOpen ? 'w-56' : 'w-0'} flex-shrink-0 hidden lg:flex flex-col overflow-hidden transition-all duration-200`} style={{ background: "#f8f9fc", borderLeft: sidebarOpen ? "1px solid #e8edf2" : "1px solid transparent" }}>
            <div className={`${sidebarOpen ? '' : 'invisible'} px-3 py-3 border-b border-[#e8edf2]`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Sections</p>
            </div>
            <nav className={`${sidebarOpen ? '' : 'invisible'} flex-1 overflow-y-auto py-2 px-2 space-y-1`}>
              {panelGroups.map((group) => {
                const isOpen = openPanels[group.key];
                const hasActive = group.items.includes(tab);
                return (
                  <div key={group.key} className="rounded-lg" style={{ background: hasActive ? "rgba(233,30,140,0.04)" : "transparent" }}>
                    <button
                      onClick={() => setOpenPanels((prev: Record<string, boolean>) => ({ ...prev, [group.key]: !prev[group.key] }))}
                      className="flex items-center gap-2 w-full text-left px-2.5 py-2 text-xs font-bold rounded-lg transition-colors"
                      style={{ color: hasActive ? "#E91E8C" : "#64748b" }}
                    >
                      <span className="flex-shrink-0 opacity-60">{group.icon}</span>
                      <span className="flex-1 truncate">{group.label}</span>
                      <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    {isOpen && (
                      <div className="ml-1 mt-0.5 space-y-0.5">
                        {group.items.map((itemId) => {
                          const t = tabs.find((x) => x.id === itemId)!;
                          return (
                            <button key={itemId} onClick={() => handleTabChange(itemId)}
                              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
                              style={{
                                color: tab === itemId ? "#E91E8C" : "#64748b",
                                background: tab === itemId ? "rgba(233,30,140,0.07)" : "transparent",
                              }}
                            >
                              <span className="flex-shrink-0 w-4 flex justify-center"><TabIcon id={itemId} /></span>
                              <span className="truncate">{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      </main>

      {/* User Detail Modal */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Detail">
        {userDetailLoading ? (
          <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[#E91E8C] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : selectedUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>{selectedUser.full_name?.charAt(0) || "U"}</div>
              <div><p className="text-base font-bold text-[#0D1B2A]">{selectedUser.full_name}</p><p className="text-xs text-gray-400">{selectedUser.email}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Phone</p><p className="font-semibold text-[#0D1B2A]">{selectedUser.phone || "—"}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Role</p><p className="font-semibold text-[#0D1B2A]">{selectedUser.role}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Status</p><p className={`font-semibold ${selectedUser.is_active ? "text-[#10b981]" : "text-[#ef4444]"}`}>{selectedUser.is_active ? "Active" : "Inactive"}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Verified</p><p className={`font-semibold ${selectedUser.is_verified ? "text-[#10b981]" : "text-[#f59e0b]"}`}>{selectedUser.is_verified ? "Yes" : "No"}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Events</p><p className="font-semibold text-[#0D1B2A]">{selectedUser.event_count}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Payments</p><p className="font-semibold text-[#0D1B2A]">{selectedUser.payment_count}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Support Tickets</p><p className="font-semibold text-[#0D1B2A]">{selectedUser.ticket_count}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Joined</p><p className="font-semibold text-[#0D1B2A]">{new Date(selectedUser.created_at).toLocaleDateString()}</p></div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Event Detail Modal */}
      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Detail">
        {eventDetailLoading ? (
          <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[#E91E8C] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : selectedEvent ? (
          <div className="space-y-4">
            {selectedEvent.cover_image && (
              <Image src={selectedEvent.cover_image.startsWith("http") ? selectedEvent.cover_image : `/uploads/${selectedEvent.cover_image}`} alt="" width={400} height={200} className="w-full h-40 object-cover rounded-xl" />
            )}
            <div>
              <p className="text-lg font-bold text-[#0D1B2A]">{selectedEvent.title}</p>
              <p className="text-xs text-gray-400">{selectedEvent.event_type} · {selectedEvent.status} · {selectedEvent.is_public ? "Public" : "Private"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Organizer</p><p className="font-semibold text-[#0D1B2A]">{selectedEvent.organizer}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Host</p><p className="font-semibold text-[#0D1B2A]">{selectedEvent.host_name}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Date</p><p className="font-semibold text-[#0D1B2A]">{selectedEvent.event_date} · {selectedEvent.event_time} {selectedEvent.timezone}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Venue</p><p className="font-semibold text-[#0D1B2A]">{selectedEvent.venue || "—"}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Guests</p><p className="font-semibold text-[#0D1B2A]">{selectedEvent.guest_count}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Check-ins</p><p className="font-semibold text-[#0D1B2A]">{selectedEvent.checkin_count}</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Revenue</p><p className="font-bold text-[#E91E8C]">₦{(selectedEvent.revenue / 1000).toFixed(1)}k</p></div>
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}><p className="text-xs text-gray-400">Category</p><p className="font-semibold text-[#0D1B2A]">{selectedEvent.category || "—"}</p></div>
            </div>
            {selectedEvent.description && (
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-[#0D1B2A]">{selectedEvent.description}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        variant={confirmDialog?.variant ?? "danger"}
        confirmLabel="Yes, proceed"
        onConfirm={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}