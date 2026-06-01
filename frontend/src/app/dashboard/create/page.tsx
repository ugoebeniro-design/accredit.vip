"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { createEvent } from "@/lib/api/events";
import { apiClient } from "@/lib/api-client";
import { GoBack } from "@/components/shared/go-back";
import { VenueInput } from "@/components/shared/venue-input";
import {
  cleanLineup,
  cleanPassPackages,
  lineupRoleOptions,
  parseTimeInputTo24Hour,
  timeOptions,
  timezoneOptions,
  type LineupPerson,
  type PassPackage,
} from "@/lib/event-form-options";

type ParsedFlier = {
  title?: string | null;
  host_name?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  venue?: string | null;
  dress_code?: string | null;
  ticket_price?: number | null;
  pass_packages?: { name: string; price: string }[] | null;
  lineup?: { role: string; name: string }[] | null;
  description?: string | null;
  category?: string | null;
  after_party_location?: string | null;
  after_party_time?: string | null;
};

export default function CreateEventPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"invite" | "event" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [flierParsing, setFlierParsing] = useState(false);
  const [flierPreview, setFlierPreview] = useState<string | null>(null);
  const [flierParseError, setFlierParseError] = useState("");
  const [flierParsed, setFlierParsed] = useState(false);
  const flierInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const [form, setForm] = useState({
    title: "",
    event_type: "concert",
    host_name: "",
    event_date: "",
    event_time: "",
    timezone: "WAT",
    venue: "",
    guest_count_range: "1-100",
    description: "",
    dress_code: "",
    map_link: "",
    ticket_price: "",
    tickets_available: "",
    after_party_enabled: false,
    after_party_location: "",
    after_party_time: "",
  });
  const [passPackages, setPassPackages] = useState<PassPackage[]>([
    { name: "Regular", price: "", quantity: "" },
    { name: "VIP", price: "", quantity: "" },
  ]);
  const [lineup, setLineup] = useState<LineupPerson[]>([
    { role: "Keynote Speaker", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false },
  ]);

  const updatePassPackage = (index: number, next: Partial<PassPackage>) =>
    setPassPackages((cur) => cur.map((item, i) => (i === index ? { ...item, ...next } : item)));

  const updateLineup = (index: number, next: Partial<LineupPerson>) =>
    setLineup((cur) => cur.map((item, i) => (i === index ? { ...item, ...next } : item)));

  const handleFlierUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFlierParseError("");
    setFlierParsed(false);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setFlierPreview(dataUrl);
      setFlierParsing(true);
      try {
        const result = await apiClient<ParsedFlier>("/ai/parse-flier", {
          method: "POST",
          body: { image_data: dataUrl, mime_type: file.type },
        });

        setForm((prev) => ({
          ...prev,
          title: result.title || prev.title,
          host_name: result.host_name || prev.host_name,
          event_date: result.event_date || prev.event_date,
          event_time: result.event_time || prev.event_time,
          venue: result.venue || prev.venue,
          dress_code: result.dress_code || prev.dress_code,
          ticket_price: result.ticket_price ? String(result.ticket_price) : prev.ticket_price,
          description: result.description || prev.description,
          event_type: result.category || prev.event_type,
          after_party_enabled: !!(result.after_party_location) || prev.after_party_enabled,
          after_party_location: result.after_party_location || prev.after_party_location,
          after_party_time: result.after_party_time || prev.after_party_time,
        }));

        if (result.lineup?.length) {
          setLineup(result.lineup.map((p) => ({
            role: p.role || "",
            name: p.name || "",
            attachHeadshot: false,
            headshotSource: "upload" as const,
            headshotFileName: "",
            generatedHeadshot: false,
          })));
        }

        if (result.pass_packages?.length) {
          setPassPackages(result.pass_packages.map((p) => ({
            name: p.name || "",
            price: p.price || "",
            quantity: "",
          })));
        }

        setFlierParsed(true);
        if (!mode) setMode("event");
      } catch {
        setFlierParseError("Could not read your flier. Fill in the details below manually.");
        if (!mode) setMode("event");
      } finally {
        setFlierParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createEvent({
        ...form,
        timezone: form.timezone || "WAT",
        event_time: parseTimeInputTo24Hour(form.event_time),
        after_party_time: form.after_party_time ? parseTimeInputTo24Hour(form.after_party_time) : "",
        is_public: mode === "event",
        category: mode === "event" ? form.event_type : undefined,
        ticket_price: form.ticket_price ? Number(form.ticket_price) : undefined,
        tickets_available: form.tickets_available ? Number(form.tickets_available) : undefined,
        pass_packages: mode === "event" ? cleanPassPackages(passPackages) : undefined,
        lineup: mode === "event" ? cleanLineup(lineup) : undefined,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  if (!mode) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="border-b border-[#e8edf2]">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Link href="/" className="text-xl font-black tracking-tight text-[#0D1B2A]">
              Accredit<span style={{ color: "#E91E8C" }}>.vip</span>
            </Link>
          </div>
        </header>
        <div className="flex-1 container mx-auto px-4 py-8 sm:py-16">
          <div className="mb-6"><GoBack fallback="/dashboard" /></div>
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-black text-[#0D1B2A]">Create an Event</h1>
            <p className="mt-2 text-[#64748b]">Choose how you want to start</p>

            {/* Flier upload shortcut */}
            <div className="mt-8 rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-[#f8f9fc] p-6 text-center">
              {flierParsing ? (
                <div className="py-4">
                  <div className="w-8 h-8 rounded-full border-2 border-[#E91E8C] border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#0D1B2A]">AI is reading your flier…</p>
                  <p className="text-xs text-[#94a3b8] mt-1">Extracting title, date, lineup, tickets and more</p>
                </div>
              ) : flierPreview ? (
                <div>
                  <img src={flierPreview} alt="Uploaded flier" className="max-h-40 mx-auto rounded-xl object-cover mb-3 shadow-md" />
                  {flierParsed ? (
                    <p className="text-sm font-semibold text-emerald-600">
                      Flier parsed — form pre-filled below. Review and adjust.
                    </p>
                  ) : (
                    <p className="text-sm text-[#94a3b8]">{flierParseError || "Processing…"}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#fff1f8] flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" style={{ color: "#E91E8C" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-[#0D1B2A]">Already have a flier?</p>
                  <p className="text-xs text-[#94a3b8] mt-1 mb-4">
                    Upload it and our AI will extract the event details and fill the form for you automatically
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Flier to Auto-fill
                    <input ref={flierInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFlierUpload} />
                  </label>
                </>
              )}
            </div>

            <p className="text-center text-xs text-[#94a3b8] mt-4 mb-8">— or start from scratch —</p>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => setMode("invite")}
                className="rounded-2xl border-2 border-[#e2e8f0] bg-white p-6 text-left transition-all hover:border-[#E91E8C] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f8f9fc] flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-black text-[#0D1B2A] text-lg">CREATE INVITE</h3>
                <p className="mt-1.5 text-sm text-[#64748b]">
                  Private invitations for weddings, birthdays, corporate dinners, and VIP gatherings.
                </p>
              </button>
              <button
                onClick={() => setMode("event")}
                className="rounded-2xl border-2 border-[#e2e8f0] bg-white p-6 text-left transition-all hover:border-[#E91E8C] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f8f9fc] flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <h3 className="font-black text-[#0D1B2A] text-lg">POST EVENT</h3>
                <p className="mt-1.5 text-sm text-[#64748b]">
                  Public event listing for concerts, conferences, festivals, and ticketed events.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-[#e8edf2]">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-xl font-black tracking-tight text-[#0D1B2A]">
            Accredit<span style={{ color: "#E91E8C" }}>.vip</span>
          </Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-4"><GoBack fallback="/dashboard" /></div>

      <div className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => setMode(null)} className="text-xs font-semibold text-[#94a3b8] hover:text-[#E91E8C] transition-colors mb-1">
              ← Change mode
            </button>
            <h1 className="text-2xl font-black text-[#0D1B2A]">
              {mode === "invite" ? "Create Invite" : "Post Event"}
            </h1>
          </div>
          <span
            className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
            style={{ background: mode === "event" ? "rgba(233,30,140,0.1)" : "rgba(15,23,42,0.06)", color: mode === "event" ? "#E91E8C" : "#64748b" }}
          >
            {mode === "invite" ? "Private" : "Public"}
          </span>
        </div>

        {/* Flier upload shortcut (in-form) */}
        {mode === "event" && (
          <div className="mb-6 rounded-2xl border border-[#e8edf2] bg-[#f8f9fc] p-4">
            {flierParsing ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#E91E8C] border-t-transparent animate-spin flex-shrink-0" />
                <p className="text-sm font-semibold text-[#0D1B2A]">AI is reading your flier and filling the form…</p>
              </div>
            ) : flierParsed ? (
              <div className="flex items-center gap-3">
                {flierPreview && <img src={flierPreview} alt="Flier" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-600">Flier parsed — form pre-filled</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Review each field below and make any corrections</p>
                </div>
                <label className="text-xs font-bold text-[#E91E8C] cursor-pointer hover:underline">
                  Change
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFlierUpload} />
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#e8edf2] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#0D1B2A]">Have a flier? Upload it to auto-fill</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">AI extracts title, date, venue, lineup, tickets and more</p>
                </div>
                <label className="cursor-pointer rounded-xl border border-[#E91E8C] px-3 py-2 text-xs font-bold text-[#E91E8C] hover:bg-[#fff1f8] transition-colors">
                  Upload
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFlierUpload} />
                </label>
              </div>
            )}
            {flierParseError && <p className="mt-2 text-xs text-amber-600 font-medium">{flierParseError}</p>}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#23466f]">Event title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                placeholder={mode === "event" ? "Lagos Music Weekend" : "Sarah & James Wedding"}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#23466f]">
                {mode === "event" ? "Category" : "Event type"}
              </label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
              >
                {mode === "event" ? (
                  <>
                    <option value="concert">Concert</option>
                    <option value="conference">Conference</option>
                    <option value="festival">Festival</option>
                    <option value="nightlife">Nightlife / Club</option>
                    <option value="sports">Sports</option>
                    <option value="corporate">Corporate</option>
                    <option value="comedy">Comedy Show</option>
                    <option value="exhibition">Exhibition</option>
                    <option value="community">Community Gathering</option>
                    <option value="other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="corporate">Corporate</option>
                    <option value="religious">Religious</option>
                    <option value="vip">VIP Gathering</option>
                    <option value="conference">Conference</option>
                  </>
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#23466f]">Host / organiser name</label>
              <input
                value={form.host_name}
                onChange={(e) => setForm({ ...form, host_name: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                placeholder={mode === "event" ? "Accredit Live" : "The Adeyemis"}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#23466f]">Expected attendance</label>
              <select
                value={form.guest_count_range}
                onChange={(e) => setForm({ ...form, guest_count_range: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
              >
                <option value="1-100">1 – 100</option>
                <option value="101-200">101 – 200</option>
                <option value="201-400">201 – 400</option>
                <option value="400+">400+</option>
              </select>
            </div>
          </div>

          {/* Ticket pricing — event mode only */}
          {mode === "event" && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#23466f]">
                    Base ticket price (₦)
                    <span className="ml-1 font-normal text-[#94a3b8]">— leave blank for free</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.ticket_price}
                    onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
                    className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    placeholder="e.g. 10000"
                  />
                  {form.ticket_price && Number(form.ticket_price) > 0 && (
                    <p className="text-xs text-[#94a3b8]">
                      Buyers pay ₦{Math.round(Number(form.ticket_price) * 1.05).toLocaleString()} (incl. 5% service fee)
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#23466f]">
                    Total passes available
                    <span className="ml-1 font-normal text-[#94a3b8]">— leave blank for unlimited</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.tickets_available}
                    onChange={(e) => setForm({ ...form, tickets_available: e.target.value })}
                    className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    placeholder="e.g. 500"
                  />
                </div>
              </div>

              <fieldset className="rounded-xl border border-[#d9e2ec] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <legend className="text-sm font-bold text-[#23466f]">Gate fee / ticket packages</legend>
                  <button
                    type="button"
                    onClick={() => setPassPackages((cur) => [...cur, { name: "", price: "", quantity: "" }])}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#E91E8C] border border-[#E91E8C] hover:bg-[#fff1f8] transition-colors"
                  >
                    + Add package
                  </button>
                </div>
                <div className="space-y-2">
                  {passPackages.map((item, index) => (
                    <div key={index} className="grid gap-2 rounded-xl bg-[#f8fafc] p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <input
                        value={item.name}
                        onChange={(e) => updatePassPackage(index, { name: e.target.value })}
                        className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
                        placeholder="Regular, VIP, Table for 5"
                      />
                      <input
                        value={item.price}
                        onChange={(e) => updatePassPackage(index, { price: e.target.value })}
                        className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
                        placeholder="Free, 10000, 250000"
                      />
                      <input
                        value={item.quantity || ""}
                        onChange={(e) => updatePassPackage(index, { quantity: e.target.value })}
                        className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
                        placeholder="Qty (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => setPassPackages((cur) => cur.filter((_, i) => i !== index))}
                        className="h-10 rounded-xl border border-[#fecdd3] px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {/* Date / Time / Timezone */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#23466f]">Date</label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#23466f]">Time</label>
              <input
                list="dashboard-time-options"
                value={form.event_time}
                onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                placeholder="7:00 PM"
                required
              />
              <datalist id="dashboard-time-options">
                {timeOptions.map((o) => <option key={o.value} value={o.label} />)}
              </datalist>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-[#23466f]">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
              >
                {timezoneOptions.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                <option value="WAT">🇳🇬 WAT — Lagos, Nigeria</option>
                <option value="GMT">🇬🇭 GMT — Accra, Ghana</option>
                <option value="EAT">🇰🇪 EAT — Nairobi, Kenya</option>
                <option value="SAST">🇿🇦 SAST — Johannesburg</option>
                <option value="GST">🇦🇪 GST — Dubai, UAE</option>
                <option value="EST">🇺🇸 EST — New York</option>
                <option value="PST">🇺🇸 PST — Los Angeles</option>
              </select>
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#23466f]">Venue</label>
            <VenueInput value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} required />
          </div>

          {/* Map link */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#23466f]">
              Map link <span className="font-normal text-[#94a3b8]">(optional)</span>
            </label>
            <input
              value={form.map_link}
              onChange={(e) => setForm({ ...form, map_link: e.target.value })}
              className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
              placeholder="https://maps.google.com/..."
            />
          </div>

          {/* Dress code */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#23466f]">
              Dress code <span className="font-normal text-[#94a3b8]">(optional)</span>
            </label>
            <input
              value={form.dress_code}
              onChange={(e) => setForm({ ...form, dress_code: e.target.value })}
              className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
              placeholder="Smart casual, all white, black tie, beach wear..."
            />
          </div>

          {/* Lineup — event mode only */}
          {mode === "event" && (
            <fieldset className="rounded-xl border border-[#d9e2ec] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-bold text-[#23466f]">Headliners, speakers or artistes</legend>
                <button
                  type="button"
                  onClick={() => setLineup((cur) => [...cur, { role: "", name: "", attachHeadshot: false, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }])}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#E91E8C] border border-[#E91E8C] hover:bg-[#fff1f8] transition-colors"
                >
                  + Add person
                </button>
              </div>
              <div className="space-y-3">
                {lineup.map((person, index) => (
                  <div key={index} className="space-y-2 rounded-xl bg-[#f8fafc] p-3">
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        list={`role-opts-${index}`}
                        value={person.role}
                        onChange={(e) => updateLineup(index, { role: e.target.value })}
                        className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
                        placeholder="Artiste, Keynote Speaker, MC..."
                      />
                      <datalist id={`role-opts-${index}`}>
                        {lineupRoleOptions.map((r) => <option key={r} value={r} />)}
                      </datalist>
                      <input
                        value={person.name}
                        onChange={(e) => updateLineup(index, { name: e.target.value })}
                        className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white"
                        placeholder="Person's name"
                      />
                      <button
                        type="button"
                        onClick={() => setLineup((cur) => cur.filter((_, i) => i !== index))}
                        className="h-10 rounded-xl border border-[#fecdd3] px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#23466f] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={person.attachHeadshot}
                        onChange={(e) => updateLineup(index, { attachHeadshot: e.target.checked })}
                        className="h-3.5 w-3.5 accent-[#E91E8C]"
                      />
                      Attach headshot to flyer
                    </label>
                    {person.attachHeadshot && (
                      <div className="grid gap-2 md:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-xl border border-[#e8edf2] bg-white p-3 text-xs font-semibold text-[#23466f] cursor-pointer">
                          <input type="radio" checked={person.headshotSource === "upload"} onChange={() => updateLineup(index, { headshotSource: "upload" })} className="accent-[#E91E8C]" />
                          Upload headshot
                        </label>
                        <label className="flex items-center gap-2 rounded-xl border border-[#e8edf2] bg-white p-3 text-xs font-semibold text-[#23466f] cursor-pointer">
                          <input type="radio" checked={person.headshotSource === "ai"} onChange={() => updateLineup(index, { headshotSource: "ai", generatedHeadshot: true })} className="accent-[#E91E8C]" />
                          AI Generate
                        </label>
                        {person.headshotSource === "upload" && (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => updateLineup(index, { headshotFileName: e.target.files?.[0]?.name || "" })}
                            className="block w-full rounded-xl border border-[#d9e2ec] bg-white px-3 py-2 text-xs md:col-span-2"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {/* After party — event mode only */}
          {mode === "event" && (
            <fieldset className="rounded-xl border border-[#d9e2ec] p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-[#23466f] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.after_party_enabled}
                  onChange={(e) => setForm({ ...form, after_party_enabled: e.target.checked })}
                  className="h-4 w-4 accent-[#E91E8C]"
                />
                Include after party location
              </label>
              {form.after_party_enabled && (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={form.after_party_location}
                    onChange={(e) => setForm({ ...form, after_party_location: e.target.value })}
                    className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    placeholder="After party venue or address"
                  />
                  <input
                    list="dashboard-after-party-time"
                    value={form.after_party_time}
                    onChange={(e) => setForm({ ...form, after_party_time: e.target.value })}
                    className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    placeholder="11:30 PM"
                  />
                  <datalist id="dashboard-after-party-time">
                    {timeOptions.map((o) => <option key={o.value} value={o.label} />)}
                  </datalist>
                </div>
              )}
            </fieldset>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#23466f]">
              {mode === "event" ? "Event description" : "Invite message"}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-[#d9e2ec] px-3 py-3 text-sm outline-none focus:border-[#E91E8C] min-h-[100px] resize-none"
              placeholder={mode === "event" ? "Tell people what to expect at this event…" : "Write the message your guests will receive…"}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: submitting ? "#94a3b8" : "linear-gradient(135deg, #E91E8C, #C4166F)", boxShadow: submitting ? "none" : "0 6px 20px rgba(233,30,140,0.35)" }}
          >
            {submitting ? "Creating…" : mode === "event" ? "Publish Event" : "Create Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}
