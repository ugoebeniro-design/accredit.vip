"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getEvent, deleteEvent, type EventData } from "@/lib/api/events";
import { apiClient } from "@/lib/api-client";
import { initiatePayment } from "@/lib/api/payments";
import { EventDetailSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Toast } from "@/components/shared/toast";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BarChart3, Users, Mail, Settings, Share2, Loader, HelpCircle, Bell, Ticket, Copy, Edit2, Zap } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import GuestsTabContent from "@/components/events/GuestsTabContent";
import InvitesTabContent from "@/components/events/InvitesTabContent";
import QuestionsTabContent from "@/components/events/QuestionsTabContent";
import RemindersTabContent from "@/components/events/RemindersTabContent";
import CouponsTabContent from "@/components/events/CouponsTabContent";
import TemplatesTabContent from "@/components/events/TemplatesTabContent";
import WaitlistTabContent from "@/components/events/WaitlistTabContent";

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
  channels?: Record<string, { batch_id: number; sent: number; total: number; skipped_max_attempts?: number }>;
  total_sent?: number;
  total_guests?: number;
  batch_id?: number;
  channel?: string;
  sent?: number;
  total?: number;
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
    return /^\+?\d{7,15}$/.test(compact);
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
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [logs, setLogs] = useState<any[]>([]);
  const [rsvpStats, setRsvpStats] = useState<RSVPStats | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [editingGuest, setEditingGuest] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingGuest, setSavingGuest] = useState<number | null>(null);
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
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const [couponCode, setCouponCode] = useState("");

  const handlePublish = async () => {
    setPublishError("");
    setPublishing(true);
    try {
      const res = await initiatePayment(Number(id), publishChannel, "paystack", "paystack", couponCode || undefined);
      if (res.method === "coupon") {
        getEvent(Number(id)).then(setEvent);
      } else if (res.authorization_url) {
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Cover upload failed");
      }
      const data = await res.json();
      if (event) setEvent({ ...event, cover_image: data.url });
      getEvent(Number(id)).then(setEvent);
      showToast("Cover image uploaded");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Cover upload failed", "error");
    }
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Flier upload failed");
      }
      loadFliers();
      showToast("Flier uploaded");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Flier upload failed", "error");
    }
    setFlierUploading(false);
  };

  const deleteCover = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/events/${id}/cover`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to delete cover");
      if (event) setEvent({ ...event, cover_image: null as any });
      showToast("Cover image removed");
    } catch {
      showToast("Failed to delete cover", "error");
    }
  };

  const deleteFlier = async (flierId: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/events/${id}/fliers/${flierId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to delete flier");
      loadFliers();
      showToast("Flier deleted");
    } catch {
      showToast("Failed to delete flier", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const addGuest = async (e: React.FormEvent, customData?: Record<string, any>) => {
    e.preventDefault();
    if (guestLimit !== null && totalGuests >= guestLimit) {
      showToast(`Guest limit reached. This event allows up to ${guestLimit} guests.`, "error");
      return;
    }
    try {
      const body: Record<string, any> = { name: guestName, phone: guestPhone || null, email: guestEmail || null };
      if (customData && Object.keys(customData).length > 0) {
        body.custom_data = customData;
      }
      await apiClient(`/events/${id}/guests`, { method: "POST", body });
      setGuestName(""); setGuestPhone(""); setGuestEmail("");
      showToast(`${guestName} added successfully`);
      loadGuests();
      loadRsvpStats();
      loadCheckinStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add guest.", "error");
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
      showToast(`Imported ${data.imported} guests`);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadGuests(); loadRsvpStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed. Check CSV format (name, phone, email columns).", "error");
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
      const body: any = { channels };
      const res = await apiClient<any>(`/events/${id}/send-invites${force ? "?force=true" : ""}`, {
        method: "POST", body,
      });
      setSendResult(res);
      showToast("Invites sent successfully");
      loadLogs();
      loadGuests();
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
        const errMsg = typeof detail === "string" ? detail : "Could not send invites.";
        setSendError(errMsg);
        showToast(errMsg, "error");
      }
    }
    setSending(false);
  };

  const sendGuestInvite = async (guestId: number) => {
    setSendError(null);
    setSendResult(null);
    try {
      const res = await apiClient<any>(`/events/${id}/guests/${guestId}/send-invite?force=true`, { method: "POST", body: { channels } });
      if (res.channels?.some((c: any) => c.status === "max_attempts")) {
        setSendError("Maximum invite attempts reached for some channels.");
        showToast("Maximum invite attempts reached", "error");
      } else {
        showToast("Invite sent successfully");
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
                await apiClient(`/events/${id}/guests/${guestId}/send-invite?force=true`, { method: "POST", body: { channels } });
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
        const errMsg = typeof detail === "string" ? detail : "Could not send invite.";
        setSendError(errMsg);
        showToast(errMsg, "error");
      }
    }
  };

  const sendGuestQr = async (guestId: number) => {
    try {
      await apiClient(`/events/${id}/guests/${guestId}/send-qr`, { method: "POST", body: { channels } });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send QR.");
    }
  };

  const sendAllQrs = async () => {
    setSending(true); setSendResult(null); setSendError(null);
    try {
      const res = await apiClient<any>(`/events/${id}/send-qrs`, { method: "POST", body: { channels } });
      setSendResult(res);
      loadLogs();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send QR codes.");
    }
    setSending(false);
  };

  const testSend = async () => {
    try {
      for (const ch of channels) {
        await apiClient("/events/test-send", {
          method: "POST",
          body: {
            channel: ch,
            email: ch === "email" ? (user?.email || "") : undefined,
            phone: ch !== "email" ? (user?.phone || "") : undefined,
          },
        });
      }
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
        body: { channels, guest_ids: selectedGuestIds },
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

  const saveEdit = async (guestId: number, customData?: Record<string, any>) => {
    if (!editName.trim()) {
      showToast("Guest name is required", "error");
      return;
    }
    if (editEmail && !editEmail.includes("@")) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (editPhone && editPhone.length < 10) {
      showToast("Phone number should be at least 10 digits", "error");
      return;
    }
    try {
      setSavingGuest(guestId);
      const body: Record<string, any> = { name: editName, phone: editPhone || null, email: editEmail || null };
      if (customData && Object.keys(customData).length > 0) {
        body.custom_data = customData;
      }
      await apiClient(`/events/${id}/guests/${guestId}`, {
        method: "PUT",
        body,
      });
      showToast("Guest updated successfully");
      setEditingGuest(null);
      loadGuests();
    } catch (err: any) {
      showToast(err.message || "Could not update guest", "error");
    } finally {
      setSavingGuest(null);
    }
  };

  const handleDeleteGuest = async (guestId: number) => {
    try {
      const deletedGuest = guests.find((g) => g.id === guestId);
      await apiClient(`/events/${id}/guests/${guestId}`, { method: "DELETE" });
      setDeleteConfirm(null);
      showToast(`${deletedGuest?.name || "Guest"} deleted successfully`);
      loadGuests(); loadRsvpStats();
    } catch {
      showToast("Could not delete guest. They may have existing invites or payments.", "error");
    }
  };

  if (loading || !user) return null;
  if (loadError) return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Could not load event</h2>
        <p className="text-sm text-muted-foreground">The event may have been deleted or a network error occurred.</p>
        <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2 justify-center">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
      </div>
    </div>
  );
  if (!event) return <EventDetailSkeleton />;

  const guestLimit = guestLimitFromRange(event.guest_count_range);
  const remainingGuests = guestLimit === null ? null : Math.max(guestLimit - totalGuests, 0);
  const phoneChannelsSelected = channels.some((c) => c === "whatsapp" || c === "sms");
  const invalidPhoneGuests = phoneChannelsSelected ? guests.filter((guest) => !isValidPhone(guest.phone)) : [];
  const guestsWithMissingContact = guests.filter((guest) => {
    const missingEmail = channels.includes("email") && !guest.email;
    const missingPhone = channels.some((c) => c !== "email") && !guest.phone;
    return missingEmail || missingPhone;
  });
  const canSendInvites = totalGuests > 0 && invalidPhoneGuests.length === 0;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "guests", label: "Guests", icon: Users, badge: totalGuests },
    { id: "invites", label: "Send Invites", icon: Mail },
    { id: "questions", label: "Questions", icon: HelpCircle },
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "coupons", label: "Coupons", icon: Ticket },
    { id: "templates", label: "Templates", icon: Copy },
    { id: "waitlist", label: "Waitlist", icon: Users },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const allTabs = tabs.map((t) => {
    const IconComp = t.icon;
    const isActive = activeTab === t.id;
    return (
      <button
        key={t.id}
        onClick={() => { setActiveTab(t.id); router.replace(`/dashboard/events/${id}?tab=${t.id}`, { scroll: false }); }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-slate-900 text-white shadow-md"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <IconComp className="w-4 h-4" />
        <span>{t.label}</span>
        {t.badge !== undefined && t.badge > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-5 px-2 rounded-full text-xs font-bold bg-slate-200 text-slate-900">
            {t.badge}
          </span>
        )}
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardTopbar
        title={event.title}
        subtitle="Event Details"
        onMenuClick={() => setMobileNavOpen(true)}
      />

      <div className="flex flex-1">
        <DashboardSidebar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          mobileNavOpen={mobileNavOpen}
          onMobileNavClose={() => setMobileNavOpen(false)}
        />

        <div className="flex-1 px-4 py-6 overflow-auto">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {allTabs}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {activeTab === "overview" && (
              <div className="space-y-8">
                {event.cover_image && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm -mx-4 sm:-mx-0">
                    <img src={event.cover_image} alt="Event cover" className="w-full object-contain max-h-[500px] bg-slate-100" />
                  </div>
                )}
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
                    <div className="flex flex-col gap-4">
                      {fliers.map((f) => (
                        <div key={f.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                          <img src={f.url} alt="Event flier" className="w-full object-contain max-h-64 bg-slate-100" />
                          <button
                            onClick={() => deleteFlier(f.id)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                            title="Delete flier"
                          >
                            ×
                          </button>
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

                {/* Publish Section */}
                {event.status !== "published" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-600" />
                      Publish Event
                    </h3>
                    <p className="text-sm text-slate-700">
                      Publish this event to make it visible to the public and allow ticket purchases.
                    </p>

                    {/* Channel selection for publish */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Delivery Channel</label>
                      <div className="flex flex-wrap gap-2">
                        {["email", "whatsapp", "sms"].map((ch) => {
                          const active = publishChannel === ch;
                          return (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setPublishChannel(ch)}
                              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize ${
                                active
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              {ch}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coupon Code Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Coupon Code <span className="text-xs text-slate-500">(optional — use 100% off coupon to bypass payment)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    {publishError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{publishError}</p>
                    )}

                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {publishing ? (
                        <><Loader className="w-4 h-4 animate-spin" /> Publishing...</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Publish Event</>
                      )}
                    </button>
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
                eventId={Number(id)}
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
                savingGuest={savingGuest}
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
                channels={channels}
                setChannels={setChannels}
                sending={sending}
                canSendInvites={canSendInvites}
                sendInvites={sendInvites}
                sendAllQrs={sendAllQrs}
                testSend={testSend}
                sendResult={sendResult}
                sendError={sendError}
                logs={logs}
                invalidPhoneGuests={invalidPhoneGuests}
                guestsWithMissingContact={guestsWithMissingContact}
                guestCountRange={event.guest_count_range}
              />
            )}

            {activeTab === "questions" && (
              <QuestionsTabContent eventId={id} />
            )}

            {activeTab === "reminders" && (
              <RemindersTabContent eventId={id} />
            )}

            {activeTab === "coupons" && (
              <CouponsTabContent eventId={id} />
            )}

            {activeTab === "templates" && (
              <TemplatesTabContent eventId={id} />
            )}

            {activeTab === "waitlist" && (
              <WaitlistTabContent eventId={id} />
            )}

            {activeTab === "settings" && (
              <div className="space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Event Settings</h3>
                    <p className="text-sm text-slate-600 mt-1">Manage event details, cover image, and fliers</p>
                  </div>
                  <Link href={`/dashboard/events/${id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
                    <Edit2 className="w-4 h-4" />
                    Edit Event Details
                  </Link>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Cover Image</h3>
                  {event.cover_image && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group">
                      <img src={event.cover_image} alt="Current cover" className="w-full object-contain max-h-96 bg-slate-100" />
                      <button
                        onClick={deleteCover}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                        title="Remove cover"
                      >
                        ×
                      </button>
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
                    <div className="flex flex-col gap-4">
                      {fliers.map((f) => (
                        <div key={f.id} className="rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group">
                          <img src={f.url} alt="Flier" className="w-full object-contain max-h-64 bg-slate-100" />
                          <button
                            onClick={() => deleteFlier(f.id)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                            title="Delete flier"
                          >
                            ×
                          </button>
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

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        variant={confirmDialog?.variant ?? "default"}
        confirmLabel="Yes, proceed"
        onConfirm={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
        onCancel={() => setConfirmDialog(null)}
      />
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetailContent />
      </Suspense>
    </ErrorBoundary>
  );
}
