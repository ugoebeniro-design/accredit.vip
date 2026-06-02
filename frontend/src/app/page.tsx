import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { EventsCarousel } from "@/components/shared/events-carousel";
import { GetStartedGuide } from "@/components/shared/get-started-guide";
import { getHeroBackground, getSpecialDayName } from "@/lib/special-days";

export const metadata = {
  title: "accredit.vip — Premium Event Infrastructure for Africa",
  description:
    "Create events, manage guests, send invitations via WhatsApp/SMS/Email, generate QR codes, and track attendance — all from one premium platform built for Africa.",
};

/* ──────────────────────────────────────────────────────
   STATIC DATA
────────────────────────────────────────────────────── */

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Post Invite",
    desc: "Private invitations for weddings, birthdays, corporate dinners & VIP gatherings. Deliver via WhatsApp, SMS, or Email with personalised QR codes.",
    tag: "Private Events",
    color: "#E91E8C",
    href: "/features/post-invite",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: "Post Event",
    desc: "Publish concerts, conferences, and festivals. Sell tickets, upload flyers, add sponsors, and attract attendees through our discovery marketplace.",
    tag: "Public Events",
    color: "#7C3AED",
    href: "/features/post-event",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 8H3m18-8h-1M4 16H3m15-4a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "QR Accreditation",
    desc: "Generate signed, tamper-proof QR codes for every guest. Staff scan codes at the gate — instant validation, duplicate detection, and live check-in logs.",
    tag: "Check-in Tech",
    color: "#0891B2",
    href: "/features/qr-accreditation",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Guest Management",
    desc: "Upload guest lists via CSV, track RSVP statuses, send reminders, detect duplicates, and view live attendance analytics in your dashboard.",
    tag: "Operations",
    color: "#059669",
    href: "/features/guest-management",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Live Analytics",
    desc: "Real-time delivery reports, RSVP conversion rates, check-in timelines, and channel-by-channel performance — all visualised in your dashboard.",
    tag: "Data & Insights",
    color: "#D97706",
    href: "/features/live-analytics",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI Assistance",
    desc: "AI-powered invite text generation, smart support chatbot, automated guest recommendations, and event flyer generation built right in.",
    tag: "AI-Powered",
    color: "#E91E8C",
    href: "/features/ai-assistance",
  },
];

const statsIconMap = {
  events: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  guests: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M12 14H8.823a4 4 0 00-3.745 6.283M16 14h4.823a4 4 0 013.745 6.283" /></svg>,
  channels: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  uptime: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
};

const stats = [
  { value: "10k+",  label: "Events Created",  iconKey: "events" },
  { value: "500k+", label: "Guests Managed",  iconKey: "guests" },
  { value: "3",     label: "Delivery Channels", iconKey: "channels" },
  { value: "99.9%", label: "Uptime",           iconKey: "uptime" },
];

