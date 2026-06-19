"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiClient, API_BASE } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Check, X, Search, Camera, User, RefreshCw, Clock, Loader, ChevronDown, QrCode, LogOut, Radio } from "lucide-react";

function EventDropdown({ events, selectedEvent, onEventChange, label }: { events: any[], selectedEvent: any, onEventChange: (id: number) => void, label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      {label && <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">{label}</p>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none w-full bg-white/15 border border-pink-500/50 rounded-lg px-3 py-2.5 text-sm text-white cursor-pointer hover:bg-white/20 hover:border-pink-500 transition focus:outline-none focus:ring-2 focus:ring-pink-500/60 focus:border-pink-500 flex items-center justify-between"
      >
        <span className="truncate">{selectedEvent?.title || "Select event"}</span>
        <ChevronDown className={`w-5 h-5 text-pink-400 flex-shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2940] border border-pink-500/50 rounded-lg shadow-lg z-50 overflow-hidden">
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => {
                onEventChange(ev.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 text-sm transition ${
                selectedEvent?.id === ev.id
                  ? "bg-pink-600/30 text-white border-l-2 border-pink-500 pl-2.5"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {ev.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface GuestResult {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  rsvp_status: string;
  rsvp_token: string;
  checked_in: boolean;
}

interface ActivityItem {
  id: number;
  guest_id: number;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  checked_in_at: string;
}

export default function AccreditationScanPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refetchUser } = useAuth();
  const scannerRef = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [stats, setStats] = useState({ checked_in: 0, total_guests: 0 });
  const [scannerStarted, setScannerStarted] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: string; message: string; guest?: any } | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<GuestResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [refetching, setRefetching] = useState(false);
  const refetchDone = useRef(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activityLive, setActivityLive] = useState(true);
  const [lastActivityRefresh, setLastActivityRefresh] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedManualGuests, setSelectedManualGuests] = useState<Set<number>>(new Set());

  const filteredEvents = events.filter((ev) =>
    ev.title?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const filteredManualResults = manualResults.filter((g) => {
    if (!statusFilter) return true;
    if (statusFilter === "checked-in") return g.checked_in;
    if (statusFilter === "not-checked-in") return !g.checked_in;
    return g.rsvp_status === statusFilter;
  });

  const checkInPercentage = stats.total_guests > 0 ? Math.round((stats.checked_in / stats.total_guests) * 100) : 0;

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // On mount, if not authenticated, try a direct auth/me call with the stored token
  useEffect(() => {
    if (authLoading) return;
    if (user) return;

    const token = sessionStorage.getItem("accreditation_token");
    if (!token) {
      router.push("/accreditation");
      return;
    }

    // Make a direct auth check using the stored token
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => {
        if (r.ok) {
          refetchUser(); // update auth context
          return;
        }
        sessionStorage.removeItem("accreditation_token");
        router.push("/accreditation");
      })
      .catch(() => {
        sessionStorage.removeItem("accreditation_token");
        router.push("/accreditation");
      });
  }, [authLoading]);

  useEffect(() => {
    if (user) {
      apiClient<any[]>("/scanner/events")
        .then((evts) => {
          setEvents(evts);
          if (evts.length === 0) return;
          const savedId = localStorage.getItem("accreditation_event_id");
          const saved = savedId ? evts.find((e: any) => e.id === Number(savedId)) : null;
          if (saved) {
            setSelectedEvent(saved);
          } else if (evts.length === 1) {
            setSelectedEvent(evts[0]);
          }
        })
        .catch(() => {})
        .finally(() => setInitialLoadDone(true));
    }
  }, [user]);

  const loadStats = useCallback(async (eventId: number) => {
    try {
      const d = await apiClient<any>(`/scanner/events/${eventId}/stats`);
      setStats(d);
    } catch {}
  }, []);

  const loadActivity = useCallback(async (eventId: number) => {
    setActivityLoading(true);
    try {
      const d = await apiClient<{ activity: ActivityItem[] }>(`/scanner/events/${eventId}/activity`);
      setActivity(d.activity || []);
      setLastActivityRefresh(new Date());
      setActivityLive(true);
    } catch { setActivity([]); }
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      localStorage.setItem("accreditation_event_id", String(selectedEvent.id));
      loadStats(selectedEvent.id);
      loadActivity(selectedEvent.id);
    }
  }, [selectedEvent, loadStats, loadActivity]);

  const handleEventChange = (eventId: number) => {
    stopScanner();
    setScanResult(null);
    setManualResults([]);
    setManualQuery("");
    setError("");
    const ev = events.find((e) => e.id === eventId) || null;
    setSelectedEvent(ev);
    if (ev) {
      localStorage.setItem("accreditation_event_id", String(ev.id));
    } else {
      localStorage.removeItem("accreditation_event_id");
    }
  };

  const startScanner = async () => {
    setError("");
    setScanResult(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          scanner.stop().catch(() => {});
          setScannerStarted(false);
          const token = decodedText.split("/").pop() || decodedText;
          await handleVerify(token);
        },
        () => {}
      );
      setScannerStarted(true);
    } catch (err: any) {
      setError(err.message || "Camera access denied. Use manual search instead.");
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScannerStarted(false);
  };

  const handleVerify = async (token: string) => {
    setScanResult(null);
    setError("");
    try {
      const res = await apiClient<any>("/scanner/verify", { method: "POST", body: { token } });
      if (res.valid) {
        setScanResult({ status: "found", message: `${res.guest.name}`, guest: res.guest });
      } else {
        setScanResult({ status: res.reason || "error", message: res.message, guest: res.guest });
      }
    } catch (err: any) {
      setScanResult({ status: "error", message: err.message || "Verification failed" });
    }
  };

  const handleCheckin = async (token: string) => {
    try {
      const res = await apiClient<any>("/scanner/checkin", { method: "POST", body: { token } });
      setScanResult({ status: res.status, message: res.message });
      if (selectedEvent) {
        loadStats(selectedEvent.id);
        loadActivity(selectedEvent.id);
      }
    } catch (err: any) {
      setScanResult({ status: "error", message: err.message || "Check-in failed" });
    }
  };

  const handleManualSearch = async () => {
    if (!manualQuery.trim() || !selectedEvent) return;
    setSearching(true);
    setError("");
    try {
      const res = await apiClient<{ guests: GuestResult[] }>(`/scanner/events/${selectedEvent.id}/guests?q=${encodeURIComponent(manualQuery)}`);
      setManualResults(res.guests || []);
    } catch (err: any) {
      setError(err.message || "Search failed");
    }
    setSearching(false);
  };

  const handleManualCheckin = async (guest: GuestResult) => {
    setCheckingIn(guest.id);
    setError("");
    try {
      const res = await apiClient<any>("/scanner/checkin", { method: "POST", body: { token: guest.rsvp_token } });
      if (res.status === "approved") {
        showToast(`${guest.name} checked in`, "success");
        setManualResults((prev) => prev.map((g) => g.id === guest.id ? { ...g, checked_in: true } : g));
      } else {
        showToast(`${res.message || "Check-in failed"}`, "error");
      }
      if (selectedEvent) {
        loadStats(selectedEvent.id);
        loadActivity(selectedEvent.id);
      }
    } catch (err: any) {
      showToast(err.message || "Check-in failed", "error");
    }
    setCheckingIn(null);
  };

  const handleBatchCheckin = async () => {
    if (selectedManualGuests.size === 0) return;
    setCheckingIn(-1);
    let successCount = 0;
    for (const guestId of selectedManualGuests) {
      const guest = manualResults.find((g) => g.id === guestId);
      if (guest && !guest.checked_in) {
        try {
          await apiClient<any>("/scanner/checkin", { method: "POST", body: { token: guest.rsvp_token } });
          successCount++;
        } catch {}
      }
    }
    showToast(`Checked in ${successCount} guest${successCount !== 1 ? "s" : ""}`, "success");
    setSelectedManualGuests(new Set());
    if (selectedEvent) {
      loadStats(selectedEvent.id);
      loadActivity(selectedEvent.id);
    }
    setCheckingIn(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setManualResults([]);
        setManualQuery("");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("manual-search-input")?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!scannerStarted) startScanner();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scannerStarted, startScanner]);

  const handleScanCheckin = async () => {
    if (!scanResult?.guest) return;
    const token = scanResult.guest.rsvp_token;
    if (!token) return;
    await handleCheckin(token);
    if (selectedEvent) {
      loadStats(selectedEvent.id);
      loadActivity(selectedEvent.id);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("accreditation_event_id");
    logout();
    router.push("/accreditation");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const ToastComponent = () => {
    if (!toast) return null;
    return (
      <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm font-semibold transition z-50 flex items-center gap-2 ${
        toast.type === "success" ? "bg-green-600" : "bg-red-600"
      }`}>
        {toast.type === "success" ? (
          <Check className="w-4 h-4 flex-shrink-0" />
        ) : (
          <X className="w-4 h-4 flex-shrink-0" />
        )}
        {toast.message}
      </div>
    );
  };

  if (events.length === 0 && initialLoadDone) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] text-white flex flex-col">
        <header className="border-b border-white/10 bg-[#0D1B2A]/95 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Image src="/logo-dark-trim.png" alt="accredit.vip" width={480} height={90} className="h-20 w-auto object-contain" />
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition min-h-[44px]">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-white/20" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Events Available</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              This account has no events to check guests into. Sign in with an organizer account that has events.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
              <button onClick={handleLogout} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm transition min-h-[44px]">
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white flex flex-col">
      <header className="border-b border-white/10 bg-[#0D1B2A]/95 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Image src="/logo-dark-trim.png" alt="accredit.vip" width={480} height={90} className="h-14 w-auto object-contain flex-shrink-0" />
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition min-h-[44px]">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-900/40 border border-red-500/50 p-3 flex items-center gap-2 text-sm">
            <X className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-300 flex-shrink-0 text-sm font-semibold">Dismiss</button>
          </div>
        )}

        {!selectedEvent ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-white/40">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select an event</p>
              <p className="text-sm mt-1">Choose an event from the dropdown below</p>
              {events.length > 1 && (
                <div className="mt-6 w-full max-w-md">
                  <EventDropdown events={filteredEvents} selectedEvent={selectedEvent} onEventChange={handleEventChange} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Event</p>
                  <p className="text-lg sm:text-xl font-bold truncate">{selectedEvent.title}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/50 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      {stats.checked_in} / {stats.total_guests} checked in
                    </p>
                    <p className="text-sm font-semibold text-white">{checkInPercentage}%</p>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-500"
                      style={{ width: `${checkInPercentage}%` }}
                    />
                  </div>
                </div>

                {events.length > 1 && (
                  <div className="pt-2 border-t border-white/10">
                    <EventDropdown events={filteredEvents} selectedEvent={selectedEvent} onEventChange={handleEventChange} label="Change Event" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wide text-white/60 mb-3 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-pink-500" />
                    Live Scanner
                  </h2>
                  <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                    {scannerStarted && (
                      <div className="p-4 border-b border-white/10 flex items-center justify-end">
                        <button onClick={stopScanner} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-700 text-sm font-semibold transition min-h-[44px]">
                          <X className="w-4 h-4" />
                          Stop
                        </button>
                      </div>
                    )}
                  <div className="p-4 relative">
                    {scannerStarted ? (
                      <div id="qr-reader" className="w-full max-w-sm mx-auto rounded-xl overflow-hidden [&_video]:rounded-xl [&_img]:rounded-xl" />
                    ) : (
                      <button
                        onClick={startScanner}
                        className="w-full flex flex-col items-center justify-center py-12 sm:py-16 text-white/30 relative cursor-pointer hover:bg-white/[0.02] transition rounded-xl group"
                      >
                        <div className="relative mb-4">
                          <Camera className="w-20 h-20 text-pink-500/60 group-hover:text-pink-400/80 transition" style={{ animation: "breathe 2.5s ease-in-out infinite" }} />
                          <div className="absolute inset-0 rounded-full bg-pink-500/10 blur-xl" style={{ animation: "breathe 2.5s ease-in-out infinite" }} />
                        </div>
                        <p className="font-semibold text-base text-white/60 group-hover:text-white/80 transition">Start Live Scanner</p>
                        <p className="text-xs mt-1.5 text-white/30">Tap anywhere to activate the camera</p>
                        <style>{`@keyframes breathe { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.06); opacity: 1; } }`}</style>
                      </button>
                    )}
                  </div>
                  </div>
                </div>

                {scanResult && (
                  <div className={`rounded-2xl border p-4 sm:p-5 ${
                    scanResult.status === "approved" ? "bg-green-900/30 border-green-500/50" :
                    scanResult.status === "found" ? "bg-blue-900/30 border-blue-500/50" :
                    scanResult.status === "declined" ? "bg-amber-900/30 border-amber-500/50" :
                    "bg-red-900/30 border-red-500/50"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {scanResult.status === "approved" ? <Check className="w-5 h-5 text-green-400 flex-shrink-0" /> :
                           scanResult.status === "found" ? <User className="w-5 h-5 text-blue-400 flex-shrink-0" /> :
                           scanResult.status === "declined" ? <X className="w-5 h-5 text-amber-400 flex-shrink-0" /> :
                           <X className="w-5 h-5 text-red-400 flex-shrink-0" />}
                          <p className="font-bold text-base sm:text-lg truncate">
                            {scanResult.status === "approved" ? "Checked In" :
                             scanResult.status === "found" ? "Guest Found" :
                             scanResult.status === "declined" ? "Invitation Declined" :
                             scanResult.status === "error" ? "Error" : scanResult.message}
                          </p>
                        </div>
                        {scanResult.guest && (
                          <div className="mt-2 space-y-1 text-sm text-white/70">
                            <p className="font-semibold text-white">{scanResult.guest.name}</p>
                            {scanResult.guest.phone && <p>{scanResult.guest.phone}</p>}
                            {scanResult.guest.email && <p className="truncate">{scanResult.guest.email}</p>}
                            <p className="capitalize">RSVP: {scanResult.guest.rsvp_status}</p>
                          </div>
                        )}
                        <p className="text-sm text-white/60 mt-2">{scanResult.message}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {scanResult.status === "found" && (
                          <button onClick={handleScanCheckin} className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 font-semibold text-sm transition min-h-[44px]">
                            Check In
                          </button>
                        )}
                        <button onClick={() => setScanResult(null)} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm transition min-h-[44px]">
                          {scanResult.status === "found" ? "Cancel" : "Dismiss"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wide text-white/60 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-pink-500" />
                    Manual Entry
                  </h2>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <input
                      id="manual-search-input"
                      value={manualQuery}
                      onChange={(e) => setManualQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                      placeholder="Search name, email, phone, or code..."
                      className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500"
                    />
                    <button onClick={handleManualSearch} disabled={searching || !manualQuery.trim()} className="px-4 sm:px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 font-semibold text-sm transition flex items-center gap-1.5 min-h-[44px]">
                      {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span className="hidden sm:inline">Search</span>
                    </button>
                  </div>

                  {manualResults.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      <button
                        onClick={() => setStatusFilter(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          !statusFilter ? "bg-pink-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        All ({manualResults.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter("pending")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          statusFilter === "pending" ? "bg-amber-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => setStatusFilter("accepted")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          statusFilter === "accepted" ? "bg-green-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        Accepted
                      </button>
                      <button
                        onClick={() => setStatusFilter("not-checked-in")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          statusFilter === "not-checked-in" ? "bg-blue-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        Not Checked In
                      </button>
                    </div>
                  )}

                  {filteredManualResults.length > 0 && selectedManualGuests.size > 0 && (
                    <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3 mt-3">
                      <p className="text-xs text-white/60">{selectedManualGuests.size} selected</p>
                      <button
                        onClick={handleBatchCheckin}
                        disabled={checkingIn !== null}
                        className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-xs font-semibold transition flex items-center gap-1.5 min-h-[44px]"
                      >
                        {checkingIn === -1 ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Check In Selected
                      </button>
                    </div>
                  )}

                  {filteredManualResults.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                      {filteredManualResults.map((g) => (
                        <div key={g.id} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition">
                          {!g.checked_in && g.rsvp_status !== "declined" && (
                            <input
                              type="checkbox"
                              checked={selectedManualGuests.has(g.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedManualGuests);
                                if (e.target.checked) {
                                  newSelected.add(g.id);
                                } else {
                                  newSelected.delete(g.id);
                                }
                                setSelectedManualGuests(newSelected);
                              }}
                              className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{g.name}</p>
                            <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                              {g.email && <span className="truncate">{g.email}</span>}
                              {g.phone && <span className="hidden sm:inline">{g.phone}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                g.rsvp_status === "accepted" ? "bg-green-900/50 text-green-400" :
                                g.rsvp_status === "declined" ? "bg-red-900/50 text-red-400" :
                                "bg-amber-900/50 text-amber-400"
                              }`}>
                                {g.rsvp_status || "pending"}
                              </span>
                              {g.checked_in && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/50 text-blue-400">
                                  <Check className="w-2.5 h-2.5" /> Checked in
                                </span>
                              )}
                            </div>
                          </div>
                          {!g.checked_in && g.rsvp_status !== "declined" && (
                            <button
                              onClick={() => handleManualCheckin(g)}
                              disabled={checkingIn === g.id}
                              className="ml-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-xs font-semibold transition flex items-center gap-1 flex-shrink-0 min-h-[36px]"
                            >
                              {checkingIn === g.id ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <span className="hidden sm:inline">Verify</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {manualQuery && !searching && filteredManualResults.length === 0 && (
                    <p className="text-sm text-white/40 mt-3 text-center">No guests found matching filters</p>
                  )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-white/60 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-pink-500" />
                    Recent Activity
                  </h2>
                  <div className="flex items-center gap-2">
                    {activityLive && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-green-400">LIVE</span>
                      </div>
                    )}
                    {lastActivityRefresh && (
                      <span className="text-[10px] text-white/40">
                        {lastActivityRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-h-[500px] flex flex-col lg:sticky lg:top-20">
                {activityLoading && activity.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center text-white/30">
                    <div>
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Loading activity...</p>
                    </div>
                  </div>
                ) : activity.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center text-white/30">
                    <div>
                      <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No check-ins yet</p>
                      <p className="text-xs mt-1">Guest check-ins will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {activity.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                        <div className="w-9 h-9 rounded-full bg-pink-600/30 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-pink-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{item.guest_name}</p>
                          <p className="text-xs text-white/50 truncate">{item.guest_email || item.guest_phone || "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 text-[10px] font-medium">
                            <Check className="w-2.5 h-2.5" /> In
                          </div>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {item.checked_in_at ? new Date(item.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activity.length > 0 && (
                  <button onClick={() => selectedEvent && loadActivity(selectedEvent.id)} className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold transition min-h-[44px]">
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <ToastComponent />
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
