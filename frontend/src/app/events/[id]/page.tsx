"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEvent, type EventData } from "@/lib/api/events";
import { apiClient, API_BASE } from "@/lib/api-client";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { ReminderBanner } from "@/components/shared/reminder-banner";
import { formatTimeForDisplay, getCurrencySymbol } from "@/lib/event-form-options";

const UPLOAD_BASE = API_BASE.replace(/\/api\/v1\/?$/, "");

const PLATFORM_FEE_PERCENT = 5;
const VAT_PERCENT = 2.5;

type PurchaseInfo = {
  purchase_id: number;
  reference: string;
  amount: number;
  base_amount: number;
  platform_fee: number;
  vat: number;
  quantity: number;
  authorization_url: string | null;
  method?: string;
};

type PurchaseStatus = {
  id: number;
  reference: string;
  status: string;
  buyer_name: string;
  quantity: number;
  amount: number;
};

function coverImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${UPLOAD_BASE}${path}`;
}

function formatEventDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CategoryIcon({ cat, className = "w-5 h-5" }: { cat: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    concert: <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
    conference: <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    festival: <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  };
  return <>{icons[cat] || <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}</>;
}

function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#E91E8C] hover:bg-[#C4166F] transition-all duration-200 hover:scale-105 bounce-share"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {copied ? "Link copied!" : "Share event"}
    </button>
  );
}

function PublicEventContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      getEvent(Number(id))
        .then(setEvent)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    const ref = searchParams.get("purchase") || searchParams.get("trxref");
    if (ref) {
      apiClient<PurchaseStatus>(`/tickets/purchases/${ref}`)
        .then((s) => {
          setPurchaseStatus(s);
          if (s.status === "completed") router.push(`/ticket/${ref}`);
        })
        .catch(() => {});
    }
  }, [searchParams, router]);

  const handlePurchase = async (method: string = "paystack") => {
    setError("");
    setPurchasing(true);
    try {
      const res = await apiClient<PurchaseInfo>("/tickets/purchase", {
        method: "POST",
        body: {
          event_id: Number(id),
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone || null,
          quantity,
          payment_method: method,
        },
      });
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      } else if (res.method === "wallet") {
        setRegistered(true);
      } else {
        setRegistered(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setPurchasing(false);
  };

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  useEffect(() => {
    apiClient<any>("/wallet").then((d) => setWalletBalance(d.balance)).catch(() => setWalletBalance(null));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar variant="light" />
        <div className="h-64 sm:h-80 bg-[#f4f6fb] animate-pulse" />
        <div className="max-w-5xl mx-auto px-4 py-10 w-full grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 bg-[#f4f6fb] rounded animate-pulse" style={{ width: `${70 - i * 10}%` }} />
            ))}
          </div>
          <div className="h-48 bg-[#f4f6fb] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar variant="light" />
        <div className="flex flex-1 items-center justify-center flex-col gap-4 py-24">
          <p className="text-gray-400 text-lg">Event not found</p>
          <Link href="/attend" className="btn-primary">Browse Events</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const imgUrl = coverImageUrl(event.cover_image);
  const isFreeEvent = !event.ticket_price || event.ticket_price === 0;
  const cs = getCurrencySymbol(event?.currency || "NGN");
  const passPackages = event.pass_packages?.filter((p: any) => p.name || p.price) || [];
  const lineup = event.lineup?.filter((p: any) => p.role || p.name) || [];
  const cat = event.category || event.event_type || "";

  const catGradients: Record<string, string> = {
    concert: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #E91E8C 100%)",
    festival: "linear-gradient(135deg, #1a0533 0%, #4a0080 50%, #f59e0b 100%)",
    conference: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    nightlife: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    sports: "linear-gradient(135deg, #134e4a 0%, #065f46 50%, #10b981 100%)",
    corporate: "linear-gradient(135deg, #1e3a5f 0%, #2d4a7a 50%, #3b82f6 100%)",
    wedding: "linear-gradient(135deg, #4a044e 0%, #701a75 50%, #E91E8C 100%)",
  };
  const heroBg = catGradients[cat] || "linear-gradient(135deg, #0D1B2A 0%, #263b5e 50%, #E91E8C 100%)";

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar variant="light" />

      {/* Hero Banner */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: heroBg }}>
            <CategoryIcon cat={cat} className="w-20 h-20 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-6 sm:pb-8 max-w-5xl mx-auto w-full">
          <span
            className="inline-block text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1 rounded-full mb-3"
            style={{ background: "rgba(233,30,140,0.85)", color: "white" }}
          >
            {cat.toUpperCase() || "EVENT"}
          </span>
          <h1 className="text-white text-2xl sm:text-4xl font-black leading-tight drop-shadow-md">
            {event.title}
          </h1>
          <p className="text-white/75 text-sm mt-1 font-medium">by {event.host_name}</p>
        </div>
      </div>

      {/* Payment pending banner */}
      {purchaseStatus && purchaseStatus.status !== "completed" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-800 font-medium">
          Payment pending for reference <strong>{purchaseStatus.reference}</strong>. Complete payment to confirm your ticket.
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid gap-8 lg:gap-12 lg:grid-cols-[1fr_360px] lg:items-start">

        {/* LEFT: Event Details */}
        <div className="space-y-8">
          {/* Back link */}
          <Link href="/attend" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-white border-2 border-[#E91E8C] text-sm font-bold text-[#0D1B2A] hover:bg-[#E91E8C] hover:text-white transition-all shadow-md hover:shadow-lg hover:scale-105 duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Discover
          </Link>

          {/* Quick info chips */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-4">
              <span className="text-[#E91E8C] mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Date</p>
                <p className="text-sm font-semibold text-[#0D1B2A] mt-0.5">{formatEventDate(event.event_date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-4">
              <span className="text-[#E91E8C] mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Time</p>
                <p className="text-sm font-semibold text-[#0D1B2A] mt-0.5">
                  {formatTimeForDisplay(event.event_time)} <span className="text-[#94a3b8] font-normal">{event.timezone}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-4">
              <span className="text-[#E91E8C] mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Venue</p>
                <p className="text-sm font-semibold text-[#0D1B2A] mt-0.5">{event.venue}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {event.latitude && event.longitude ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: "rgba(233,30,140,0.1)", color: "#E91E8C" }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Get Directions
                    </a>
                  ) : event.map_link ? (
                    <a href={event.map_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: "rgba(233,30,140,0.1)", color: "#E91E8C" }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View on Map
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {event.dress_code && (
              <div className="flex items-start gap-3 rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-4">
                <span className="text-[#E91E8C] mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Dress Code</p>
                  <p className="text-sm font-semibold text-[#0D1B2A] mt-0.5">{event.dress_code}</p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile: GET TICKET CTA */}
          <div className="lg:hidden">
            <a
              href="#tickets-section"
              className="flex items-center justify-center gap-2 w-full rounded-xl font-black text-base py-4 shadow-lg transition-all"
              style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)", color: "white", boxShadow: "0 8px 24px rgba(233,30,140,0.35)" }}
            >
              {isFreeEvent ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Save My Spot — FREE
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                  Get Ticket — {cs}{event.ticket_price!.toLocaleString()}
                </>
              )}
            </a>
          </div>

          {/* About */}
          {event.description && (
            <div>
              <h2 className="text-lg font-black text-[#0D1B2A] mb-3">About this event</h2>
              <div className="text-[#475569] text-sm leading-7 space-y-3">
                {event.description.split(/\n{2,}/).map((para: string, i: number) => (
                  <p key={i}>{para.replace(/\n/g, " ")}</p>
                ))}
              </div>
            </div>
          )}

          {/* Lineup */}
          {lineup.length > 0 && (
            <div>
              <h2 className="text-lg font-black text-[#0D1B2A] mb-4">Lineup</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {lineup.map((person: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-black"
                      style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}
                    >
                      {(person.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                        {person.role || "Guest"}
                      </p>
                      <p className="text-sm font-bold text-[#0D1B2A]">{person.name || "To be announced"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* After Party */}
          {event.after_party_enabled && event.after_party_location && (
            <div className="rounded-xl border border-[#fce7f3] bg-[#fff1f8] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#E91E8C]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </span>
                <h3 className="font-black text-[#C4166F] text-sm uppercase tracking-wider">After Party</h3>
              </div>
              <p className="font-semibold text-[#0D1B2A]">{event.after_party_location}</p>
              {event.after_party_time && (
                <p className="text-sm text-[#64748b] mt-1">Starts {formatTimeForDisplay(event.after_party_time)}</p>
              )}
            </div>
          )}

          {/* Share */}
          <div className="pt-2 border-t border-[#e8edf2]">
            <ShareButton title={event.title} url={currentUrl} />
          </div>
        </div>

        {/* RIGHT: Ticket Panel (sticky on desktop) */}
        <div id="tickets-section" className="lg:sticky lg:top-24 space-y-4">
          <div className="rounded-2xl border border-[#e8edf2] overflow-hidden shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
            {/* Panel header */}
            <div
              className="px-6 py-5"
              style={{ background: isFreeEvent ? "linear-gradient(135deg, #064e3b, #065f46)" : "linear-gradient(135deg, #0D1B2A, #1e3a5f)" }}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60 mb-1">
                {isFreeEvent ? "Free Event" : "Tickets"}
              </p>
              {isFreeEvent ? (
                <p className="text-2xl font-black text-white">FREE ENTRY</p>
              ) : (
                <>
                  <p className="text-2xl font-black text-white">
                    {cs}{event.ticket_price!.toLocaleString()}
                    <span className="text-sm font-normal text-white/60 ml-1">per ticket</span>
                  </p>
                  <div className="mt-2 space-y-0.5 text-xs text-white/50">
                    <div className="flex justify-between">
                      <span>Accredit fee (5%)</span>
                      <span className="line-through">-{cs}{Math.round(event.ticket_price! * PLATFORM_FEE_PERCENT / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (2.5%)</span>
                      <span>+{cs}{Math.round(event.ticket_price! * VAT_PERCENT / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white/80 border-t border-white/20 pt-1">
                      <span>Buyer pays</span>
                      <span>{cs}{Math.round(event.ticket_price! * (1 + VAT_PERCENT / 100)).toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
              {event.tickets_available !== null && event.tickets_available !== undefined && (
                <p className="text-xs text-white/55 mt-2 font-medium">
                  {event.tickets_available} {isFreeEvent ? "spots" : "tickets"} remaining
                </p>
              )}
            </div>

            {/* Pass packages */}
            {passPackages.length > 0 && (
              <div className="px-6 py-4 border-b border-[#e8edf2] bg-[#f8f9fc]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mb-3">Ticket Types</p>
                <div className="space-y-2">
                  {passPackages.map((pkg: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-white border border-[#e8edf2] px-4 py-3">
                      <span className="text-sm font-semibold text-[#0D1B2A]">{pkg.name || "Pass"}</span>
                      <span className="text-sm font-black" style={{ color: "#E91E8C" }}>
                        {pkg.price || "Free"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="px-6 py-5">
              {registered ? (
                <div className="text-center py-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(16,185,129,0.12)" }}
                  >
                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-black text-[#0D1B2A] text-lg">You&apos;re registered!</p>
                  <p className="text-sm text-[#64748b] mt-1">Check your email for confirmation. See you there!</p>
                  <div className="mt-4 pt-4 border-t border-[#e8edf2]">
                    <ShareButton title={event.title} url={currentUrl} />
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handlePurchase("paystack"); }} className="space-y-3">
                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] block mb-1.5">
                      Your full name <span className="text-[#E91E8C]">*</span>
                    </label>
                    <input
                      placeholder="Your full name"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] block mb-1.5">
                      Email address <span className="text-[#E91E8C]">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] transition-colors"
                      required
                    />
                  </div>
                  {!isFreeEvent && (
                    <>
                      <input
                        placeholder="Phone number (optional)"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] transition-colors"
                      />
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] block mb-1.5">
                          Quantity
                        </label>
                        <select
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white transition-colors"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>{n} ticket{n > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {!isFreeEvent && event.ticket_price && (
                    <div className="rounded-xl bg-[#f8f9fc] border border-[#e8edf2] px-4 py-3 text-xs space-y-1.5">
                      <div className="flex justify-between text-[#64748b]">
                        <span>{cs}{event.ticket_price.toLocaleString()} × {quantity}</span>
                        <span>{cs}{(event.ticket_price * quantity).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#64748b]">
                        <span>VAT (2.5%)</span>
                        <span>{cs}{Math.round(event.ticket_price * quantity * VAT_PERCENT / 100).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-black text-[#0D1B2A] border-t border-[#e8edf2] pt-1.5">
                        <span>Total</span>
                        <span>{cs}{Math.round(event.ticket_price * quantity * (1 + VAT_PERCENT / 100)).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {event.tickets_available !== null && event.tickets_available <= 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 space-y-3">
                      <p className="font-semibold">Sold out</p>
                      <form onSubmit={async (e) => { e.preventDefault(); const f = e.currentTarget; try { await apiClient("/waitlist/join", { method: "POST", body: { event_id: event.id, name: (f.elements.namedItem("wl_name") as HTMLInputElement).value, email: (f.elements.namedItem("wl_email") as HTMLInputElement).value, phone: (f.elements.namedItem("wl_phone") as HTMLInputElement).value || undefined, quantity } }); alert("You're on the waitlist!"); } catch (err: any) { alert(err.message); } }} className="space-y-2">
                        <input name="wl_name" required placeholder="Your name" className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" />
                        <input name="wl_email" required type="email" placeholder="Your email" className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" />
                        <input name="wl_phone" placeholder="Phone (optional)" className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" />
                        <button type="submit" className="w-full rounded-lg bg-amber-600 text-white py-2 font-bold text-sm hover:bg-amber-700">Join Waitlist</button>
                      </form>
                    </div>
                  )}
                  <div className="space-y-2">
                    <button
                      type="submit"
                      disabled={purchasing}
                      className="w-full rounded-xl font-black text-sm py-3.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: purchasing ? "#94a3b8" : isFreeEvent ? "linear-gradient(135deg, #059669, #065f46)" : "linear-gradient(135deg, #E91E8C, #C4166F)",
                        color: "white",
                        boxShadow: purchasing ? "none" : isFreeEvent ? "0 6px 20px rgba(5,150,105,0.35)" : "0 6px 20px rgba(233,30,140,0.35)",
                      }}
                    >
                      {purchasing
                        ? "Processing..."
                        : isFreeEvent
                        ? "Save My Spot — Free"
                        : `Pay with Card ${cs}${Math.round(event.ticket_price! * quantity * (1 + VAT_PERCENT / 100)).toLocaleString()}`}
                    </button>
                    {!isFreeEvent && walletBalance !== null && (
                      <button
                        type="button"
                        disabled={purchasing || walletBalance < Math.round(event.ticket_price! * quantity * (1 + VAT_PERCENT / 100))}
                        onClick={() => handlePurchase("wallet")}
                        className="w-full rounded-xl font-semibold text-sm py-3 transition-all border-2 border-pink-200 text-pink-700 hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {walletBalance < Math.round(event.ticket_price! * quantity * (1 + VAT_PERCENT / 100))
                          ? `Insufficient wallet (${cs}${walletBalance.toLocaleString()})`
                          : `Pay with Wallet (${cs}${walletBalance.toLocaleString()})`}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Organiser card */}
          <div className="rounded-2xl border border-[#e8edf2] bg-[#f8f9fc] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Organised by</p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}
              >
                {event.host_name[0].toUpperCase()}
              </div>
              <p className="font-bold text-[#0D1B2A] text-sm">{event.host_name}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <ReminderBanner />
    </div>
  );
}

export default function PublicEventPage() {
  return (
    <ErrorBoundary>
      <PublicEventContent />
    </ErrorBoundary>
  );
}
