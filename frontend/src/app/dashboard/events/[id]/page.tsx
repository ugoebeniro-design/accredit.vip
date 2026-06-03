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

type Guest = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  rsvp_status: string;
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
  const [publishChannel, setPublishChannel] = useState("email");
  const [publishing, setPublishing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; variant?: "danger" | "warning" | "default"; onConfirm: () => void } | null>(null);
  const [publishError, setPublishError] = useState("");
  const [checkinStats, setCheckinStats] = useState<{ checked_in: number; rsvp_accepted: number; total_guests: number; recent_checkins: any[] } | null>(null);
  const [accreditationLog, setAccreditationLog] = useState<{ attempts: any[]; suspicious_count: number } | null>(null);
  const [showAccreditationLog, setShowAccreditationLog] = useState(false);

  const loadGuests = useCallback(async (search?: string, rsvpStatus?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (rsvpStatus) params.set("rsvp_status", rsvpStatus);
      const qs = params.toString();
      const g = await apiClient<Guest[]>(`/events/${id}/guests${qs ? `?${qs}` : ""}`);
      setGuests(g);
    } catch {}
  }, [id]);

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
    loadGuests(guestSearch || undefined, guestRsvpFilter || undefined);
  };

  const resetGuestFilter = () => {
    setGuestSearch("");
    setGuestRsvpFilter("");
    loadGuests();
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
    if (guestLimit !== null && guests.length >= guestLimit) {
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
      const url = force ? `/events/${id}/send-invites?force=true` : `/events/${id}/send-invites`;
      const res = await apiClient<any>(url, { method: "POST", body: { channel } });
      setSendResult(res);
      loadLogs();
      loadGuests();
      if (res.already_sent) {
        setSendResult(null);
        setSendError("All guests have already been invited.");
      } else if (res.skipped_max_attempts > 0) {
        setSendError(`${res.skipped_max_attempts} guest(s) skipped (max 3 invite attempts reached). Create a new event to invite them again.`);
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
        <div className="text-4xl">⚠️</div>
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
  const remainingGuests = guestLimit === null ? null : Math.max(guestLimit - guests.length, 0);
  const phoneChannelSelected = channel === "whatsapp" || channel === "sms";
  const invalidPhoneGuests = phoneChannelSelected ? guests.filter((guest) => !isValidPhone(guest.phone)) : [];
  const guestsWithoutSelectedContact = guests.filter((guest) =>
    channel === "email" ? !guest.email : !guest.phone
  );
  const canSendInvites = guests.length > 0 && invalidPhoneGuests.length === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Accredit<span className="text-primary">.vip</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground">Dashboard</Link>
            <span className="text-sm text-muted-foreground">{user.full_name}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-8">
        <Link href="/dashboard" className="text-sm text-muted-foreground mb-6 inline-block">
          &larr; Back to Dashboard
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-1">
              {event.venue} &middot; {event.event_date} at {event.event_time}
            </p>
            {event.slug && (
              <p className="mt-2">
                <a href={`/e/${event.slug}`} target="_blank" className="text-sm text-[#E91E8C] font-semibold hover:underline">
                  /e/{event.slug} &nearr;
                </a>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/events/${id}/edit`}>
              <Button variant="outline" size="sm">Edit Event</Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDeleteEvent} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        {rsvpStats && (
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="rounded-lg border px-4 py-2 text-sm"><span className="font-medium">{rsvpStats.accepted}</span> Accepted</div>
            <div className="rounded-lg border px-4 py-2 text-sm"><span className="font-medium">{rsvpStats.declined}</span> Declined</div>
            <div className="rounded-lg border px-4 py-2 text-sm"><span className="font-medium">{rsvpStats.pending}</span> Pending</div>
          </div>
        )}
        {checkinStats && (
          <div className="flex gap-4 mb-8 flex-wrap">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm">
              <span className="font-medium text-green-800">{checkinStats.checked_in}</span>
              <span className="text-green-700"> Checked In</span>
              <span className="text-green-500 text-xs ml-1">/ {checkinStats.rsvp_accepted} accepted</span>
            </div>
            {checkinStats.recent_checkins?.length > 0 && (
              <button
                onClick={() => setShowAccreditationLog(!showAccreditationLog)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100"
              >
                {accreditationLog?.suspicious_count ? `⚠ ${accreditationLog.suspicious_count} suspicious` : "View scan log"}
              </button>
            )}
          </div>
        )}

        {event.status === "draft" && (
          <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.02] p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Publish Event</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pay to publish this event and unlock invite sending.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={publishChannel}
                  onChange={(e) => setPublishChannel(e.target.value)}
                  className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
                <span className="text-lg font-bold text-primary whitespace-nowrap">
                  ₦{calculatePrice(event.guest_count_range, publishChannel).toLocaleString()}
                </span>
                <Button onClick={handlePublish} disabled={publishing}>
                  {publishing ? "Processing..." : "Pay to Publish"}
                </Button>
              </div>
            </div>
            {publishError && (
              <p className="text-sm text-destructive mt-3">{publishError}</p>
            )}
          </div>
        )}

        {showAccreditationLog && accreditationLog && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
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
                        {a.status === 'checked_in' ? '✓ Checked in' : a.status === 'already_used' ? '✗ Already used (possible impersonation)' : a.status === 'expired' ? '⌛ Expired' : a.status === 'invalid_token' ? '✗ Invalid token' : a.status}
                      </span>
                    </div>
                    {a.device_info && <p className="text-[10px] text-muted-foreground mt-1">Device: {a.device_info}</p>}
                    {a.ip_address && <p className="text-[10px] text-muted-foreground">IP: {a.ip_address}</p>}
                    <p className="text-[10px] text-muted-foreground">{a.created_at}</p>
                  </div>
                ))}
              </div>
            )}
            {accreditationLog.suspicious_count > 0 && (
              <p className="mt-2 text-xs font-medium text-red-700">
                ⚠ {accreditationLog.suspicious_count} suspicious attempt{accreditationLog.suspicious_count === 1 ? '' : 's'} detected (repeated scan or invalid tokens)
              </p>
            )}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold mb-4">Add Guest</h2>
            {guestLimit !== null && (
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Guest threshold: {guests.length} of {guestLimit} used{remainingGuests !== null ? `, ${remainingGuests} remaining` : ""}.
              </p>
            )}
            <form onSubmit={addGuest} className="space-y-3">
              <input placeholder="Full Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
              <input placeholder="Phone (optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Email (optional)" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <Button type="submit" disabled={guestLimit !== null && guests.length >= guestLimit}>Add Guest</Button>
            </form>

            <div className="mt-6 border-t pt-6">
              <h3 className="text-sm font-semibold mb-3">Import from CSV</h3>
              <p className="text-xs text-muted-foreground mb-3">
                CSV must have columns: name, phone, email. Imports cannot exceed the selected guest threshold.
              </p>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground" />
                <Button onClick={uploadCsv} disabled={!csvFile || csvUploading || (guestLimit !== null && guests.length >= guestLimit)} variant="outline">
                  {csvUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
              {csvResult && <p className="text-xs mt-2 text-muted-foreground">{csvResult}</p>}
            </div>

            <h2 className="text-lg font-semibold mt-8 mb-4">Send Invites</h2>
            <div className="space-y-3">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Sends only to guests who haven't been invited yet. Use the per-guest "Invite" button to send individually. WhatsApp and SMS sends require valid international-style phone numbers.
              </div>
              {invalidPhoneGuests.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Fix {invalidPhoneGuests.length} incorrect phone number{invalidPhoneGuests.length === 1 ? "" : "s"} before sending via {channel}.
                </div>
              )}
              {guestsWithoutSelectedContact.length > 0 && invalidPhoneGuests.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {guestsWithoutSelectedContact.length} guest{guestsWithoutSelectedContact.length === 1 ? "" : "s"} missing {channel === "email" ? "email addresses" : "phone numbers"} will be skipped.
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => sendInvites()} disabled={sending || !canSendInvites}>
                  {sending ? "Sending..." : "Send Invites"}
                </Button>
                <Button onClick={() => sendInvites(true)} disabled={sending || !canSendInvites} variant="outline">
                  {sending ? "Sending..." : "Resend All"}
                </Button>
                <Button onClick={sendAllQrs} disabled={sending || !canSendInvites} variant="outline">
                  {sending ? "Sending..." : "Send All QR"}
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

            <h2 className="text-lg font-semibold mb-4">Guests ({guests.length})</h2>
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
            {guests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guests added yet.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                        <div>
                          <p className="text-sm font-medium">{guest.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {guest.phone || guest.email || "No contact"} &middot; {guest.rsvp_status}
                          </p>
                          {guest.invite_sent && (
                            <span className="mt-1 inline-block text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Invite Sent</span>
                          )}
                          {typeof guest.invite_attempts === 'number' && guest.invite_attempts > 0 && (
                            <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded ${guest.invite_attempts >= 3 ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100'}`}>
                              {guest.invite_attempts}/3 attempts
                            </span>
                          )}
                          {guest.invite_viewed_at && (
                            <span className="mt-1 inline-block text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Viewed</span>
                          )}
                          {phoneChannelSelected && !isValidPhone(guest.phone) && (
                            <p className="mt-1 text-xs font-medium text-amber-700">Check phone number before WhatsApp/SMS send</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
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
