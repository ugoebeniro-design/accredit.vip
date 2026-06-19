"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";
import { Check, X, Search, Camera, User, RefreshCw, Clock, Loader, ChevronDown, QrCode } from "lucide-react";

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

export default function AccreditationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [accessChecking, setAccessChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      apiClient<{ access_granted: boolean; event_count: number; message: string }>("/scanner/check-access")
        .then((res) => {
          if (res.access_granted) {
            apiClient<any[]>("/scanner/events").then(setEvents).catch(() => {});
          } else {
            setAccessDenied(true);
          }
        })
        .catch(() => setAccessDenied(true))
        .finally(() => setAccessChecking(false));
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
    } catch { setActivity([]); }
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadStats(selectedEvent.id);
      loadActivity(selectedEvent.id);
    }
  }, [selectedEvent, loadStats, loadActivity]);

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
      setManualResults((prev) => prev.map((g) => g.id === guest.id ? { ...g, checked_in: res.status === "approved" } : g));
      if (selectedEvent) {
        loadStats(selectedEvent.id);
        loadActivity(selectedEvent.id);
      }
    } catch (err: any) {
      setError(err.message || "Check-in failed");
    }
    setCheckingIn(null);
  };

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

  if (loading || accessChecking) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pink-600/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Accreditation</h1>
          <p className="text-white/60 mt-3 leading-relaxed">
            Accreditation is a premium feature for event organizers who need live QR check-in at their venue.
          </p>
          <p className="text-sm text-white/40 mt-2">
            Create an event or upgrade your plan to access the accreditation dashboard.
          </p>
          <div className="flex flex-col gap-3 mt-8">
            <button onClick={() => router.push("/dashboard/create")} className="w-full rounded-xl bg-pink-600 hover:bg-pink-700 py-3.5 font-bold text-sm transition">
              Create an Event
            </button>
            <button onClick={() => router.push("/dashboard")} className="w-full rounded-xl bg-white/10 hover:bg-white/20 py-3.5 font-bold text-sm transition">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      <header className="border-b border-white/10 bg-[#0D1B2A]/95 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="text-sm text-pink-400 hover:underline">&larr; Dashboard</button>
            <h1 className="font-bold text-lg hidden sm:block">Accreditation</h1>
          </div>
          <div className="flex items-center gap-3">
            {selectedEvent && (
              <div className="flex items-center gap-4 text-xs text-white/60">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> {stats.checked_in}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {stats.total_guests}</span>
              </div>
            )}
            <select
              value={selectedEvent?.id || ""}
              onChange={(e) => {
                stopScanner();
                setScanResult(null);
                setManualResults([]);
                setSelectedEvent(events.find((ev) => ev.id === Number(e.target.value)) || null);
              }}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white max-w-[200px] truncate"
            >
              <option value="">Select event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-900/40 border border-red-500/50 p-3 flex items-center gap-2 text-sm">
            <X className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-300">Dismiss</button>
          </div>
        )}

        {!selectedEvent ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-white/40">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select an event to start</p>
              <p className="text-sm mt-1">Choose an event above to begin guest check-in</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main scanner area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Scanner */}
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className="font-bold flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-pink-400" />
                    Live Scanner
                  </h2>
                  {!scannerStarted ? (
                    <button onClick={startScanner} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-sm font-semibold transition">
                      <Camera className="w-4 h-4" />
                      Start Scanner
                    </button>
                  ) : (
                    <button onClick={stopScanner} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-700 text-sm font-semibold transition">
                      <X className="w-4 h-4" />
                      Stop Scanner
                    </button>
                  )}
                </div>
                <div className="p-4">
                  {scannerStarted ? (
                    <div id="qr-reader" className="w-full max-w-md mx-auto rounded-xl overflow-hidden [&_video]:rounded-xl [&_img]:rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-white/30">
                      <Camera className="w-12 h-12 mb-3" />
                      <p className="font-medium text-white/50">Scanner idle</p>
                      <p className="text-sm mt-1">Click "Start Scanner" to begin</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Scan result */}
              {scanResult && (
                <div className={`rounded-2xl border p-5 ${
                  scanResult.status === "approved" ? "bg-green-900/30 border-green-500/50" :
                  scanResult.status === "found" ? "bg-blue-900/30 border-blue-500/50" :
                  scanResult.status === "declined" ? "bg-amber-900/30 border-amber-500/50" :
                  "bg-red-900/30 border-red-500/50"
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {scanResult.status === "approved" ? <Check className="w-5 h-5 text-green-400" /> :
                         scanResult.status === "found" ? <User className="w-5 h-5 text-blue-400" /> :
                         scanResult.status === "declined" ? <X className="w-5 h-5 text-amber-400" /> :
                         <X className="w-5 h-5 text-red-400" />}
                        <p className="font-bold text-lg">
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
                          {scanResult.guest.email && <p>{scanResult.guest.email}</p>}
                          <p className="capitalize">RSVP: {scanResult.guest.rsvp_status}</p>
                        </div>
                      )}
                      <p className="text-sm text-white/60 mt-2">{scanResult.message}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {scanResult.status === "found" && (
                        <button onClick={handleScanCheckin} className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 font-semibold text-sm transition">
                          Confirm Check-in
                        </button>
                      )}
                      <button onClick={() => setScanResult(null)} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm transition">
                        {scanResult.status === "found" ? "Cancel" : "Dismiss"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual search */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-pink-400" />
                  Manual Entry
                </h3>
                <div className="flex gap-2">
                  <input
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                    placeholder="Search by guest name, email, phone, or code..."
                    className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500"
                  />
                  <button onClick={handleManualSearch} disabled={searching || !manualQuery.trim()} className="px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 font-semibold text-sm transition flex items-center gap-1.5">
                    {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                  </button>
                </div>

                {manualResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {manualResults.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{g.name}</p>
                          <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                            {g.email && <span className="truncate">{g.email}</span>}
                            {g.phone && <span>{g.phone}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
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
                            className="ml-3 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-xs font-semibold transition flex items-center gap-1 flex-shrink-0"
                          >
                            {checkingIn === g.id ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Verify
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {manualQuery && !searching && manualResults.length === 0 && (
                  <p className="text-sm text-white/40 mt-3 text-center">No guests found matching "{manualQuery}"</p>
                )}
              </div>
            </div>

            {/* Activity sidebar */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 h-fit lg:sticky lg:top-20">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-pink-400" />
                Recent Activity
              </h3>
              {activityLoading && activity.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading activity...</p>
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No check-ins yet</p>
                  <p className="text-xs mt-1">Guests will appear here as they check in</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
                <button onClick={() => selectedEvent && loadActivity(selectedEvent.id)} className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold transition">
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
