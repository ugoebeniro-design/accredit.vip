"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getEvent, deleteEvent, type EventData } from "@/lib/api/events";
import { apiClient } from "@/lib/api-client";
import { initiatePayment } from "@/lib/api/payments";
import { EventDetailSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertTriangle, Check, CircleX, Hourglass, BarChart3, Users, Mail, Settings, Plus, Upload, Send, Edit2, Trash2, Eye, XCircle, Clock, Zap, Share2, Wallet, DollarSign, ArrowLeft, Loader, ExternalLink, MapPin, Calendar, Menu, X } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          message: `Pay ${detail.total_cost?.toLocaleString() ?? "0"} to re-send invites to ${detail.unpaid_guest_ids?.length ?? 0} guest(s)?`,
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
        setSendError(`${detail.message} ${detail.amount?.toLocaleString() ?? "0"}`);
        setConfirmDialog({
          title: "Payment required",
          message: `Pay ${detail.amount?.toLocaleString() ?? "0"} to re-send this invite?`,
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
        <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent">Go to Dashboard</button>
      </div>
    </div>
  );
  if (!event) return <EventDetailSkeleton />;

  const guestLimit = guestLimitFromRange(event.guest_count_range);
  const remainingGuests = guestLimit === null ? null : Math.max(guestLimit - totalGuests, 0);
  const phoneChannelSelected = channel === "whatsapp" || channel === "sms";
  const invalidPhoneGuests = phoneChannelSelected ? guests.filter((guest) => !isValidPhone(guest.phone)) : [];
  const guestsWithoutSelectedContact = guests.filter((guest) => channel === "email" ? !guest.email : !guest.phone);
  const canSendInvites = totalGuests > 0 && invalidPhoneGuests.length === 0;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "guests", label: "Guests", icon: Users, badge: totalGuests },
    { id: "invites", label: "Send Invites", icon: Mail },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header showNav={true} userFullName={user.full_name} dashboardLink="/dashboard" />

      <div className="px-4 py-6">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>

          {/* Main Content Area - Full Width */}
          <div className="w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {activeTab === "overview" && (
              <div className="space-y-8">
                {event.description && (
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-3">About This Event</h2>
                    <p className="text-slate-700 leading-relaxed">{event.description}</p>
                  </div>
                )}

                {event.dress_code && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <h3 className="font-bold text-slate-900 mb-2">Dress Code</h3>
                    <p className="text-slate-700">{event.dress_code}</p>
                  </div>
                )}

                {fliers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Event Fliers</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fliers.map((f) => (
                        <div key={f.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <img src={f.url} alt="Event flier" className="w-full h-48 object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {event.slug && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-blue-600" />
                      Share This Event
                    </h3>
                    <div className="bg-white rounded-lg p-3 font-mono text-sm text-slate-700 break-all border border-blue-100 select-all">
                      {typeof window !== "undefined" ? `${window.location.origin}/e/${event.slug}` : ""}
                    </div>
                  </div>
                )}

                {purchases.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Ticket Sales ({purchases.length})</h3>
                    <div className="space-y-2">
                      {purchases.map((p) => (
                        <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{p.buyer_name}</p>
                              <p className="text-sm text-slate-600">{p.buyer_email}{p.buyer_phone && ` • ${p.buyer_phone}`}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{p.quantity} ticket(s)</p>
                              <p className="text-sm text-slate-600">NGN {p.amount?.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {activeTab === "settings" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Cover Image</h3>
                  {event.cover_image && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <img src={event.cover_image} alt="Current cover" className="w-full h-48 object-cover" />
                    </div>
                  )}
                  <label className="block">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          uploadCover(f);
                          if (coverInputRef.current) coverInputRef.current.value = "";
                        }
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:mb-2 file:px-4 file:py-2.5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer file:transition-colors"
                    />
                  </label>
                  {coverUploading && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Event Fliers</h3>
                  {fliers.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {fliers.map((f) => (
                        <div key={f.id} className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                          <img src={f.url} alt="Flier" className="w-full h-24 object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="block">
                    <input
                      ref={flierInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          uploadFlier(f);
                          if (flierInputRef.current) flierInputRef.current.value = "";
                        }
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:mb-2 file:px-4 file:py-2.5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer file:transition-colors"
                    />
                  </label>
                  {flierUploading && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen w-96 bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 space-y-6">
          {/* Close Button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Event Info</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Cover Image */}
          {event.cover_image ? (
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg">
              <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center rounded-lg">
              <BarChart3 className="w-12 h-12 text-slate-400" />
            </div>
          )}

          {/* Event Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{event.title}</h1>
          </div>

          {/* Event Details */}
          <div className="space-y-3">
            {event.venue && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-0.5">Location</p>
                  <p className="text-sm text-slate-700 font-medium">{event.venue}</p>
                </div>
              </div>
            )}
            {event.event_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-0.5">Date</p>
                  <p className="text-sm text-slate-700 font-medium">{event.event_date}</p>
                </div>
              </div>
            )}
            {event.event_time && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-0.5">Time</p>
                  <p className="text-sm text-slate-700 font-medium">{event.event_time}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex gap-2">
            <Link href={`/dashboard/events/${id}/edit`} className="flex-1">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 h-9 text-xs font-medium">
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleDeleteEvent} disabled={deleting} className="gap-2 h-9 px-3 text-xs font-medium">
              {deleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* RSVP Stats */}
          {rsvpStats && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">RSVP Status</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-semibold">Accepted</p>
                  <p className="text-xl font-bold text-emerald-700">{rsvpStats.accepted}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-amber-700 font-semibold">Pending</p>
                  <p className="text-xl font-bold text-amber-700">{rsvpStats.pending}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-red-700 font-semibold">Declined</p>
                  <p className="text-xl font-bold text-red-700">{rsvpStats.declined}</p>
                </div>
                {checkinStats && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold">Checked In</p>
                    <p className="text-xl font-bold text-blue-700">{checkinStats.checked_in}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <div className="pt-4 border-t border-slate-200 space-y-1">
            {tabs.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center h-5 px-2 rounded-full text-xs font-bold bg-slate-200 text-slate-900">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {event.slug && (
            <div className="pt-4 border-t border-slate-200">
              <a
                href={`/e/${event.slug}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Public
              </a>
            </div>
          )}
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