const howItWorks = [
  {
    step: "01",
    title: "Create Your Event",
    desc: "Set up your event in minutes — add your guest list, pick delivery channels, configure QR preferences, and apply your branding.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Send Invitations",
    desc: "Guests receive personalised invitations via WhatsApp, SMS, or Email with their unique QR code — delivered in seconds.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Scan & Check In",
    desc: "Your team scans QR codes at the gate. Real-time attendance logs sync instantly to your dashboard — no paper, no chaos.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const testimonials = [
  {
    quote: "accredit.vip transformed how we manage our annual conference. The QR check-in alone saved us 3 hours of manual work at the gate.",
    name: "Adaeze Obi",
    role: "Event Director, Lagos Business Summit",
    avatar: "AO",
    color: "#E91E8C",
  },
  {
    quote: "We sent 800 WhatsApp invitations and had a 96% delivery rate. Guests loved their personalised QR codes — it felt premium.",
    name: "Kofi Mensah",
    role: "Wedding Planner, Accra",
    avatar: "KM",
    color: "#7C3AED",
  },
  {
    quote: "Best investment for our concert series. The live analytics helped us understand our audience in ways we never could before.",
    name: "Temi Adeyemi",
    role: "Concert Promoter, Abuja",
    avatar: "TA",
    color: "#0891B2",
  },
];

/* Fixed 8×8 QR-like pattern — deterministic, no Math.random */
const QR_PATTERN = [
  1,1,1,0,1,0,1,1,
  1,0,1,0,0,1,0,1,
  1,0,1,1,1,0,1,0,
  0,0,0,1,0,0,1,1,
  1,1,0,0,1,1,0,1,
  0,1,1,1,0,1,0,0,
  1,0,0,1,1,0,1,1,
  1,1,1,0,0,1,0,0,
];

/* ──────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar variant="solid" />

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section
        className="hero-animated-bg relative overflow-hidden"
        style={{
          backgroundImage: getHeroBackground(),
          backgroundColor: "#07101d",
          backgroundSize: "cover",
          backgroundPosition: "center 62%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="event-scene-layer" aria-hidden="true" />

        {/* Pink ambient orb */}
        <div style={{ position: "absolute", top: "10%", right: "5%", width: 640, height: 640, background: "radial-gradient(circle, rgba(233,30,140,0.18) 0%, transparent 65%)", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "3%", width: 480, height: 480, background: "radial-gradient(circle, rgba(79,112,220,0.12) 0%, transparent 65%)", filter: "blur(90px)", pointerEvents: "none" }} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 78% 34%, rgba(233,30,140,0.28) 0%, transparent 26%), linear-gradient(180deg, transparent 58%, rgba(5,10,20,0.82) 100%)",
            pointerEvents: "none",
          }}
        />

        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }} aria-hidden="true">
          <div
            className="motion-breathe absolute hidden sm:block"
            style={{
              right: "1%",
              top: "8%",
              width: "min(46vw, 650px)",
              height: "min(46vw, 650px)",
              border: "34px solid rgba(233,30,140,0.56)",
              borderLeftColor: "rgba(233,30,140,0.22)",
              borderBottomColor: "rgba(255,255,255,0.16)",
              borderRadius: "48% 52% 50% 50%",
              transform: "rotate(-19deg)",
              filter: "drop-shadow(0 0 34px rgba(233,30,140,0.42))",
              opacity: 0.82,
            }}
          />

          <div
            className="motion-float-card absolute hidden sm:block"
            style={{
              right: "clamp(14px, 8vw, 120px)",
              top: "clamp(92px, 16vh, 170px)",
              width: "clamp(166px, 26vw, 280px)",
              borderRadius: 26,
              padding: "18px 16px",
              background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(246,248,252,0.86))",
              boxShadow: "0 42px 120px rgba(0,0,0,0.48)",
              transform: "rotate(7deg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#0D1B2A", fontSize: 10, fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase" }}>
                VIP Access
              </span>
              <span style={{ color: "#16a34a", fontSize: 10, fontWeight: 900 }}>Verified</span>
            </div>
            <div className="qr-scan-surface" style={{ background: "#0D1B2A", borderRadius: 18, padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3, aspectRatio: "1" }}>
                {QR_PATTERN.map((cell, i) => (
                  <div key={i} style={{ background: cell ? "white" : "#0D1B2A", borderRadius: 2 }} />
                ))}
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <p style={{ color: "#0D1B2A", fontSize: 14, fontWeight: 900, lineHeight: 1.1 }}>Lagos Gala Night</p>
              <p style={{ color: "#61708a", fontSize: 11, marginTop: 4 }}>Gate A - Table 12</p>
            </div>
          </div>

          <div
            className="motion-float-card-alt absolute hidden md:block"
            style={{
              right: "clamp(280px, 34vw, 520px)",
              top: "clamp(310px, 48vh, 430px)",
              width: 250,
              borderRadius: 22,
              padding: "16px 18px",
              background: "rgba(13,27,42,0.82)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.36)",
              transform: "rotate(-5deg)",
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.48)", fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Live Gate Desk
            </p>
            {[
              { label: "Invites sent", value: "1,240" },
              { label: "RSVP yes", value: "892" },
              { label: "Checked in", value: "427" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.66)", fontSize: 12, fontWeight: 700 }}>{item.label}</span>
                <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 900 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div
            className="motion-float-card absolute hidden lg:flex"
            style={{
              right: "6%",
              bottom: "12%",
              alignItems: "center",
              gap: 12,
              borderRadius: 20,
              padding: "13px 16px",
              background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(13,27,42,0.74))",
              border: "1px solid rgba(74,222,128,0.34)",
              backdropFilter: "blur(20px)",
            }}
          >
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(74,222,128,0.2)", color: "#4ade80", display: "grid", placeItems: "center", fontWeight: 900 }}>
              ok
            </span>
            <div>
              <p style={{ color: "white", fontSize: 13, fontWeight: 900 }}>QR scan accepted</p>
              <p style={{ color: "rgba(255,255,255,0.46)", fontSize: 11 }}>Duplicate check passed</p>
            </div>
          </div>
        </div>

        {/* ── Two-column content ── */}
        <div
          className="relative flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-20 pb-12"
          style={{ zIndex: 10 }}
        >
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 lg:items-center lg:min-h-[80vh]">

            {/* ── LEFT: Text column ── */}
            <div className="flex flex-col items-start justify-center">
              {getSpecialDayName() && (
                <div
                  className="motion-rise inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
                  style={{
                    border: "1px solid rgba(255,215,0,0.4)",
                    background: "rgba(255,215,0,0.08)",
                    color: "#FFD700",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  ✨ Celebrating {getSpecialDayName()}! ✨
                </div>
              )}

              {/* Tag pill */}
              <div
                className="motion-rise inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-9"
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.82)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#E91E8C",
                    boxShadow: "0 0 8px rgba(233,30,140,0.9)",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                />
                Premium Event Infrastructure &middot; Africa
              </div>

              {/* Main heading */}
              <h1
                className="motion-rise motion-delay-1 text-left text-4xl sm:text-6xl lg:text-6xl xl:text-[68px] font-extrabold leading-[1.05] tracking-tight"
                style={{ color: "#ffffff" }}
              >
                Create premium invites,{" "}
                <br className="hidden sm:block" />
                control entry,{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #E91E8C 0%, #ff6dbd 55%, #C4166F 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  scan every guest.
                </span>
              </h1>

              {/* Subtitle */}
              <p
                className="motion-rise motion-delay-2 mt-7 text-left text-base sm:text-lg leading-relaxed max-w-xl"
                style={{ color: "rgba(255,255,255,0.68)" }}
              >
                Send branded invitations by WhatsApp, SMS, or Email, give every
                guest a unique QR pass, and run check-in from one live dashboard.
              </p>

              {/* CTA buttons */}
              <div className="motion-rise motion-delay-3 mt-10 flex flex-wrap items-start gap-4">
                <Link
                  href="/create-event"
                  className="btn-primary rounded-xl px-10 py-4 text-base font-black"
                  style={{ letterSpacing: "0.04em" }}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  CREATE EVENT
                </Link>
                <Link
                  href="/attend"
                  className="btn-secondary rounded-xl px-10 py-4 text-base font-black"
                  style={{ letterSpacing: "0.04em" }}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  DISCOVER EVENTS
                </Link>
              </div>

              {/* Trust badges */}
              <div className="motion-rise motion-delay-4 mt-7 flex flex-wrap items-center gap-5">
                {[
                  { icon: "ok", text: "RSVP and QR in one flow" },
                  { icon: "01", text: "Gate scans in real time" },
                  { icon: "id", text: "Guest list stays private" },
                ].map((b) => (
                  <div
                    key={b.text}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "rgba(255,255,255,0.42)" }}
                  >
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>{b.icon}</span>
                    {b.text}
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="motion-rise motion-delay-5 mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-lg mb-1 text-white">{statsIconMap[s.iconKey as keyof typeof statsIconMap]}</div>
                    <p className="text-2xl font-extrabold text-white" style={{ letterSpacing: "-0.03em" }}>{s.value}</p>
                    <p className="mt-0.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Product visual ── */}
            <div className="motion-pop motion-delay-4 relative hidden lg:block" style={{ height: 620 }}>

              {/* Glow behind main card */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 380, height: 380,
                background: "radial-gradient(circle, rgba(233,30,140,0.28) 0%, transparent 65%)",
                filter: "blur(70px)",
                pointerEvents: "none",
              }} />

              {/* ─ MAIN: Invitation card ─ */}
              <div
                style={{
                  position: "absolute",
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "linear-gradient(145deg, #E91E8C 0%, #C4166F 100%)",
                  borderRadius: 28,
                  padding: "28px 26px",
                  width: 290,
                  boxShadow: "0 50px 140px rgba(233,30,140,0.55), 0 20px 60px rgba(0,0,0,0.45)",
                  zIndex: 3,
                  animation: "float 5s ease-in-out infinite",
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Your Invitation
                  </span>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: "rgba(255,255,255,0.2)", color: "white",
                    fontSize: 9.5, fontWeight: 800, padding: "3px 10px", borderRadius: 99,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                    Delivered
                  </span>
                </div>

                {/* Large QR code — the star of the show */}
                <div className="qr-scan-surface" style={{ background: "white", borderRadius: 14, padding: 13, marginBottom: 18, width: "100%" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3, width: "100%", aspectRatio: "1" }}>
                    {QR_PATTERN.map((cell, i) => (
                      <div key={i} style={{ background: cell ? "#0D1B2A" : "white", borderRadius: 2 }} />
                    ))}
                  </div>
                </div>

                {/* Event details */}
                <p style={{ color: "white", fontWeight: 800, fontSize: 15, marginBottom: 4, letterSpacing: "-0.01em" }}>
                  Victoria&apos;s Birthday
                </p>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>Sat, 21 Jun &middot; 7:00 PM</p>
                <p style={{ color: "rgba(255,255,255,0.52)", fontSize: 11, marginTop: 2 }}>The Wheatbaker, Ikoyi</p>

                <div style={{
                  marginTop: 16, paddingTop: 13,
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 10.5, fontWeight: 600 }}>QR Code Included</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.48)", fontSize: 10 }}>
                    <svg style={{ width: 11, height: 11 }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    via WhatsApp
                  </span>
                </div>
              </div>

              {/* ─ FLOATING: Scan confirmed — top right ─ */}
              <div style={{
                position: "absolute", top: "6%", right: "2%",
                background: "linear-gradient(135deg, #0f1e32, #162033)",
                border: "1px solid rgba(74,222,128,0.32)",
                borderRadius: 16,
                padding: "11px 16px",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 10px 34px rgba(0,0,0,0.35)",
                zIndex: 5,
                animation: "float 4s ease-in-out infinite 0.6s",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "rgba(74,222,128,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ color: "#4ade80", fontSize: 17, fontWeight: 900 }}>✓</span>
                </div>
                <div>
                  <p style={{ color: "white", fontSize: 12, fontWeight: 800, marginBottom: 2 }}>Scan Confirmed</p>
                  <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 10 }}>QR verified &middot; Gate 1</p>
                </div>
              </div>

              {/* ─ FLOATING: Live check-ins — bottom left ─ */}
              <div style={{
                position: "absolute", bottom: "5%", left: "0%",
                background: "rgba(255,255,255,0.055)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18,
                padding: "16px 18px",
                minWidth: 210,
                zIndex: 4,
                animation: "float 5.5s ease-in-out infinite 1.1s",
              }}>
                <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                  Live Check-ins
                </p>
                {[
                  { name: "Adaeze N.", init: "AN", in: true  },
                  { name: "Kofi M.",   init: "KM", in: true  },
                  { name: "Temi A.",   init: "TA", in: false },
                  { name: "Bisi O.",   init: "BO", in: true  },
                ].map((g) => (
                  <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 27, height: 27, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,#E91E8C,#C4166F)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: "white", fontSize: 9, fontWeight: 800 }}>{g.init}</span>
                    </div>
                    <span style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600 }}>{g.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: g.in ? "#4ade80" : "rgba(255,255,255,0.25)" }}>
                      {g.in ? "✓" : "○"}
                    </span>
                  </div>
                ))}
                <div style={{
                  marginTop: 10, paddingTop: 8,
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.28)", fontSize: 10,
                }}>
                  247 / 300 checked in
                </div>
              </div>

              {/* ─ FLOATING: Invites sent — top left ─ */}
              <div style={{
                position: "absolute", top: "18%", left: "0%",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.28)",
                borderRadius: 14,
                padding: "9px 14px",
                display: "flex", alignItems: "center", gap: 9,
                zIndex: 5,
                animation: "float 3.8s ease-in-out infinite 0.9s",
              }}>
                <span style={{ fontSize: 18 }}>📱</span>
                <div>
                  <p style={{ color: "white", fontSize: 11.5, fontWeight: 700, marginBottom: 1 }}>800 Invites Sent</p>
                  <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 10 }}>98% delivered &middot; WhatsApp</p>
                </div>
              </div>

              {/* ─ FLOATING: Delivery rates — bottom right ─ */}
              <div style={{
                position: "absolute", bottom: "18%", right: "0%",
                background: "rgba(255,255,255,0.055)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "14px 16px",
                minWidth: 175,
                zIndex: 4,
                animation: "float 6s ease-in-out infinite 0.4s",
              }}>
                <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                  Delivery Rates
                </p>
                {[
                  { label: "WhatsApp", pct: 98, color: "#22c55e" },
                  { label: "SMS",      pct: 94, color: "#0891B2" },
                  { label: "Email",    pct: 87, color: "#E91E8C" },
                ].map((s) => (
                  <div key={s.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10.5 }}>{s.label}</span>
                      <span style={{ color: s.color, fontSize: 10.5, fontWeight: 800 }}>{s.pct}%</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 4 }}>
                      <div style={{ background: s.color, height: 4, width: `${s.pct}%`, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile product preview — shown only on small screens */}
        <div className="lg:hidden relative mx-4 mb-10 mt-2" style={{ zIndex: 10, minHeight: 460 }}>
          {/* Glow behind */}
          <div style={{
            position: "absolute", top: "42%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 260, height: 260,
            background: "radial-gradient(circle, rgba(233,30,140,0.22) 0%, transparent 65%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }} />
          {/* Floating: Invites sent — top left */}
          <div style={{
            position: "absolute", top: "0%", left: "2%",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.28)",
            borderRadius: 12, padding: "7px 12px",
            display: "flex", alignItems: "center", gap: 7,
            zIndex: 5,
            animation: "float 3.8s ease-in-out infinite 0.9s",
          }}>
            <span style={{ fontSize: 16 }}>📱</span>
            <div>
              <p style={{ color: "white", fontSize: 10, fontWeight: 700 }}>800 Invites Sent</p>
              <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 9 }}>98% delivered</p>
            </div>
          </div>
          {/* Floating: Scan confirmed — top right */}
          <div style={{
            position: "absolute", top: "6%", right: "2%",
            background: "linear-gradient(135deg, #0f1e32, #162033)",
            border: "1px solid rgba(74,222,128,0.32)",
            borderRadius: 14, padding: "9px 13px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            zIndex: 5,
            animation: "float 4s ease-in-out infinite 0.6s",
          }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 900 }}>✓</span>
            </div>
            <div>
              <p style={{ color: "white", fontSize: 10.5, fontWeight: 800 }}>Scan Confirmed</p>
              <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 9 }}>QR verified</p>
            </div>
          </div>
          {/* Main invitation card */}
          <div style={{
            background: "linear-gradient(145deg, #E91E8C 0%, #C4166F 100%)",
            borderRadius: 22, padding: "22px 20px",
            boxShadow: "0 30px 80px rgba(233,30,140,0.5)",
            maxWidth: 300, margin: "60px auto 0",
            position: "relative", zIndex: 3,
            animation: "float 5s ease-in-out infinite",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Your Invitation</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", color: "white", fontSize: 9.5, fontWeight: 800, padding: "2px 9px", borderRadius: 99 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                Delivered
              </span>
            </div>
            <div className="qr-scan-surface" style={{ background: "white", borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2.5, aspectRatio: "1" }}>
                {QR_PATTERN.map((cell, i) => (
                  <div key={i} style={{ background: cell ? "#0D1B2A" : "white", borderRadius: 2 }} />
                ))}
              </div>
            </div>
            <p style={{ color: "white", fontWeight: 800, fontSize: 15 }}>Victoria&apos;s Birthday</p>
            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 3 }}>Sat, 21 Jun &middot; 7:00 PM &middot; The Wheatbaker</p>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.2)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 10.5, fontWeight: 600 }}>QR Code Included</span>
              <span style={{ color: "rgba(255,255,255,0.42)", fontSize: 10 }}>via WhatsApp</span>
            </div>
          </div>
          {/* Floating: Live check-ins — bottom left */}
          <div style={{
            position: "absolute", bottom: "2%", left: "0%",
            background: "rgba(255,255,255,0.055)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14, padding: "12px 14px",
            minWidth: 170,
            zIndex: 4,
            animation: "float 5.5s ease-in-out infinite 1.1s",
          }}>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 8.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Live Check-ins</p>
            {[
              { name: "Adaeze N.", init: "AN", in_: true },
              { name: "Kofi M.", init: "KM", in_: true },
              { name: "Temi A.", init: "TA", in_: false },
            ].map((g) => (
              <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#E91E8C,#C4166F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontSize: 7.5, fontWeight: 800 }}>{g.init}</span>
                </div>
                <span style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 600 }}>{g.name}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: g.in_ ? "#4ade80" : "rgba(255,255,255,0.25)" }}>{g.in_ ? "✓" : "○"}</span>
              </div>
            ))}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.28)", fontSize: 9 }}>247 / 300 checked in</div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SOCIAL PROOF STRIP
      ════════════════════════════════════════ */}
      <section className="py-9 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10.5px] font-extrabold uppercase tracking-[0.18em] mb-5" style={{ color: "#c8d3e0" }}>
            Trusted by event professionals across Africa
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              "Lagos Business Summit",
              "Accra Fashion Week",
              "Nairobi Tech Conf.",
              "Abuja Music Fest",
              "Cape Town Pride",
              "Kigali Innovation",
            ].map((org) => (
              <div
                key={org}
                className="px-5 py-2 rounded-full text-xs font-semibold"
                style={{ background: "#f4f6fb", border: "1px solid #e4e9f2", color: "#6b7fa0" }}
              >
                {org}
              </div>
            ))}
          </div>
        </div>
      </section>

      <EventsCarousel />

      {/* ════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════ */}
      <section className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge-pink mb-5">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Everything you need
            </div>
            <h2
              className="text-4xl sm:text-5xl font-extrabold"
              style={{ color: "#0D1B2A", letterSpacing: "-0.03em" }}
            >
              One platform.{" "}
              <span style={{ color: "#E91E8C" }}>Every event.</span>
            </h2>
            <p className="mt-5 text-lg max-w-2xl mx-auto" style={{ color: "#6b7280" }}>
              From intimate weddings to large-scale concerts — accredit.vip
              handles the full lifecycle of your event with precision.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Link key={f.title} href={f.href} className="feature-card group block no-underline">
                <div
                  className="rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 feature-icon"
                  style={{ width: 52, height: 52, background: `${f.color}14`, color: f.color }}
                >
                  {f.icon}
                </div>
                <span
                  className="text-[10.5px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: `${f.color}12`, color: f.color }}
                >
                  {f.tag}
                </span>
                <h3 className="text-lg font-bold mt-4 mb-2" style={{ color: "#0D1B2A" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{f.desc}</p>
                <div
                  className="mt-5 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: f.color }}
                >
                  Learn more
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════ */}
      <section className="py-28" style={{ background: "linear-gradient(180deg,#f6f8fc 0%,#eef1f8 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge-navy mb-5">How it works</div>
            <h2
              className="text-4xl sm:text-5xl font-extrabold"
              style={{ color: "#0D1B2A", letterSpacing: "-0.03em" }}
            >
              Up &amp; running{" "}
              <span style={{ color: "#E91E8C" }}>in minutes</span>
            </h2>
            <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: "#6b7280" }}>
              Three simple steps to your first professionally accredited event.
            </p>
          </div>

          <div className="grid gap-10 md:grid-cols-3 relative">
            {/* Connector */}
            <div
              className="hidden md:block absolute top-14 left-[22%] right-[22%] h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(233,30,140,0.35) 30%, rgba(233,30,140,0.35) 70%, transparent)",
              }}
            />

            {howItWorks.map((step, i) => (
              <div key={step.step} className="text-center group">
                <div
                  className="w-28 h-28 rounded-3xl mx-auto flex flex-col items-center justify-center mb-7 transition-transform duration-300 group-hover:-translate-y-2 how-it-works-icon"
                  style={{
                    background:
                      i === 1
                        ? "linear-gradient(135deg, #E91E8C 0%, #C4166F 100%)"
                        : "#0D1B2A",
                    boxShadow:
                      i === 1
                        ? "0 16px 44px rgba(233,30,140,0.42)"
                        : "0 12px 36px rgba(13,27,42,0.28)",
                  }}
                >
                  <div className="text-white">{step.icon}</div>
                  <span
                    className="text-[11px] font-black tracking-widest mt-1"
                    style={{ color: i === 1 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)" }}
                  >
                    {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#0D1B2A" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: "#6b7280" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          DELIVERY CHANNELS
      ════════════════════════════════════════ */}
      <section className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left text */}
            <div>
              <div className="badge-pink mb-4">Multi-channel delivery</div>
              <h2
                className="text-4xl sm:text-5xl font-extrabold mt-4"
                style={{ color: "#0D1B2A", letterSpacing: "-0.03em" }}
              >
                Reach your guests{" "}
                <span style={{ color: "#E91E8C" }}>where they are</span>
              </h2>
              <p className="mt-5 text-lg leading-relaxed" style={{ color: "#6b7280" }}>
                Send invitations through the channels your guests actually use —
                WhatsApp, SMS, and Email — all in a single click.
              </p>

              <ul className="mt-10 space-y-5">
                {[
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    ),
                    label: "WhatsApp",
                    desc: "Highest open rates across Africa — up to 98% delivery",
                    color: "#22c55e",
                  },
                  {
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 18h.01M16 18h.01M7 12h1m5 0h1m5 0h1M7 9h1m5 0h1m5 0h1M7 6h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>,
                    label: "SMS",
                    desc: "Reliable delivery even without internet access",
                    color: "#0891B2"
                  },
                  {
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                    label: "Email",
                    desc: "Rich HTML formatting with branding &amp; attachments",
                    color: "#E91E8C"
                  },
                ].map((ch) => (
                  <li key={ch.label} className="flex items-center gap-4 group">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110 delivery-icon"
                      style={{ background: `${ch.color}15` }}
                    >
                      {ch.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#0D1B2A" }}>{ch.label}</p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#9ca3af" }}
                        dangerouslySetInnerHTML={{ __html: ch.desc }}
                      />
                    </div>
                    <div className="ml-auto w-2 h-2 rounded-full" style={{ background: ch.color }} />
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <Link href="/create-event" className="btn-primary px-8 py-3.5 rounded-xl">
                  CREATE EVENT
                </Link>
              </div>
            </div>

            {/* Right — card stack visual */}
            <div className="relative flex items-center justify-center h-[340px]">
              {/* Shadow cards */}
              <div
                className="absolute w-72 h-44 rounded-3xl"
                style={{
                  background: "linear-gradient(135deg, #0D1B2A, #1a2e45)",
                  transform: "rotate(8deg) translateY(12px)",
                  opacity: 0.35,
                  top: "12%", left: "12%",
                }}
              />
              <div
                className="absolute w-72 h-44 rounded-3xl"
                style={{
                  background: "linear-gradient(135deg, #162033, #1e3555)",
                  transform: "rotate(-4deg) translateY(6px)",
                  opacity: 0.6,
                  top: "16%", left: "16%",
                }}
              />
              {/* Main card */}
              <div
                className="relative w-80 h-48 rounded-3xl p-6 flex flex-col justify-between"
                style={{
                  background: "linear-gradient(145deg, #E91E8C 0%, #C4166F 100%)",
                  boxShadow: "0 28px 72px rgba(233,30,140,0.48)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.82)" }}>
                    Your Invitation
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
                    Delivered
                  </span>
                </div>
                <div>
                  <p className="text-white font-extrabold text-xl tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                    Sarah &amp; James Wedding
                  </p>
                  <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.74)" }}>
                    Saturday, 14 June &middot; 4:00 PM
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.58)" }}>
                    Eko Hotels &amp; Suites, Lagos
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.18)" }}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 8H3m18-8h-1M4 16H3m15-4a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.86)" }}>
                      QR Code Included
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.52)" }}>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    via WhatsApp
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════ */}
      <section className="py-28" style={{ background: "linear-gradient(180deg,#f6f8fc 0%,#eef1f8 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge-pink mb-5">Loved by event professionals</div>
            <h2
              className="text-4xl sm:text-5xl font-extrabold"
              style={{ color: "#0D1B2A", letterSpacing: "-0.03em" }}
            >
              Trusted across Africa
            </h2>
            {/* Star rating row */}
            <div className="flex items-center justify-center gap-1 mt-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5" fill="#E91E8C" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-2 text-sm font-bold" style={{ color: "#0D1B2A" }}>4.9</span>
              <span className="text-sm" style={{ color: "#9ca3af" }}>&nbsp;/ 5.0 &middot; 200+ reviews</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-3xl p-8 flex flex-col gap-5 hover:-translate-y-1 transition-transform duration-300"
                style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 28px rgba(0,0,0,0.06)" }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="#E91E8C" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#374151" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div
                  className="flex items-center gap-3 pt-4"
                  style={{ borderTop: "1px solid rgba(0,0,0,0.055)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#0D1B2A" }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRICING CTA
      ════════════════════════════════════════ */}
      <section
        className="py-28 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #080f1c 0%, #0D1B2A 30%, #14243b 60%, #0a1220 100%)" }}
      >
        {/* Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute"
            style={{
              top: "-5%", left: "30%",
              width: 420, height: 420,
              background: "radial-gradient(circle, rgba(233,30,140,0.2) 0%, transparent 65%)",
              filter: "blur(70px)",
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: 0, right: "20%",
              width: 320, height: 320,
              background: "radial-gradient(circle, rgba(79,112,220,0.14) 0%, transparent 65%)",
              filter: "blur(70px)",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center" style={{ zIndex: 10 }}>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8"
            style={{
              border: "1px solid rgba(233,30,140,0.32)",
              background: "rgba(233,30,140,0.09)",
              color: "#E91E8C",
            }}
          >
            Pricing
          </div>

          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Simple channel pricing.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #E91E8C 0%, #ff6dbd 60%, #C4166F 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              No packages.
            </span>
          </h2>

          <p className="text-lg mt-6 mb-12 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.62)" }}>
            Every option covers 1-100 guests and includes QR codes. Pick the delivery
            channel your guests will actually respond to.
          </p>

          {/* Channel pricing */}
          <div className="grid gap-6 lg:grid-cols-3 mb-12 text-left">
            {[
              {
                name: "Email",
                tagline: "For branded formal invitations",
                price: "₦100k",
                period: "per 1-100 guests",
                features: ["1-100 guests", "Email delivery", "QR code included", "RSVP tracking", "Invite preview", "Delivery report"],
                highlight: false,
                badge: null,
              },
              {
                name: "WhatsApp",
                tagline: "Best for fast guest response",
                price: "₦200k",
                period: "per 1-100 guests",
                features: ["1-100 guests", "WhatsApp delivery", "QR code included", "RSVP tracking", "Reminder-ready flow", "Delivery report"],
                highlight: true,
                badge: "Popular",
              },
              {
                name: "SMS",
                tagline: "For reach without internet",
                price: "₦300k",
                period: "per 1-100 guests",
                features: ["1-100 guests", "SMS delivery", "QR code included", "RSVP tracking", "Short guest message", "Delivery report"],
                highlight: false,
                badge: null,
              },
            ].map((plan) => (
              <article
                key={plan.name}
                className="relative flex min-h-[542px] flex-col overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-1"
                style={{
                  background: plan.highlight ? "#101c2c" : "white",
                  border: plan.highlight ? "1px solid rgba(233,30,140,0.55)" : "1px solid #e2e8f0",
                  boxShadow: plan.highlight
                    ? "0 18px 48px rgba(0,0,0,0.3)"
                    : "0 12px 32px rgba(0,0,0,0.18)",
                }}
              >
                {plan.badge && (
                  <div className="absolute left-0 right-0 top-0">
                    <div
                      className="mx-auto w-fit min-w-36 rounded-b-xl px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-white"
                      style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}
                    >
                      {plan.badge}
                    </div>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-8 pt-12">
                  <h3 className="mb-1 text-xl font-extrabold" style={{ color: plan.highlight ? "white" : "#07182f" }}>
                    {plan.name}
                  </h3>
                  <p className="mb-7 text-sm" style={{ color: plan.highlight ? "rgba(255,255,255,0.58)" : "#94a3b8" }}>
                    {plan.tagline}
                  </p>
                  <div className="mb-8 flex flex-wrap items-end gap-x-2 gap-y-1">
                    <span className="text-4xl font-black tracking-tight" style={{ color: plan.highlight ? "white" : "#07182f" }}>
                      {plan.price}
                    </span>
                    <span className="pb-1 text-sm" style={{ color: plan.highlight ? "rgba(255,255,255,0.45)" : "#94a3b8" }}>
                      {plan.period}
                    </span>
                  </div>
                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <span
                          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ background: plan.highlight ? "rgba(233,30,140,0.28)" : "rgba(233,30,140,0.16)" }}
                        >
                          <svg className="h-2.5 w-2.5 text-[#E91E8C]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-sm" style={{ color: plan.highlight ? "rgba(255,255,255,0.88)" : "#23466f" }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing" className="btn-primary px-9 py-4 rounded-xl text-base">
              View Channel Pricing
            </Link>
            <Link href="/create-event" className="btn-secondary px-9 py-4 rounded-xl text-base">
              Test Create Event
            </Link>
          </div>
        </div>
      </section>

      <GetStartedGuide />
      <Footer />
    </div>
  );
}
