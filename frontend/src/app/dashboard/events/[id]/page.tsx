"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getEvent, deleteEvent, type EventData } from "@/lib/api/events";
import { apiClient } from "@/lib/api-client";
import { initiatePayment, calculatePrice } from "@/lib/api/payments";
import { EventDetailSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertTriangle, Check, CircleX, Hourglass, BarChart3, Users, Mail, Settings, Plus, Upload, Send, Edit2, Trash2, Eye, XCircle, Clock, Zap, Eye as EyeIcon, Share2, Wallet, DollarSign, TicketIcon } from "lucide-react";

type Guest = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  rsvp_status: string;
  rsvp_note?: string | null;
  invite_sent: boolean;
  invite_attempts?: number;
  invite_viewed_at?: string | null;
};

type SendResult = {
  batch_id: number;
  channel: string;
  sent: number;
  total: number;
};

type RSVPStats = {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
};

function guestLimitFromRange(value?: string | null) {
  const numbers = value?.match(/\d+/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : null;
}

function isValidPhone(value?: string | null) {
  if (!value) return false;
  const compact = value.replace(/[\s().-]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(compact);
}

function EventDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [generatingQR, setGeneratingQR] = useState<number | null>(null);
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [channel, setChannel] = useState("email");
  const [logs, setLogs] = useState<any[]>([]);
  const [rsvpStats, setRsvpStats] = useState<RSVPStats | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingGuest, setEditingGuest] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [coverUploading, setCoverUploading] = useState(false);
  const [flierUploading, setFlierUploading] = useState(false);
  const [fliers, setFliers] = useState<any[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const flierInputRef = useRef<HTMLInputElement>(null);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestRsvpFilter, setGuestRsvpFilter] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalGuests, setTotalGuests] = useState(0);
  const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("all");
  const [publishChannel, setPublishChannel] = useState("email");
  const [publishing, setPublishing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; variant?: "danger" | "warning" | "default"; onConfirm: () => void } | null>(null);
  const [publishError, setPublishError] = useState("");
  const [checkinStats, setCheckinStats] = useState<{ checked_in: number; rsvp_accepted: number; total_guests: number; recent_checkins: any[] } | null>(null);
  const [accreditationLog, setAccreditationLog] = useState<{ attempts: any[]; suspicious_count: number } | null>(null);
  const [showAccreditationLog, setShowAccreditationLog] = useState(false);

  const loadGuests = useCallback(async (search?: string, rsvpStatus?: string, page?: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (rsvpStatus) params.set("rsvp_status", rsvpStatus);
      params.set("offset", String((page ?? currentPage) * 10));
      params.set("limit", "10");
      const qs = params.toString();
      const res = await apiClient<{ guests: Guest[]; total: number; offset: number; limit: number }>(`/events/${id}/guests${qs ? `?${qs}` : ""}`);
      setGuests(res.guests);
      setTotalGuests(res.total);
    } catch {}
  }, [id, currentPage]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user && id) {
      setLoadError(false);
      getEvent(Number(id)).then(setEvent).catch(() => setLoadError(true));
      loadGuests();
      loadRsvpStats();
      loadPurchases();
      loadFliers();
      loadCheckinStats();
      loadAccreditationLog();
      apiClient<any>("/wallet").then((d) => setWalletBalance(d.balances?.NGN ?? d.balance)).catch(() => {});
    }
  }, [user, loading, id, loadGuests]);

  useEffect(() => {
    const ref = searchParams.get("trxref") || searchParams.get("reference");
    if (ref && id) {
      getEvent(Number(id)).then(setEvent).catch(() => {});
    }
  }, [searchParams, id]);

  const handlePublish = async () => {
    setPublishError("");
    setPublishing(true);
    try {
      const res = await initiatePayment(Number(id), publishChannel);
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      } else {
        getEvent(Number(id)).then(setEvent);
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Payment initiation failed");
    }
    setPublishing(false);
  };

  const handleGuestSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    loadGuests(guestSearch || undefined, guestRsvpFilter || undefined, 0);
  };

  const resetGuestFilter = () => {
    setGuestSearch("");
    setGuestRsvpFilter("");
    setCurrentPage(0);
    loadGuests(undefined, undefined, 0);
  };

  const loadLogs = async () => {
    try {
      const l = await apiClient<any[]>(`/events/${id}/delivery-logs`);
      setLogs(l);
    } catch {}
  };

  const loadRsvpStats = async () => {
    try {
      const s = await apiClient<RSVPStats>(`/events/${id}/rsvp-stats`);
      setRsvpStats(s);
    } catch {}
  };

  const loadCheckinStats = async () => {
    try {
      const s = await apiClient<any>(`/qr/events/${id}/checkin-stats`);
      setCheckinStats(s);
    } catch {}
  };

  const loadAccreditationLog = async () => {
    try {
      const l = await apiClient<any>(`/qr/events/${id}/accreditation-log`);
      setAccreditationLog(l);
    } catch {}
  };

  const loadPurchases = async () => {
    try {
      const p = await apiClient<any[]>(`/tickets/events/${id}/purchases`);
      setPurchases(p);
    } catch {}
  };

  const loadFliers = async () => {
    try {
      const f = await apiClient<any[]>(`/events/${id}/fliers`);
      setFliers(f);
    } catch {}
  };

  const uploadCover = async (file: File) => {
    setCoverUploading(true);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/events/${id}/upload-cover`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (event) setEvent({ ...event, cover_image: data.url });
      getEvent(Number(id)).then(setEvent);
    } catch {}
    setCoverUploading(false);
  };

  const uploadFlier = async (file: File) => {
    setFlierUploading(true);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/events/${id}/upload-flier`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      loadFliers();
    } catch {}
    setFlierUploading(false);
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guestLimit !== null && totalGuests >= guestLimit) {
      setCsvResult(`Guest limit reached. This event allows up to ${guestLimit} guests.`);
      return;
    }
    try {
      await apiClient(`/events/${id}/guests`, {
        method: "POST",
        body: { name: guestName, phone: guestPhone || null, email: guestEmail || null },
      });
      setGuestName(""); setGuestPhone(""); setGuestEmail("");
      loadGuests();
      loadRsvpStats();
      loadCheckinStats();
    } catch (err) {
      setCsvResult(err instanceof Error ? err.message : "Could not add guest.");
    }
  };

  const uploadCsv = async () => {
    if (!csvFile) return;
    setCsvUploading(true); setCsvResult(null);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/events/${id}/guests/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Upload failed";
        throw new Error(detail);
      }
      setCsvResult(`Imported ${data.imported} guests`);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadGuests(); loadRsvpStats();
    } catch (err) {
      setCsvResult(err instanceof Error ? err.message : "Upload failed. Check CSV format (name, phone, email columns).");
    }
    setCsvUploading(false);
  };

  const generateQR = async (guestId: number) => {
    setGeneratingQR(guestId);
    try {
      const qr = await apiClient<{ token: string }>(`/events/${id}/guests/${guestId}/qr`, { method: "POST" });
      setQrMap((prev) => ({ ...prev, [guestId]: qr.token }));
    } catch {}
    setGeneratingQR(null);
  };

  const sendInvites = async (force: boolean = false) => {
    setSending(true); setSendResult(null); setSendError(null);
    try {
      // For resend all, use the legacy endpoint (handles payment logic)
      if (force) {
        const res = await apiClient<any>(`/events/${id}/send-invites?force=true`, { method: "POST", body: { channel } });
        setSendResult(res);
        loadLogs();
        loadGuests();
        if (res.skipped_max_attempts > 0) {
          setSendError(`${res.skipped_max_attempts} guest(s) skipped (max 3 invite attempts reached).`);
        }
        setSending(false);
        return;
      }
      // Normal send: fetch up to 5 unsent guests and send via batch
      const gParams = new URLSearchParams();
      gParams.set("invite_status", "not_sent");
      gParams.set("limit", "5");
      gParams.set("offset", "0");
      const gRes = await apiClient<{ guests: Guest[]; total: number }>(`/events/${id}/guests?${gParams.toString()}`);
      const unsentGuests = gRes.guests;
      if (unsentGuests.length === 0) {
        setSendError("All guests have already been invited.");
        setSending(false);
        return;
      }
      const guestIds = unsentGuests.map((g) => g.id);
      const batchRes = await apiClient<any>(`/events/${id}/send-invites-batch`, {
        method: "POST",
        body: { channel, guest_ids: guestIds },
      });
      setSendResult(batchRes);
      loadLogs();
      loadGuests();
      const remaining = gRes.total - guestIds.length;
      if (remaining > 0) {
        setSendError(`${remaining} more guest(s) remaining. Click Send again to continue.`);
      }
    } catch (err: any) {
      const detail = err.detail || err.message;
      if (detail?.payment_required) {
        setConfirmDialog({
          title: "Payment required to re-send",
          message: `Pay ₦${detail.total_cost?.toLocaleString() ?? "0"} to re-send invites to ${detail.unpaid_guest_ids?.length ?? 0} guest(s)?`,
          variant: "default",
          onConfirm: () => setSendError("Complete payment for each guest to re-send. Use the per-guest Invite button."),
        });
        setSendError("Payment required to re-send invites.");
      } else {
        setSendError(typeof detail === "string" ? detail : "Could not send invites.");
      }
    }
    setSending(false);
  };

  const sendGuestInvite = async (guestId: number) => {
    setSendError(null);
    setSendResult(null);
    try {
      const res = await apiClient<any>(`/events/${id}/guests/${guestId}/send-invite?force=true`, { method: "POST", body: { channel } });
      if (res.status === "max_attempts") {
        setSendError(res.message || "Maximum invite attempts reached.");
      }
      loadGuests();
    } catch (err: any) {
      const detail = err.detail || err.message;
      if (detail?.payment_required) {
        setSendError(`${detail.message} ₦${detail.amount?.toLocaleString() ?? "0"}`);
        setConfirmDialog({
          title: "Payment required",
          message: `Pay ₦${detail.amount?.toLocaleString() ?? "0"} to re-send this invite?`,
          variant: "default",
          onConfirm: async () => {
            try {
              const { checkResendPayment, initiateResendPayment } = await import("@/lib/api/payments");
              const check = await checkResendPayment(Number(id), guestId);
              if (check.has_valid_payment) {
                setSendError(null);
                await apiClient(`/events/${id}/guests/${guestId}/send-invite?force=true`, { method: "POST", body: { channel } });
                loadGuests();
              } else {
                const res = await initiateResendPayment(Number(id), guestId);
                if (res.authorization_url) {
                  window.location.href = res.authorization_url;
                } else {
                  setSendError("Payment initiated. Refresh after completing payment.");
                }
              }
            } catch {}
          },
        });
      } else {
        setSendError(typeof detail === "string" ? detail : "Could not send invite.");
      }
    }
  };

  const sendGuestQr = async (guestId: number) => {
    try {
      await apiClient(`/events/${id}/guests/${guestId}/send-qr`, { method: "POST", body: { channel } });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send QR.");
    }
  };

  const sendAllQrs = async () => {
    setSending(true); setSendResult(null); setSendError(null);
    try {
      const res = await apiClient<any>(`/events/${id}/send-qrs`, { method: "POST", body: { channel } });
      setSendResult(res);
      loadLogs();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send QR codes.");
    }
    setSending(false);
  };

  const testSend = async () => {
    try {
      await apiClient("/events/test-send", {
        method: "POST",
        body: {
          channel,
          email: channel === "email" ? (user?.email || "") : undefined,
          phone: channel !== "email" ? (user?.phone || "") : undefined,
        },
      });
    } catch {}
  };

  const toggleSelect = (guestId: number) => {
    setSelectedGuestIds((prev) =>
      prev.includes(guestId) ? prev.filter((id) => id !== guestId) : prev.length < 5 ? [...prev, guestId] : prev
    );
  };

  const toggleSelectAll = () => {
    if (selectedGuestIds.length === guests.length) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(guests.map((g) => g.id).slice(0, 5));
    }
  };

  const sendToSelected = async () => {
    if (selectedGuestIds.length === 0) return;
    setSending(true); setSendError(null); setSendResult(null);
    try {
      const res = await apiClient<any>(`/events/${id}/send-invites-batch`, {
        method: "POST",
        body: { channel, guest_ids: selectedGuestIds },
      });
      setSendResult(res);
      setSelectedGuestIds([]);
      loadGuests(guestSearch || undefined, guestRsvpFilter || undefined, currentPage);
      loadLogs();
    } catch (err: any) {
      const detail = err.detail || err.message;
      if (detail?.payment_required) {
        setSendError("Some guests require payment to re-send.");
      } else {
        setSendError(typeof detail === "string" ? detail : "Could not send invites.");
      }
    }
    setSending(false);
  };

  const exportGuests = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${baseUrl}/events/${id}/export-guests?status=${exportStatus}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guests-event-${id}-${exportStatus}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  const pageCount = Math.ceil(totalGuests / 10);
  const goToPage = (page: number) => {
    if (page < 0 || page >= pageCount) return;
    setCurrentPage(page);
    setSelectedGuestIds([]);
    loadGuests(guestSearch || undefined, guestRsvpFilter || undefined, page);
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      await deleteEvent(Number(id));
      router.push("/dashboard");
    } catch {}
    setDeleting(false);
  };

  const startEdit = (guest: Guest) => {
    setEditingGuest(guest.id);
    setEditName(guest.name);
    setEditPhone(guest.phone || "");
    setEditEmail(guest.email || "");
  };

  const saveEdit = async (guestId: number) => {
    try {
      await apiClient(`/events/${id}/guests/${guestId}`, {
        method: "PUT",
        body: { name: editName, phone: editPhone || null, email: editEmail || null },
      });
      setEditingGuest(null); loadGuests();
    } catch {}
  };

  const handleDeleteGuest = async (guestId: number) => {
    try {
      await apiClient(`/events/${id}/guests/${guestId}`, { method: "DELETE" });
      setDeleteConfirm(null); loadGuests(); loadRsvpStats();
    } catch {}
  };

  if (loading || !user) return null;
  if (loadError) return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Could not load event</h2>
        <p className="text-sm text-muted-foreground">The event may have been deleted or a network error occurred.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent">Go to Dashboard</button>
        </div>
      </div>
    </div>
  );
  if (!event) return <EventDetailSkeleton />;

  const guestLimit = guestLimitFromRange(event.guest_count_range);
  const remainingGuests = guestLimit === null ? null : Math.max(guestLimit - totalGuests, 0);
  const phoneChannelSelected = channel === "whatsapp" || channel === "sms";
  const invalidPhoneGuests = phoneChannelSelected ? guests.filter((guest) => !isValidPhone(guest.phone)) : [];
  const guestsWithoutSelectedContact = guests.filter((guest) =>
    channel === "email" ? !guest.email : !guest.phone
  );
  const canSendInvites = totalGuests > 0 && invalidPhoneGuests.length === 0;
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "guests", label: "Guests", icon: Users, badge: totalGuests },
    { id: "invites", label: "Send Invites", icon: Mail },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fc]">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Accredit<span className="text-primary">.vip</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
            <span className="text-sm text-muted-foreground">{user.full_name}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground mb-6 inline-block hover:text-foreground">
          &larr; Back to Dashboard
        </Link>

        {/* Event Header Card */}
        <div className="rounded-xl border bg-white p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#0D1B2A]">{event.title}</h1>
              <p className="text-muted-foreground mt-2">
                📍 {event.venue} • 📅 {event.event_date} • 🕐 {event.event_time}
              </p>
              {event.slug && (
                <p className="mt-3">
                  <a href={`/e/${event.slug}`} target="_blank" className="text-sm text-[#E91E8C] font-semibold hover:underline">
                    Public Link: /e/{event.slug} ↗
                  </a>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/events/${id}/edit`}>
                <Button variant="outline" size="sm">✏️ Edit</Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={handleDeleteEvent} disabled={deleting}>
                {deleting ? "..." : "🗑 Delete"}
              </Button>
            </div>
          </div>

          {/* Key Stats */}
          {rsvpStats && (
            <div className="flex gap-4 flex-wrap mt-6 pt-6 border-t">
              <div className="flex-1 min-w-[150px]">
                <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{rsvpStats.accepted}</p>
              </div>
              <div className="flex-1 min-w-[150px]">
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{rsvpStats.pending}</p>
              </div>
              <div className="flex-1 min-w-[150px]">
                <p className="text-sm text-muted-foreground mb-1">Declined</p>
                <p className="text-2xl font-bold text-red-600">{rsvpStats.declined}</p>
              </div>
              {checkinStats && (
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-muted-foreground mb-1">Checked In</p>
                  <p className="text-2xl font-bold text-blue-600">{checkinStats.checked_in}/{checkinStats.rsvp_accepted}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="border-b bg-white rounded-t-xl mb-0">
          <div className="container mx-auto px-4">
            <div className="flex gap-8">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-4 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
                      activeTab === tab.id
                        ? "border-[#E91E8C] text-[#E91E8C]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    {tab.label}
                    {tab.badge !== undefined && (
                      <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-[#E91E8C] text-white text-xs rounded-full font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl">
          <div className="container mx-auto px-4 py-8">

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {event.status === "draft" && (
                  <div className="rounded-xl border-2 border-[#E91E8C]/30 bg-[#fff1f8] p-6">
                    <h3 className="text-lg font-semibold text-[#E91E8C] mb-2 flex items-center gap-2"><Zap className="w-5 h-5" /> Publish Your Event</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Publish to unlock invite sending and start building your guest list.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-sm:start">
                      <select
                        value={publishChannel}
                        onChange={(e) => setPublishChannel(e.target.value)}
                        className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                      </select>
                      <span className="text-lg font-bold whitespace-nowrap">
                        ₦{calculatePrice(event.guest_count_range, publishChannel).toLocaleString()}
                      </span>
                      <Button onClick={handlePublish} disabled={publishing} className="bg-[#E91E8C] hover:bg-[#C4166F]">
                        {publishing ? "Processing..." : "Pay with Paystack"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          setPublishing(true);
                          try {
                            const res = await initiatePayment(Number(id), publishChannel, "paystack", "wallet");
                            getEvent(Number(id)).then(setEvent);
                          } catch (err: any) { setPublishError(err.message); }
                          setPublishing(false);
                        }}
                        disabled={publishing || (walletBalance !== null && walletBalance < calculatePrice(event.guest_count_range, publishChannel))}
                      >
                        {walletBalance !== null && walletBalance < calculatePrice(event.guest_count_range, publishChannel)
                          ? `Wallet ₦${walletBalance.toLocaleString()}`
                          : "Pay with Wallet"}
                      </Button>
                    </div>
                    {publishError && <p className="text-sm text-destructive mt-3">{publishError}</p>}
                  </div>
                )}

                {/* Quick Links Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Manage Event</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <Link href={`/dashboard/events/${id}/edit`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <Edit2 className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">Edit</p>
                    </Link>
                    <Link href={`/dashboard/events/${id}/coupons`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <TicketIcon className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">Coupons</p>
                    </Link>
                    <Link href={`/dashboard/events/${id}/waitlist`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <Clock className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">Waitlist</p>
                    </Link>
                    <Link href={`/dashboard/events/${id}/questions`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">RSVP Q's</p>
                    </Link>
                    <Link href={`/dashboard/events/${id}/reminders`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <Mail className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">Reminders</p>
                    </Link>
                    <Link href={`/dashboard/events/${id}/templates`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <Edit2 className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">Templates</p>
                    </Link>
                    <Link href={`/scan`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <Eye className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">Scanner</p>
                    </Link>
                    <Link href={`/dashboard/wallet`} className="rounded-lg border bg-white p-4 text-center hover:border-[#E91E8C] hover:bg-[#fff1f8] transition group">
                      <Wallet className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-[#E91E8C] group-hover:scale-110 transition" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-[#E91E8C]">Wallet</p>
                      {walletBalance !== null && <p className="text-xs font-bold text-[#E91E8C] mt-1">₦{walletBalance.toLocaleString()}</p>}
                    </Link>
                  </div>
                </div>

                {/* Checkin Stats */}
                {checkinStats && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Check className="w-5 h-5" /> Check-in Status</h3>
                    <div className="rounded-lg border bg-green-50 border-green-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700 mb-2">Guests Checked In</p>
                          <p className="text-3xl font-bold text-green-700">{checkinStats.checked_in} <span className="text-lg text-green-600">/ {checkinStats.rsvp_accepted}</span></p>
                        </div>
                        {checkinStats.recent_checkins?.length > 0 && (
                          <button
                            onClick={() => setShowAccreditationLog(!showAccreditationLog)}
                            className="px-4 py-2 rounded-lg bg-white border border-amber-200 text-sm font-medium hover:bg-amber-50 transition"
                          >
                            {accreditationLog?.suspicious_count ? (
                              <span className="inline-flex items-center gap-1.5 text-amber-700">
                                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                {accreditationLog.suspicious_count} Suspicious
                              </span>
                            ) : "View Scan Log"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {showAccreditationLog && accreditationLog && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-amber-900">Accreditation Scan Log</h3>
                      <button onClick={() => setShowAccreditationLog(false)} className="text-xs text-amber-700 hover:underline">Close</button>
                    </div>
                    {accreditationLog.attempts.length === 0 ? (
                      <p className="text-xs text-amber-700">No scan attempts recorded yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {accreditationLog.attempts.map((a: any) => (
                          <div key={a.id} className={`rounded-lg border px-3 py-2 text-xs ${a.status === 'checked_in' ? 'bg-white border-green-200' : a.status === 'already_used' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{a.guest_name || 'Unknown'}</span>
                              <span className={`font-semibold ${a.status === 'checked_in' ? 'text-green-700' : a.status === 'already_used' ? 'text-red-700' : a.status === 'invalid_token' ? 'text-red-700' : 'text-amber-700'}`}>
                                {a.status === 'checked_in' ? (
                                  <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Checked in</span>
                                ) : a.status === 'already_used' ? (
                                  <span className="inline-flex items-center gap-1"><CircleX className="h-3.5 w-3.5" aria-hidden="true" /> Already used</span>
                                ) : a.status === 'expired' ? (
                                  <span className="inline-flex items-center gap-1"><Hourglass className="h-3.5 w-3.5" aria-hidden="true" /> Expired</span>
                                ) : a.status === 'invalid_token' ? (
                                  <span className="inline-flex items-center gap-1"><CircleX className="h-3.5 w-3.5" aria-hidden="true" /> Invalid</span>
                                ) : a.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{a.created_at}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {accreditationLog.suspicious_count > 0 && (
                      <p className="mt-2 text-xs font-medium text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5 inline mr-1" aria-hidden="true" />
                        {accreditationLog.suspicious_count} suspicious attempt{accreditationLog.suspicious_count === 1 ? '' : 's'} detected
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* GUESTS TAB */}
            {activeTab === "guests" && (
              <div className="space-y-6">
                {/* Add Guest Form */}
                <div className="rounded-xl border p-6 bg-gradient-to-br from-blue-50 to-transparent">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Add Individual Guest</h3>
          <div>
                    {guestLimit !== null && (
                      <p className="mb-3 text-xs font-medium text-muted-foreground">
                        Threshold: {totalGuests} / {guestLimit} {remainingGuests !== null ? `(${remainingGuests} remaining)` : ""}
                      </p>
                    )}
                    <form onSubmit={addGuest} className="space-y-3">
                      <input placeholder="Full Name *" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
                      <input placeholder="Phone (optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                      <input placeholder="Email (optional)" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                      <Button type="submit" disabled={guestLimit !== null && totalGuests >= guestLimit} className="w-full bg-[#E91E8C] hover:bg-[#C4166F]">Add Guest</Button>
                    </form>
                </div>

                {/* CSV Import */}
                <div className="rounded-xl border p-6 bg-gradient-to-br from-purple-50 to-transparent">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Upload className="w-5 h-5" /> Bulk Import (CSV)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a CSV file with columns: <code className="bg-gray-100 px-2 py-1 rounded text-xs">name, phone, email</code>
                  </p>
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[#E91E8C] file:px-3 file:py-1 file:text-xs file:text-white cursor-pointer" />
                    <Button onClick={uploadCsv} disabled={!csvFile || csvUploading || (guestLimit !== null && totalGuests >= guestLimit)}>
                      {csvUploading ? "..." : "Upload"}
                    </Button>
                  </div>
                  {csvResult && <p className="text-xs mt-2 text-green-600 font-medium">{csvResult}</p>}
                </div>
                {/* Guests List */}
                <div className="rounded-xl border p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Guest List ({totalGuests})</h3>
                  {guests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No guests added yet. Start by adding a guest above or importing a CSV.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <form onSubmit={handleGuestSearch} className="flex gap-2 w-full max-w-md">
                          <input
                            type="text"
                            placeholder="Search guests..."
                            value={guestSearch}
                            onChange={(e) => setGuestSearch(e.target.value)}
                            className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                          <select
                            value={guestRsvpFilter}
                            onChange={(e) => setGuestRsvpFilter(e.target.value)}
                            className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">All</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                            <option value="pending">Pending</option>
                          </select>
                        </form>
                        {(guestSearch || guestRsvpFilter) && (
                          <Button variant="ghost" size="sm" onClick={resetGuestFilter} className="text-xs">Clear</Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {guests.map((guest) => (
                          <div key={guest.id} className="rounded-lg border p-4 hover:bg-gray-50 transition">
                            {editingGuest === guest.id ? (
                              <div className="space-y-2">
                                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                                <div className="flex gap-2">
                                  <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Phone" />
                                  <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Email" />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveEdit(guest.id)}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingGuest(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : deleteConfirm === guest.id ? (
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Delete {guest.name}?</p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteGuest(guest.id)}>Delete</Button>
                                  <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{guest.name}</p>
                                  <p className="text-xs text-muted-foreground">{guest.email || guest.phone || "No contact"}</p>
                                  <div className="flex gap-2 flex-wrap mt-2">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      guest.rsvp_status === 'accepted' ? 'bg-green-100 text-green-700' :
                                      guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-700' :
                                      'bg-amber-100 text-amber-700'
                                    }`}>
                                      {guest.rsvp_status}
                                    </span>
                                    {guest.invite_sent && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Invited</span>}
                                    {guest.invite_attempts ? <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{guest.invite_attempts}/3</span> : null}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => sendGuestInvite(guest.id)} title="Send invite">✉️</Button>
                                  <Button size="sm" variant="ghost" onClick={() => generateQR(guest.id)} disabled={generatingQR === guest.id} title="Generate QR">QR</Button>
                                  <Button size="sm" variant="ghost" onClick={() => startEdit(guest)} title="Edit">✏️</Button>
                                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleteConfirm(guest.id)} title="Delete">🗑</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {pageCount > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-4">
                          <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(0)}>«</button>
                          <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>‹</button>
                          {Array.from({ length: pageCount }, (_, i) => (
                            <button key={i} onClick={() => goToPage(i)} className={`px-3 py-1.5 text-xs rounded border hover:bg-accent ${i === currentPage ? "bg-[#E91E8C] text-white border-[#E91E8C] font-bold" : ""}`}>
                              {i + 1}
                            </button>
                          ))}
                          <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(currentPage + 1)}>›</button>
                          <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(pageCount - 1)}»</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* INVITES TAB */}
            {activeTab === "invites" && (
              <div className="space-y-6">
                <div className="rounded-xl border p-6 bg-gradient-to-br from-pink-50 to-transparent">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Send className="w-5 h-5" /> Send Invitations</h3>
            <div className="space-y-3">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
              <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                💡 Sends only to guests who haven't been invited. Use individual buttons to re-send.
              </div>
              {invalidPhoneGuests.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 font-medium">
                  ⚠️ Fix {invalidPhoneGuests.length} phone number{invalidPhoneGuests.length === 1 ? "" : "s"} before sending via {channel}.
                </div>
              )}
              {guestsWithoutSelectedContact.length > 0 && invalidPhoneGuests.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  ℹ️ {guestsWithoutSelectedContact.length} guest{guestsWithoutSelectedContact.length === 1 ? "" : "s"} missing {channel === "email" ? "email" : "phone"} will be skipped.
                </div>
              )}
              <div className="flex gap-2 flex-wrap pt-2">
                <Button onClick={() => sendInvites()} disabled={sending || !canSendInvites} className="bg-[#E91E8C] hover:bg-[#C4166F]">
                  {sending ? "..." : "Send Invites"}
                </Button>
                <Button onClick={() => sendInvites(true)} disabled={sending || !canSendInvites} variant="outline">
                  {sending ? "..." : "Resend All"}
                </Button>
                <Button onClick={sendAllQrs} disabled={sending || !canSendInvites} variant="outline">
                  {sending ? "..." : "Send All QR"}
                </Button>
                <Button variant="outline" onClick={testSend}>Test Send</Button>
              </div>
              {sendResult && (
                <div className="rounded-lg border p-3 text-sm">
                  Sent {sendResult.sent} of {sendResult.total} via {sendResult.channel}
                </div>
              )}
              {sendError && <div className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{sendError}</div>}
            </div>

            {logs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Delivery Logs</h2>
                <div className="space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="rounded-lg border p-3 text-sm">
                      <span className="font-medium">{log.channel}</span> &middot; {log.total_sent} sent &middot; {log.status}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {/* Cover Image */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Cover Image</h2>
              {event.cover_image && (
                <img src={event.cover_image} alt="Event cover" className="w-full h-40 object-cover rounded-lg border mb-3" />
              )}
              <div className="flex gap-2">
                <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadCover(f); if (coverInputRef.current) coverInputRef.current.value = ""; } }} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground" />
                {coverUploading && <span className="text-sm text-muted-foreground self-center">Uploading...</span>}
              </div>
            </div>

            {/* Flier Upload */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Fliers</h2>
              <div className="flex gap-2 mb-3">
                <input ref={flierInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadFlier(f); if (flierInputRef.current) flierInputRef.current.value = ""; } }} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground" />
                {flierUploading && <span className="text-sm text-muted-foreground self-center">Uploading...</span>}
              </div>
              {fliers.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {fliers.map((f: any) => (
                    <img key={f.id} src={f.url} alt={`Flier ${f.variant}`} className="w-full h-24 object-cover rounded-lg border" />
                  ))}
                </div>
              )}
            </div>

            {/* Embed Widget */}
            {event.slug && (
              <div className="mb-8 rounded-xl border bg-white p-4">
                <h2 className="text-sm font-semibold mb-2">Embed Widget</h2>
                <p className="text-xs text-gray-500 mb-2">Copy this code to embed this event on your website:</p>
                <pre className="text-xs bg-gray-50 p-3 rounded-lg border overflow-x-auto">
                  {`<iframe src="${window.location.origin}/embed/event/${id}" width="100%" height="320" frameborder="0" style="border:none;max-width:400px;margin:0 auto;display:block"></iframe>`}
                </pre>
              </div>
            )}

            <h2 className="text-lg font-semibold mb-4">Guests ({totalGuests})</h2>
            <form onSubmit={handleGuestSearch} className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Search guests..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="flex h-9 min-w-[160px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <select
                value={guestRsvpFilter}
                onChange={(e) => setGuestRsvpFilter(e.target.value)}
                className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All RSVP</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="pending">Pending</option>
                <option value="maybe">Maybe</option>
              </select>
              <Button type="submit" variant="outline" size="sm">Filter</Button>
              {(guestSearch || guestRsvpFilter) && (
                <Button type="button" variant="ghost" size="sm" onClick={resetGuestFilter}>Clear</Button>
              )}
            </form>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All guests</option>
                <option value="sent">Invite sent</option>
                <option value="not_sent">Not sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportGuests} disabled={exporting}>
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
            {guests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guests added yet.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={selectedGuestIds.length === guests.length && guests.length > 0} onChange={toggleSelectAll} className="rounded" />
                    Select all (max 5)
                  </label>
                  {selectedGuestIds.length > 0 && (
                    <Button size="sm" onClick={sendToSelected} disabled={sending}>
                      {sending ? "Sending..." : `Send to Selected (${selectedGuestIds.length})`}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {guests.map((guest) => (
                    <div key={guest.id} className="rounded-lg border p-3">
                      {editingGuest === guest.id ? (
                        <div className="space-y-2">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                          <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Phone" />
                          <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Email" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(guest.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingGuest(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : deleteConfirm === guest.id ? (
                        <div className="flex items-center justify-between">
                          <p className="text-sm">Delete <strong>{guest.name}</strong>?</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteGuest(guest.id)}>Yes</Button>
                            <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>No</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedGuestIds.includes(guest.id)}
                              onChange={() => toggleSelect(guest.id)}
                              className="rounded flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{guest.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {guest.phone || guest.email || "No contact"} &middot; {guest.rsvp_status}
                              </p>
                              {guest.rsvp_note && (
                                <p className="text-xs text-gray-500 italic mt-0.5 truncate">&ldquo;{guest.rsvp_note}&rdquo;</p>
                              )}
                              <div className="flex gap-1 flex-wrap mt-1">
                                {guest.invite_sent && (
                                  <span className="inline-block text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Invite Sent</span>
                                )}
                                {typeof guest.invite_attempts === 'number' && guest.invite_attempts > 0 && (
                                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${guest.invite_attempts >= 3 ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100'}`}>
                                    {guest.invite_attempts}/3 attempts
                                  </span>
                                )}
                                {guest.invite_viewed_at && (
                                  <span className="inline-block text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Viewed</span>
                                )}
                              </div>
                              {phoneChannelSelected && !isValidPhone(guest.phone) && (
                                <p className="mt-1 text-xs font-medium text-amber-700">Check phone number before WhatsApp/SMS send</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {qrMap[guest.id] ? (
                              <span className="text-xs text-muted-foreground mr-2">QR Ready</span>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => generateQR(guest.id)} disabled={generatingQR === guest.id}>
                                {generatingQR === guest.id ? "..." : "QR"}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => sendGuestQr(guest.id)}>Send QR</Button>
                            {!guest.invite_sent && (
                              <Button size="sm" variant="outline" onClick={() => sendGuestInvite(guest.id)}>Invite</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => startEdit(guest)}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(guest.id)}>Del</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-4">
                    <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(0)} title="First page">
                      &#171;
                    </button>
                    <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)} title="Previous page">
                      &#8249;
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => goToPage(i)}
                        className={`px-3 py-1.5 text-xs rounded border hover:bg-accent ${i === currentPage ? "bg-primary text-primary-foreground border-primary font-bold" : ""}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(currentPage + 1)} title="Next page">
                      &#8250;
                    </button>
                    <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(pageCount - 1)} title="Last page">
                      &#187;
                    </button>
                  </div>
                )}
              </>
            )}

            {purchases.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Ticket Buyers ({purchases.length})</h2>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {purchases.map((p: any) => (
                    <div key={p.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{p.buyer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.buyer_email} {p.buyer_phone ? `· ${p.buyer_phone}` : ""} · {p.quantity} ticket(s) · ₦{p.amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Ref: {p.reference}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        variant={confirmDialog?.variant ?? "default"}
        confirmLabel="Yes, proceed"
        onConfirm={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <ErrorBoundary>
      <EventDetailContent />
    </ErrorBoundary>
  );
}
