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
import { Header } from "@/components/shared/header";
import GuestsTabContent from "@/components/events/GuestsTabContent";
import InvitesTabContent from "@/components/events/InvitesTabContent";

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
          message: `Pay â‚¦${detail.total_cost?.toLocaleString() ?? "0"} to re-send invites to ${detail.unpaid_guest_ids?.length ?? 0} guest(s)?`,
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
        setSendError(`${detail.message} â‚¦${detail.amount?.toLocaleString() ?? "0"}`);
        setConfirmDialog({
          title: "Payment required",
          message: `Pay â‚¦${detail.amount?.toLocaleString() ?? "0"} to re-send this invite?`,
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
      <Header showNav={true} userFullName={user.full_name} dashboardLink="/dashboard" />

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
                ðŸ“ {event.venue} â€¢ ðŸ“… {event.event_date} â€¢ ðŸ• {event.event_time}
              </p>
              {event.slug && (
                <p className="mt-3">
                  <a href={`/e/${event.slug}`} target="_blank" className="text-sm text-[#E91E8C] font-semibold hover:underline">
                    Public Link: /e/{event.slug} â†—
                  </a>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/events/${id}/edit`}>
                <Button variant="outline" size="sm">âœï¸ Edit</Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={handleDeleteEvent} disabled={deleting}>
                {deleting ? "..." : "ðŸ—‘ Delete"}
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
                <p className="text-sm text-muted-foreground">Overview content.</p>
              </div>
            )}

            {/* GUESTS TAB */}
            {activeTab === "guests" && (
              <GuestsTabContent
                guestLimit={guestLimit}
                totalGuests={totalGuests}
                remainingGuests={remainingGuests}
                guestName={guestName}
                setGuestName={setGuestName}
                guestPhone={guestPhone}
                setGuestPhone={setGuestPhone}
                guestEmail={guestEmail}
                setGuestEmail={setGuestEmail}
                addGuest={addGuest}
                csvFile={csvFile}
                setCsvFile={setCsvFile}
                csvUploading={csvUploading}
                csvResult={csvResult}
                fileInputRef={fileInputRef}
                uploadCsv={uploadCsv}
                guests={guests}
                guestSearch={guestSearch}
                setGuestSearch={setGuestSearch}
                guestRsvpFilter={guestRsvpFilter}
                setGuestRsvpFilter={setGuestRsvpFilter}
                handleGuestSearch={handleGuestSearch}
                resetGuestFilter={resetGuestFilter}
                editingGuest={editingGuest}
                setEditingGuest={setEditingGuest}
                editName={editName}
                setEditName={setEditName}
                editPhone={editPhone}
                setEditPhone={setEditPhone}
                editEmail={editEmail}
                setEditEmail={setEditEmail}
                saveEdit={saveEdit}
                deleteConfirm={deleteConfirm}
                setDeleteConfirm={setDeleteConfirm}
                handleDeleteGuest={handleDeleteGuest}
                startEdit={startEdit}
                sendGuestInvite={sendGuestInvite}
                generateQR={generateQR}
                generatingQR={generatingQR}
                currentPage={currentPage}
                pageCount={pageCount}
                goToPage={goToPage}
              />
            )}

            {/* INVITES TAB */}
            {activeTab === "invites" && (
              <InvitesTabContent
                channel={channel}
                setChannel={setChannel}
                sending={sending}
                canSendInvites={canSendInvites}
                sendInvites={sendInvites}
                sendAllQrs={sendAllQrs}
                testSend={testSend}
                sendResult={sendResult}
                sendError={sendError}
                logs={logs}
                invalidPhoneGuests={invalidPhoneGuests}
                guestsWithoutSelectedContact={guestsWithoutSelectedContact}
              />
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
                        {p.buyer_email} {p.buyer_phone ? `Â· ${p.buyer_phone}` : ""} Â· {p.quantity} ticket(s) Â· â‚¦{p.amount?.toLocaleString()}
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
