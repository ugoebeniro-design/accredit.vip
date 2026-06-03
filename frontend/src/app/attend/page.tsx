"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getPublicEvents, type EventData, type EventFilters } from "@/lib/api/events";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

const UPLOAD_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/api\/v1\/?$/, "");

function coverImgUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${UPLOAD_BASE}${path}`;
}

function formatCardDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatCardTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, min] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDistance(km: number | undefined): string | null {
  if (km === undefined || km === null) return null;
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
}

const CATEGORIES = [
  { value: "", label: "All Events" },
  { value: "concert", label: "Concert" },
  { value: "conference", label: "Conference" },
  { value: "festival", label: "Festival" },
  { value: "nightlife", label: "Nightlife" },
  { value: "sports", label: "Sports" },
  { value: "corporate", label: "Corporate" },
  { value: "private", label: "Private" },
  { value: "wedding", label: "Wedding" },
];

function CategoryIcon({ cat, className = "w-5 h-5" }: { cat: string; className?: string }) {
  const cls = className;
  const icons: Record<string, React.ReactNode> = {
    concert: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
    conference: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    festival: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    nightlife: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    sports: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    corporate: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    private: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    wedding: <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  };
  return <>{icons[cat] || <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}</>;
}

function EventCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#f8f9fc", border: "1px solid #e8edf2" }}>
      <div className="skeleton h-44 rounded-none" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-6 w-20 rounded-full mt-2" />
      </div>
    </div>
  );
}

const MONTHS = [
  { value: 0, label: "All Months" },
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

function AttendContent() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("Lagos");
  const [month, setMonth] = useState(0);
  const [priceType, setPriceType] = useState("");
  const [nearLat, setNearLat] = useState<number | undefined>(undefined);
  const [nearLng, setNearLng] = useState<number | undefined>(undefined);
  const [findingLocation, setFindingLocation] = useState(false);
  const [, setGeoError] = useState<string | null>(null);

  const buildFilters = () => ({
    search: search || undefined,
    category: category || undefined,
    location: location || undefined,
    month: month || undefined,
    price_type: priceType || undefined,
    near_lat: nearLat,
    near_lng: nearLng,
    radius_km: nearLat ? 50 : undefined,
  });

  const loadEvents = useCallback(async (filters?: EventFilters) => {
    setLoading(true);
    try {
      const data = await getPublicEvents(filters);
      setEvents(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents({ location: "Lagos" }); }, [loadEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvents(buildFilters());
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }
    setFindingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setNearLat(lat);
        setNearLng(lng);
        setFindingLocation(false);
        loadEvents({ ...buildFilters(), near_lat: lat, near_lng: lng, radius_km: 50 });
      },
      (err) => {
        setFindingLocation(false);
        setGeoError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReset = () => {
    setSearch(""); setCategory(""); setLocation("Lagos"); setMonth(0); setPriceType("");
    setNearLat(undefined); setNearLng(undefined);
    loadEvents({ location: "Lagos" });
  };

  const filtersActive = search || category || location !== "Lagos" || month || priceType || nearLat !== undefined;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar variant="light" />

      {/* Compact search bar — keeps events above the fold */}
      <div className="bg-white border-b border-[#e8edf2] px-4 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[#0D1B2A] leading-tight">Discover Events</h1>
            <p className="text-xs text-gray-400 mt-0.5">Concerts, conferences, weddings &amp; more across Africa</p>
          </div>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 sm:max-w-lg sm:ml-auto">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search events, venues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#d9e2ec] text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>
            <button type="submit" className="btn-primary h-10 px-5 text-sm flex-shrink-0 rounded-xl">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Filters bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-[#e8edf2] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setCategory(cat.value);
                  loadEvents({ ...buildFilters(), category: cat.value || undefined });
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: category === cat.value ? "linear-gradient(135deg, #E91E8C, #C4166F)" : "#f1f5f9",
                  color: category === cat.value ? "white" : "#64748b",
                  boxShadow: category === cat.value ? "0 4px 14px rgba(233,30,140,0.3)" : "none",
                }}
              >
                <CategoryIcon cat={cat.value} className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
          {/* Location, Month, Price filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <input type="text" placeholder="City or state..." value={location}
                onChange={(e) => setLocation(e.target.value)}
                onBlur={() => { setNearLat(undefined); setNearLng(undefined); loadEvents(buildFilters()); }}
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#d9e2ec] text-xs outline-none focus:border-[#E91E8C]"
              />
            </div>
            <button onClick={handleNearMe} disabled={findingLocation}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{ background: nearLat ? "linear-gradient(135deg, #E91E8C, #C4166F)" : "#f1f5f9", color: nearLat ? "white" : "#64748b" }}
            >
              {findingLocation ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              )}
              {nearLat ? "Nearby" : "Near Me"}
            </button>
            <select value={month} onChange={(e) => { setMonth(Number(e.target.value)); loadEvents({ ...buildFilters(), month: Number(e.target.value) || undefined }); }}
              className="h-9 px-3 rounded-lg border border-[#d9e2ec] text-xs outline-none focus:border-[#E91E8C] text-gray-500"
            >
              {MONTHS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
            <div className="flex items-center gap-1 bg-[#f8f9fc] rounded-lg p-0.5 border border-[#e8edf2]">
              {["", "free", "paid"].map((pt) => (
                <button key={pt} onClick={() => { setPriceType(pt); loadEvents({ ...buildFilters(), price_type: pt || undefined }); }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={{ background: priceType === pt ? "white" : "transparent", color: priceType === pt ? "#E91E8C" : "#94a3b8", boxShadow: priceType === pt ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}
                >{pt === "" ? "All" : pt === "free" ? "Free" : "Paid"}</button>
              ))}
            </div>
            {filtersActive && (
              <button onClick={handleReset} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">✕ Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl mb-6"
              style={{ background: "rgba(233,30,140,0.08)" }}
            >
              <span className="text-3xl" style={{ color: "#E91E8C" }}><CategoryIcon cat="" className="w-10 h-10" /></span>
            </div>
            <h3 className="text-xl font-bold text-[#0D1B2A] mb-2">
              {filtersActive ? "No matching events" : "No events yet"}
            </h3>
            <p className="text-gray-400 text-sm mb-8">
              {filtersActive
                ? "Try different search terms or clear your filters."
                : "Check back soon — events are being added daily."}
            </p>
            <Link href="/register" className="btn-primary inline-flex">
              Create an Event
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-6">
              Showing <strong className="text-[#0D1B2A]">{events.length}</strong> event{events.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const img = coverImgUrl(event.cover_image);
                const isFree = !event.ticket_price || event.ticket_price === 0;
                return (
                  <Link key={event.id} href={`/events/${event.id}`} className="block group">
                    <div className="premium-card h-full flex flex-col overflow-hidden">
                      {/* Cover image or category placeholder */}
                      <div className="relative h-44 overflow-hidden bg-[#f4f6fb]">
                        {img ? (
                          <>
                            <img
                              src={img}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center" style={{ color: "#cbd5e1" }}>
                            <CategoryIcon cat={event.category || event.event_type || ""} className="w-12 h-12" />
                          </div>
                        )}
                        {/* Price badge */}
                        <div className="absolute top-3 right-3">
                          <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm"
                            style={{ background: isFree ? "#10b981" : "#E91E8C", color: "white" }}
                          >
                            {isFree ? "FREE" : `₦${event.ticket_price!.toLocaleString()}`}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <span className="badge-pink text-[10px] mb-3 self-start">
                          {(event.category || event.event_type || "Event").toUpperCase()}
                        </span>
                        <h3 className="font-bold text-[#0D1B2A] text-base line-clamp-2 mb-2 group-hover:text-[#E91E8C] transition-colors">
                          {event.title}
                        </h3>
                        <div className="mt-auto pt-3 space-y-1.5 border-t border-[#e8edf2]">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{event.venue}</span>
                            {event.distance_km !== undefined && (
                              <span className="flex-shrink-0 font-medium" style={{ color: "#E91E8C" }}>{formatDistance(event.distance_km)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatCardDate(event.event_date)} · {formatCardTime(event.event_time)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function AttendPage() {
  return (
    <ErrorBoundary>
      <AttendContent />
    </ErrorBoundary>
  );
}
