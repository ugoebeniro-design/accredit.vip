"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { apiClient } from "@/lib/api-client";
import { aiChat, generateFlier } from "@/lib/api/ai";

const DRAFT_KEY = "accredit_event_draft";

type Mode = "invite" | "event";
type Channel = "email" | "whatsapp" | "sms";
type QrDeliveryOption = "with_qr" | "without_qr" | "qr_later";
type SocialPlatform = "instagram" | "x" | "facebook" | "tiktok" | "linkedin" | "website" | "other";
type SocialHandle = { platform: SocialPlatform; handle: string };
type PassPackage = { name: string; price: string };
type LineupPerson = {
  role: string;
  name: string;
  attachHeadshot: boolean;
  headshotSource: "upload" | "ai";
  headshotFileName: string;
  generatedHeadshot: boolean;
};

const pricing: Record<Channel, number> = {
  email: 100000,
  whatsapp: 200000,
  sms: 300000,
};

const channelLabels: Record<Channel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

const qrDeliveryOptions: Array<{ value: QrDeliveryOption; label: string; description: string }> = [
  {
    value: "with_qr",
    label: "With QR code",
    description: "Send the flyer-style invitation and a unique animated accreditation QR code together.",
  },
  {
    value: "without_qr",
    label: "Without QR code",
    description: "Send only the invitation message and design.",
  },
  {
    value: "qr_later",
    label: "With QR code, but later",
    description: "Send the invite now, then optionally return later to send unique animated QR accreditation details.",
  },
];

const socialPlatforms: Array<{ value: SocialPlatform; label: string; placeholder: string }> = [
  { value: "instagram", label: "Instagram", placeholder: "@yourbrand" },
  { value: "x", label: "X / Twitter", placeholder: "@yourbrand" },
  { value: "facebook", label: "Facebook", placeholder: "facebook.com/yourpage" },
  { value: "tiktok", label: "TikTok", placeholder: "@yourbrand" },
  { value: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/yourbrand" },
  { value: "website", label: "Website", placeholder: "https://yourwebsite.com" },
  { value: "other", label: "Other", placeholder: "Handle or link" },
];

const guestRanges = [
  { label: "1 - 100", min: 1, max: 100, units: 1 },
  { label: "100 - 200", min: 100, max: 200, units: 2 },
  { label: "200 - 300", min: 200, max: 300, units: 3 },
  { label: "300 - 400", min: 300, max: 400, units: 4 },
  { label: "400 - 500", min: 400, max: 500, units: 5 },
  { label: "500 - 1000", min: 500, max: 1000, units: 10 },
];

const timeSlots = Array.from({ length: 48 }, (_, index) => {
  const hour24 = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
});

const timezoneOptions = [
  { value: "Africa/Lagos|WAT", label: "🇳🇬 Lagos, Nigeria (WAT)" },
  { value: "Africa/Accra|GMT", label: "🇬🇭 Accra, Ghana (GMT)" },
  { value: "Africa/Nairobi|EAT", label: "🇰🇪 Nairobi, Kenya (EAT)" },
  { value: "Africa/Johannesburg|SAST", label: "🇿🇦 Johannesburg, South Africa (SAST)" },
  { value: "Europe/London|GMT/BST", label: "🇬🇧 London, United Kingdom (GMT/BST)" },
  { value: "Europe/Paris|CET", label: "🇫🇷 Paris, France (CET)" },
  { value: "America/New_York|ET", label: "🇺🇸 New York, United States (ET)" },
  { value: "America/Los_Angeles|PT", label: "🇺🇸 Los Angeles, United States (PT)" },
  { value: "Asia/Dubai|GST", label: "🇦🇪 Dubai, UAE (GST)" },
];

const STATIC_VENUES = [
  "Eko Hotels & Suites, Victoria Island, Lagos",
  "Landmark Event Centre, Victoria Island, Lagos",
  "Federal Palace Hotel, Victoria Island, Lagos",
  "Civic Centre, Victoria Island, Lagos",
  "Oriental Hotel, Lekki Road, Lagos",
  "Harbour Point, Victoria Island, Lagos",
  "Balmoral Convention Centre, Ikeja, Lagos",
  "Transcorp Hilton, Abuja",
  "International Conference Centre, Abuja",
  "Dome Event Centre, Abuja",
  "Polo Club, Ikoyi, Lagos",
  "Muri Okunola Park, Victoria Island, Lagos",
];

function getSavedVenues(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("accredit_saved_venues");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveVenue(venue: string) {
  try {
    const saved = getSavedVenues();
    if (!saved.includes(venue)) {
      saved.unshift(venue);
      localStorage.setItem("accredit_saved_venues", JSON.stringify(saved.slice(0, 20)));
    }
  } catch {}
}

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTrialFingerprint() {
  const key = "accredit_trial_fingerprint";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, generated);
  return generated;
}

function toggleChannel(channels: Channel[], channel: Channel) {
  return channels.includes(channel)
    ? channels.filter((item) => item !== channel)
    : [...channels, channel];
}

function openEditableTimeDropdown(id: string) {
  const input = document.getElementById(id) as (HTMLInputElement & { showPicker?: () => void }) | null;
  input?.focus();
  input?.showPicker?.();
}

export default function CreateEventPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [fingerprint, setFingerprint] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [usedTrials, setUsedTrials] = useState<Record<Mode, boolean>>({ invite: false, event: false });
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [venueSuggestionsOpen, setVenueSuggestionsOpen] = useState(false);
  const [trialComplete, setTrialComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    host_name: "",
    event_type: "wedding",
    category: "concert",
    event_date: "",
    event_time: "",
    details_to_be_communicated: false,
    timezone: "Africa/Lagos|WAT",
    venue: "",
    after_party_enabled: false,
    after_party_location: "",
    after_party_time: "",
    guest_range: "1 - 100",
    delivery_channels: ["whatsapp"] as Channel[],
    qr_delivery: "with_qr" as QrDeliveryOption,
    qr_later_title: "",
    qr_later_message: "",
    qr_later_media_source: "upload" as "upload" | "ai",
    qr_later_image_name: "",
    qr_later_image_prompt: "",
    male_dress_code: "",
    female_dress_code: "",
    gate_fee: "",
    headliners: "",
    social_platform: "instagram" as SocialPlatform,
    social_handle: "",
    media_source: "upload" as "upload" | "ai",
    uploaded_image_name: "",
    image_prompt: "",
    custom_category: "",
    generated_image_ready: false,
    generated_image_url: "",
    description: "",
  });
  const [passPackages, setPassPackages] = useState<PassPackage[]>([
    { name: "Regular", price: "" },
  ]);
  const [socialHandles, setSocialHandles] = useState<SocialHandle[]>([
    { platform: "instagram", handle: "" },
  ]);
  const [lineup, setLineup] = useState<LineupPerson[]>([
    {
      role: "Keynote Speaker",
      name: "",
      attachHeadshot: true,
      headshotSource: "upload",
      headshotFileName: "",
      generatedHeadshot: false,
    },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.form) setForm(parsed.form);
        if (parsed.passPackages) setPassPackages(parsed.passPackages);
        if (parsed.socialHandles) setSocialHandles(parsed.socialHandles);
        if (parsed.lineup) setLineup(parsed.lineup);
      } catch {}
    }
    const timer = window.setTimeout(() => {
      setFingerprint(getTrialFingerprint());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, passPackages, socialHandles, lineup }));
    }, 300);
    return () => clearTimeout(timer);
  }, [form, passPackages, socialHandles, lineup, hydrated]);

  useEffect(() => {
    if (!fingerprint) return;
    (["invite", "event"] as Mode[]).forEach(async (trialType) => {
      try {
        const status = await apiClient<{ used: boolean }>("/trials/check", {
          method: "POST",
          body: { trial_type: trialType, fingerprint },
        });
        setUsedTrials((current) => ({ ...current, [trialType]: status.used }));
      } catch {
        setUsedTrials((current) => ({
          ...current,
          [trialType]: localStorage.getItem(`accredit_trial_used_${trialType}`) === "true",
        }));
      }
    });
  }, [fingerprint]);

  const selectedGuestRange = guestRanges.find((range) => range.label === form.guest_range) || guestRanges[0];
  const pricingUnits = selectedGuestRange.units;
  const selectedPrice = useMemo(
    () => (mode === "invite" ? form.delivery_channels.reduce((total, channel) => total + pricing[channel] * pricingUnits, 0) : 0),
    [form.delivery_channels, mode, pricingUnits]
  );
  const selectedChannelNames = form.delivery_channels.map((channel) => channelLabels[channel]);

  const filteredVenues = useMemo(() => {
    const allVenues = [...STATIC_VENUES, ...getSavedVenues()];
    const search = form.venue.trim().toLowerCase();
    if (search.length < 2) return allVenues.slice(0, 4);
    return allVenues
      .filter((venue) => venue.toLowerCase().includes(search))
      .slice(0, 5);
  }, [form.venue]);

  const selectedTimezone = timezoneOptions.find((zone) => zone.value === form.timezone) || timezoneOptions[0];
  const selectedQrDelivery = qrDeliveryOptions.find((option) => option.value === form.qr_delivery) || qrDeliveryOptions[0];
  const selectedSocialPlatform = socialPlatforms.find((platform) => platform.value === form.social_platform) || socialPlatforms[0];
  const detailsToBeCommunicated = mode === "invite" && form.details_to_be_communicated;
  const visibleSocialHandles = socialHandles.filter((item) => item.handle.trim());
  const visiblePassPackages = passPackages.filter((item) => item.name.trim() || item.price.trim());
  const visibleLineup = lineup.filter((item) => item.role.trim() || item.name.trim());

  const updatePassPackage = (index: number, next: Partial<PassPackage>) => {
    setPassPackages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)));
  };

  const updateSocialHandle = (index: number, next: Partial<SocialHandle>) => {
    setSocialHandles((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)));
  };

  const updateLineup = (index: number, next: Partial<LineupPerson>) => {
    setLineup((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)));
  };

  const generateHeadshot = (index: number) => {
    updateLineup(index, { headshotSource: "ai", generatedHeadshot: true, attachHeadshot: true });
  };

  const generateMessage = async () => {
    if (!hydrated || !mode) return;
    setAiGenerating(true);
    try {
      const dateLine = detailsToBeCommunicated ? "to be communicated" : form.event_date || "your selected date";
      const timeLine = detailsToBeCommunicated ? "to be communicated" : form.event_time || "your selected time";
      const venueLine = detailsToBeCommunicated ? "to be communicated" : form.venue || "the venue";
      const title = form.title || (mode === "event" ? "our upcoming event" : "our special celebration");
      const host = form.host_name || "the host";
      const passText = visiblePassPackages.length
        ? ` Passes: ${visiblePassPackages.map((item) => `${item.name || "Pass"} ${item.price || ""}`.trim()).join(", ")}.`
        : "";
      const lineupText = visibleLineup.length
        ? ` Featuring ${visibleLineup.map((item) => `${item.role || "Guest"}: ${item.name || "Name"}`).join("; ")}.`
        : "";
      const afterPartyText =
        mode === "event" && form.after_party_enabled && form.after_party_location
          ? ` After party at ${form.after_party_location}${form.after_party_time ? ` by ${form.after_party_time}` : ""}.`
          : "";
      const socialText = visibleSocialHandles.length
        ? ` Follow ${visibleSocialHandles
            .map((item) => {
              const platform = socialPlatforms.find((social) => social.value === item.platform)?.label || "Social";
              return `${platform}: ${item.handle}`;
            })
            .join(", ")} for updates.`
        : "";

      const context = `Write a warm invitation message for ${mode === "event" ? "a public event" : "a private invite"}: ${title} hosted by ${host}. Date: ${dateLine}, Time: ${timeLine}. Venue: ${venueLine}.${passText}${lineupText}${afterPartyText}${socialText}`;
      const reply = await aiChat([{ role: "user", text: `Generate a concise but warm invitation message based on these details:\n${context}` }]);
      setForm((current) => ({ ...current, description: reply }));
    } catch {
      setForm((current) => ({ ...current, description: "Unable to generate message. Please write manually." }));
    } finally {
      setAiGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!hydrated || !mode) return;
    setAiImageGenerating(true);
    try {
      const prompt = `Premium ${mode === "event" ? form.category : form.event_type} design for ${form.title || "the event"} with elegant typography and rich event atmosphere.`;
      const url = await generateFlier(prompt);
      setForm((current) => ({
        ...current,
        media_source: "ai",
        generated_image_ready: true,
        generated_image_url: url,
        image_prompt: current.image_prompt || prompt,
      }));
    } catch {
      setForm((current) => ({
        ...current,
        media_source: "ai",
        generated_image_ready: true,
      }));
    } finally {
      setAiImageGenerating(false);
    }
  };

  const runTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode || !fingerprint) return;
    if (mode === "invite" && form.delivery_channels.length === 0) {
      setError("Select at least one delivery channel to test.");
      return;
    }

    setError("");
    setMessage("");
    setTrialComplete(false);
    setSubmitting(true);

    try {
      await apiClient("/trials/use", {
        method: "POST",
        body: {
          trial_type: mode,
          fingerprint,
          payload: {
            ...form,
            pass_packages: passPackages,
            lineup,
            social_handles: socialHandles,
            estimated_price: selectedPrice,
            pricing_units: pricingUnits,
            guest_count: selectedGuestRange.max,
          },
        },
      });
      if (form.venue.trim()) saveVenue(form.venue.trim());
      localStorage.setItem(`accredit_trial_used_${mode}`, "true");
      setUsedTrials((current) => ({ ...current, [mode]: true }));
      localStorage.removeItem(DRAFT_KEY);
      setTrialComplete(true);
      setMessage(
        mode === "event"
          ? "Test complete. We generated a flyer/banner preview for discovery. Create an account to save, download, publish to Discover Events, and continue."
          : `Test complete. We generated the invite preview, ${selectedQrDelivery.label.toLowerCase()} setup, channel estimate, and delivery simulation. Create an account to save this setup, upload the real guest list, pay, and send.`
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "You have already tested this feature.";
      setError(detail);
      setUsedTrials((current) => ({ ...current, [mode]: true }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar variant="light" />

      <main className="flex-1">
        <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white border-b border-[#e8edf2]">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#E91E8C]">
                Create Event
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-tight text-[#0D1B2A] sm:text-5xl lg:text-6xl">
                Test your invite
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-gray-500 sm:text-lg">
                Choose CREATE INVITE for private guest lists or POST EVENT for public discovery.
                The test shows your message, QR preview, channel estimate, and what happens next.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e8edf2] bg-[#f8f9fc] p-4 sm:p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">
                Choose one to get started
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode((current) => current === "invite" ? null : "invite");
                    setMessage("");
                    setError("");
                    setTrialComplete(false);
                  }}
                  className={`rounded-xl border-2 p-6 text-left transition-all duration-200 cursor-pointer ${
                    mode === "invite"
                      ? "border-[#E91E8C] bg-white shadow-[0_4px_20px_rgba(233,30,140,0.14)] ring-2 ring-[#E91E8C]/15"
                      : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50 hover:shadow-md"
                  }`}
                >
                  {/* Selection indicator */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-base font-black uppercase tracking-[0.12em] text-[#E91E8C]">
                      CREATE INVITE
                    </span>
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all"
                      style={{
                        borderColor: mode === "invite" ? "#E91E8C" : "#d1d5db",
                        background: mode === "invite" ? "#E91E8C" : "white",
                      }}
                    >
                      {mode === "invite" && (
                        <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <strong className="block text-xl font-black text-[#07182f]">Private invitation</strong>
                  <span className="mt-2 block text-sm text-gray-500">
                    Guest upload, RSVP, reminders, WhatsApp/SMS/Email, QR access.
                  </span>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
                    style={{ color: mode === "invite" ? "#E91E8C" : "#9ca3af" }}
                  >
                    {mode === "invite" ? "Selected" : "Select"}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode((current) => current === "event" ? null : "event");
                    setForm((current) => ({ ...current, details_to_be_communicated: false }));
                    setMessage("");
                    setError("");
                    setTrialComplete(false);
                  }}
                  className={`rounded-xl border-2 p-6 text-left transition-all duration-200 cursor-pointer ${
                    mode === "event"
                      ? "border-[#E91E8C] bg-white shadow-[0_4px_20px_rgba(233,30,140,0.14)] ring-2 ring-[#E91E8C]/15"
                      : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50 hover:shadow-md"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-base font-black uppercase tracking-[0.12em] text-[#E91E8C]">
                      POST EVENT
                    </span>
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all"
                      style={{
                        borderColor: mode === "event" ? "#E91E8C" : "#d1d5db",
                        background: mode === "event" ? "#E91E8C" : "white",
                      }}
                    >
                      {mode === "event" && (
                        <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <strong className="block text-xl font-black text-[#07182f]">Public event page</strong>
                  <span className="mt-2 block text-sm text-gray-500">
                    Listing, tickets, event page, flyer/banner direction, discovery.
                  </span>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
                    style={{ color: mode === "event" ? "#E91E8C" : "#9ca3af" }}
                  >
                    {mode === "event" ? "Selected" : "Select"}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_390px]">
            <form onSubmit={runTrial} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">
                    {mode === "event" ? "Post Event Test" : "Create Invite Test"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[#07182f]">
                    {mode ? "Try it once, then continue securely" : "Choose a flow above"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#64748b]">
                    One trial is allowed per feature before signup. The server checks browser fingerprint,
                    IP signature, and rate limits, so refreshing or clearing local storage cannot unlock extra tests.
                  </p>
                </div>
                {mode && usedTrials[mode] && (
                  <span className="rounded-full bg-[#fff1f8] px-3 py-1 text-xs font-bold text-[#C4166F]">
                    Trial already used
                  </span>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#23466f]">
                    {mode === "event" ? "Event title" : "Invite title"}
                  </span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    placeholder={mode === "event" ? "Lagos Music Weekend" : "Sarah & James Wedding"}
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#23466f]">
                    {mode === "event" ? "Host or promoter" : "Host name"}
                  </span>
                  <input
                    value={form.host_name}
                    onChange={(e) => setForm({ ...form, host_name: e.target.value })}
                    className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    placeholder={mode === "event" ? "Accredit Live" : "The Adeyemis"}
                    required
                  />
                </label>

                {mode === "event" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Category</span>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    >
                      <option value="concert">Concert</option>
                      <option value="conference">Conference</option>
                      <option value="festival">Festival</option>
                      <option value="comedy">Comedy show</option>
                      <option value="exhibition">Exhibition</option>
                      <option value="community">Community gathering</option>
                      <option value="house_party">House Party</option>
                      <option value="games_night">Games Night</option>
                      <option value="beach_party">Beach Party</option>
                      <option value="__other__">Others (custom)</option>
                    </select>
                    {form.category === "__other__" && (
                      <input
                        value={form.custom_category || ""}
                        onChange={(e) => setForm({ ...form, custom_category: e.target.value })}
                        className="mt-2 h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                        placeholder="Type your category..."
                        required
                      />
                    )}
                  </label>
                ) : (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Event type</span>
                    <select
                      value={form.event_type}
                      onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                    >
                      <option value="wedding">Wedding</option>
                      <option value="birthday">Birthday</option>
                      <option value="corporate">Corporate</option>
                      <option value="religious">Religious event</option>
                      <option value="vip">VIP gathering</option>
                      <option value="conference">Conference</option>
                    </select>
                  </label>
                )}

                {mode === "invite" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Number of guests</span>
                    <select
                      value={form.guest_range}
                      onChange={(e) => setForm({ ...form, guest_range: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm font-bold outline-none focus:border-[#E91E8C]"
                      required
                    >
                      {guestRanges.map((range) => (
                        <option key={range.label} value={range.label}>
                          {range.label} guests
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#23466f]">Social media handles</span>
                      <button
                        type="button"
                        onClick={() => setSocialHandles((current) => [...current, { platform: "instagram", handle: "" }])}
                        className="rounded-lg border border-[#d9e2ec] px-3 py-2 text-xs font-bold text-[#23466f] hover:bg-[#fff1f8]"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {socialHandles.map((social, index) => {
                        const platform = socialPlatforms.find((item) => item.value === social.platform) || socialPlatforms[0];
                        return (
                          <div key={index} className="grid gap-2 sm:grid-cols-[0.9fr_1.1fr_auto]">
                            <select
                              value={social.platform}
                              onChange={(e) => updateSocialHandle(index, { platform: e.target.value as SocialPlatform })}
                              className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm font-semibold outline-none focus:border-[#E91E8C]"
                            >
                              {socialPlatforms.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                            <input
                              value={social.handle}
                              onChange={(e) => updateSocialHandle(index, { handle: e.target.value })}
                              className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                              placeholder={platform.placeholder}
                            />
                            <button
                              type="button"
                              onClick={() => setSocialHandles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                              className="h-11 rounded-xl border border-[#fecdd3] px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mode === "invite" && (
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#edf2f7] p-3 text-sm font-semibold text-[#23466f] md:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.details_to_be_communicated}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          details_to_be_communicated: e.target.checked,
                          event_date: e.target.checked ? "" : form.event_date,
                          event_time: e.target.checked ? "" : form.event_time,
                          venue: e.target.checked ? "" : form.venue,
                        })
                      }
                      className="h-4 w-4 accent-[#E91E8C]"
                    />
                    Date, time and venue will be communicated later
                  </label>
                )}

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#23466f]">Date</span>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    disabled={detailsToBeCommunicated}
                    className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
                    required={!detailsToBeCommunicated}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#23466f]">Time</span>
                  <div className="relative">
                    <input
                      id="event-time-input"
                      list="event-time-slots"
                      value={form.event_time}
                      onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                      disabled={detailsToBeCommunicated}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 pr-11 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
                      placeholder={detailsToBeCommunicated ? "To be communicated" : "Select or type time"}
                      required={!detailsToBeCommunicated}
                    />
                    <button
                      type="button"
                      onClick={() => openEditableTimeDropdown("event-time-input")}
                      disabled={detailsToBeCommunicated}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#23466f] hover:bg-[#f8fafc] disabled:text-[#94a3b8]"
                      aria-label="Open time options"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <datalist id="event-time-slots">
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot} />
                    ))}
                  </datalist>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#23466f]">Time zone</span>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm font-semibold outline-none focus:border-[#E91E8C]"
                    required
                  >
                    {timezoneOptions.map((zone) => (
                      <option key={zone.value} value={zone.value}>
                        {zone.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {mode === "invite" && (
                <div className="mt-5 space-y-5">
                  <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                    <legend className="px-2 text-sm font-semibold text-[#23466f]">Delivery channels</legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(Object.keys(pricing) as Channel[]).map((channel) => (
                        <label key={channel} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#edf2f7] p-3 text-sm font-semibold text-[#23466f]">
                          <input
                            type="checkbox"
                            checked={form.delivery_channels.includes(channel)}
                            onChange={() => setForm({ ...form, delivery_channels: toggleChannel(form.delivery_channels, channel) })}
                            className="h-4 w-4 accent-[#E91E8C]"
                          />
                          <span>{channelLabels[channel]}</span>
                          <span className="ml-auto text-xs text-[#94a3b8]">{formatNaira(pricing[channel])}/100</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                    <legend className="px-2 text-sm font-semibold text-[#23466f]">QR code option</legend>
                    <div className="grid gap-3 md:grid-cols-3">
                      {qrDeliveryOptions.map((option) => (
                        <label key={option.value} className="flex cursor-pointer flex-col gap-2 rounded-xl border border-[#edf2f7] p-3 text-sm text-[#23466f]">
                          <span className="flex items-center gap-2 font-bold">
                            <input
                              type="radio"
                              checked={form.qr_delivery === option.value}
                              onChange={() => setForm({ ...form, qr_delivery: option.value })}
                              className="h-4 w-4 accent-[#E91E8C]"
                            />
                            {option.label}
                          </span>
                          <span className="text-xs leading-5 text-[#64748b]">{option.description}</span>
                        </label>
                      ))}
                    </div>
                    {form.qr_delivery === "qr_later" && (
                      <div className="mt-4 space-y-3 rounded-xl bg-[#f8fafc] p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={form.qr_later_title}
                            onChange={(e) => setForm({ ...form, qr_later_title: e.target.value })}
                            className="h-11 rounded-xl border border-[#d9e2ec] bg-white px-3 text-sm outline-none focus:border-[#E91E8C]"
                            placeholder="QR message title"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#edf2f7] bg-white p-3 text-sm font-semibold text-[#23466f]">
                              <input
                                type="radio"
                                checked={form.qr_later_media_source === "upload"}
                                onChange={() => setForm({ ...form, qr_later_media_source: "upload" })}
                                className="h-4 w-4 accent-[#E91E8C]"
                              />
                              Upload image
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#edf2f7] bg-white p-3 text-sm font-semibold text-[#23466f]">
                              <input
                                type="radio"
                                checked={form.qr_later_media_source === "ai"}
                                onChange={() => setForm({ ...form, qr_later_media_source: "ai" })}
                                className="h-4 w-4 accent-[#E91E8C]"
                              />
                              Generate image
                            </label>
                          </div>
                        </div>
                        <textarea
                          value={form.qr_later_message}
                          onChange={(e) => setForm({ ...form, qr_later_message: e.target.value })}
                          className="min-h-24 w-full resize-none rounded-xl border border-[#d9e2ec] bg-white px-3 py-3 text-sm outline-none focus:border-[#E91E8C]"
                          placeholder="Optional QR message. You can leave this blank and write it when you return later."
                        />
                        {form.qr_later_media_source === "upload" ? (
                           <div>
                           <input
                             type="file"
                             accept="image/*"
                             onChange={(e) => setForm({ ...form, qr_later_image_name: e.target.files?.[0]?.name || "" })}
                             className="block w-full cursor-pointer rounded-xl border border-[#d9e2ec] bg-white px-3 py-2 text-sm text-[#23466f] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#07182f] file:px-4 file:py-2 file:font-bold file:text-white"
                           />
                           <p className="mt-1 text-xs text-[#94a3b8]">Recommended: 1200×675px, max 5MB</p>
                           </div>
                        ) : (
                          <input
                            value={form.qr_later_image_prompt}
                            onChange={(e) => setForm({ ...form, qr_later_image_prompt: e.target.value })}
                            className="h-11 w-full rounded-xl border border-[#d9e2ec] bg-white px-3 text-sm outline-none focus:border-[#E91E8C]"
                            placeholder="Describe the picture to attach to the later QR message"
                          />
                        )}
                        <p className="text-xs font-semibold text-[#64748b]">
                          Sending QR codes later is a separate optional delivery, so message copy and artwork can be prepared now or completed when you return.
                        </p>
                      </div>
                    )}
                  </fieldset>
                </div>
              )}

              <label className="relative mt-4 block space-y-2">
                <span className="text-sm font-semibold text-[#23466f]">Venue</span>
                <input
                  value={form.venue}
                  onChange={(e) => {
                    setForm({ ...form, venue: e.target.value });
                    setVenueSuggestionsOpen(true);
                  }}
                  onFocus={() => setVenueSuggestionsOpen(true)}
                  disabled={detailsToBeCommunicated}
                  className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
                  placeholder={detailsToBeCommunicated ? "To be communicated" : "Start typing a venue or address"}
                  required={!detailsToBeCommunicated}
                />
                {venueSuggestionsOpen && filteredVenues.length > 0 && (
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-2 shadow-sm">
                    {filteredVenues.map((venue) => (
                      <button
                        key={venue}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, venue });
                          saveVenue(venue);
                          setVenueSuggestionsOpen(false);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#23466f] hover:bg-[#fff1f8]"
                      >
                        {venue}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              {mode === "event" ? (
                <>
                <div className="mt-4 hidden gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Gate fee</span>
                    <input
                      value={form.gate_fee}
                      onChange={(e) => setForm({ ...form, gate_fee: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                      placeholder="Free, ₦10,000, VIP ₦50,000"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Headliners or speakers</span>
                    <input
                      value={form.headliners}
                      onChange={(e) => setForm({ ...form, headliners: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                      placeholder="Artists, speakers, special guests"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Dress code</span>
                    <input
                      value={form.male_dress_code}
                      onChange={(e) => setForm({ ...form, male_dress_code: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                      placeholder="Optional dress code"
                    />
                  </label>
                </div>
                <div className="mt-5 space-y-5">
                  <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <legend className="text-sm font-bold text-[#23466f]">Gate fee / pass packages</legend>
                      <button
                        type="button"
                        onClick={() => setPassPackages((current) => [...current, { name: "", price: "" }])}
                        className="w-fit cursor-pointer rounded-lg bg-[#07182f] px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#E91E8C]"
                      >
                        Add package
                      </button>
                    </div>
                    <div className="space-y-3">
                      {passPackages.map((item, index) => (
                        <div key={index} className="grid gap-3 rounded-xl bg-[#f8fafc] p-3 md:grid-cols-[1fr_1fr_auto]">
                          <input
                            value={item.name}
                            onChange={(e) => updatePassPackage(index, { name: e.target.value })}
                            className="h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                            placeholder="Regular, VIP, Table for 5"
                          />
                          <input
                            value={item.price}
                            onChange={(e) => updatePassPackage(index, { price: e.target.value })}
                            className="h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                            placeholder="Free, NGN 10,000, NGN 250,000"
                          />
                          <button
                            type="button"
                            onClick={() => setPassPackages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            className="h-11 cursor-pointer rounded-xl border border-[#fecdd3] px-3 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <legend className="text-sm font-bold text-[#23466f]">Headliners, speakers or artistes</legend>
                      <button
                        type="button"
                        onClick={() =>
                          setLineup((current) => [
                            ...current,
                            { role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false },
                          ])
                        }
                        className="w-fit cursor-pointer rounded-lg bg-[#07182f] px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#E91E8C]"
                      >
                        Add person
                      </button>
                    </div>
                    <div className="space-y-4">
                      {lineup.map((person, index) => (
                        <div key={index} className="space-y-3 rounded-xl bg-[#f8fafc] p-3">
                          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                            <input
                              value={person.role}
                              onChange={(e) => updateLineup(index, { role: e.target.value })}
                              className="h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                              placeholder="Keynote Speaker, Guest Speaker, Artiste"
                            />
                            <input
                              value={person.name}
                              onChange={(e) => updateLineup(index, { name: e.target.value })}
                              className="h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                              placeholder="Name"
                            />
                            <button
                              type="button"
                              onClick={() => setLineup((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                              className="h-11 cursor-pointer rounded-xl border border-[#fecdd3] px-3 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#23466f]">
                            <input
                              type="checkbox"
                              checked={person.attachHeadshot}
                              onChange={(e) => updateLineup(index, { attachHeadshot: e.target.checked })}
                              className="h-4 w-4 accent-[#E91E8C]"
                            />
                            Attach headshot to flyer
                          </label>
                          {person.attachHeadshot && (
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#edf2f7] bg-white p-3 text-sm font-semibold text-[#23466f]">
                                <input
                                  type="radio"
                                  checked={person.headshotSource === "upload"}
                                  onChange={() => updateLineup(index, { headshotSource: "upload" })}
                                  className="h-4 w-4 accent-[#E91E8C]"
                                />
                                Upload headshot
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#edf2f7] bg-white p-3 text-sm font-semibold text-[#23466f]">
                                <input
                                  type="radio"
                                  checked={person.headshotSource === "ai"}
                                  onChange={() => updateLineup(index, { headshotSource: "ai" })}
                                  className="h-4 w-4 accent-[#E91E8C]"
                                />
                                Auto Generate
                              </label>
                              {person.headshotSource === "upload" ? (
                                <div className="md:col-span-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => updateLineup(index, { headshotFileName: e.target.files?.[0]?.name || "" })}
                                  className="block w-full cursor-pointer rounded-xl border border-[#d9e2ec] bg-white px-3 py-2 text-sm text-[#23466f] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#07182f] file:px-4 file:py-2 file:font-bold file:text-white"
                                />
                                <p className="mt-1 text-xs text-[#94a3b8]">Recommended: 400×400px square, max 2MB</p>
                                </div>
                              ) : (
                                <>
                                <button
                                  type="button"
                                  onClick={() => generateHeadshot(index)}
                                  className="inline-flex w-fit cursor-pointer items-center justify-center rounded-xl bg-[#E91E8C] px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-[#C4166F] md:col-span-2"
                                >
                                  Auto Generate Headshot
                                </button>
                                <p className="text-xs text-[#94a3b8] md:col-span-2">Headshot will be auto-cropped to 400×400px. For uploaded images, crop to a square before uploading for best results.</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#23466f]">
                      <input
                        type="checkbox"
                        checked={form.after_party_enabled}
                        onChange={(e) => setForm({ ...form, after_party_enabled: e.target.checked })}
                        className="h-4 w-4 accent-[#E91E8C]"
                      />
                      Include after party location
                    </label>
                    {form.after_party_enabled && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input
                          value={form.after_party_location}
                          onChange={(e) => setForm({ ...form, after_party_location: e.target.value })}
                          className="h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                          placeholder="After party venue or address"
                        />
                        <div className="relative">
                          <input
                            id="after-party-time-input"
                            list="after-party-time-slots"
                            value={form.after_party_time}
                            onChange={(e) => setForm({ ...form, after_party_time: e.target.value })}
                            className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 pr-11 text-sm outline-none focus:border-[#E91E8C]"
                            placeholder="Select or type after party time"
                          />
                          <button
                            type="button"
                            onClick={() => openEditableTimeDropdown("after-party-time-input")}
                            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#23466f] hover:bg-[#f8fafc]"
                            aria-label="Open after party time options"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <datalist id="after-party-time-slots">
                            {timeSlots.map((slot) => (
                              <option key={slot} value={slot} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    )}
                  </fieldset>
                </div>
                </>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Dress code - Male</span>
                    <input
                      value={form.male_dress_code}
                      onChange={(e) => setForm({ ...form, male_dress_code: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                      placeholder="Black suit, agbada, senator"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Dress code - Female</span>
                    <input
                      value={form.female_dress_code}
                      onChange={(e) => setForm({ ...form, female_dress_code: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                      placeholder="Evening gown, aso ebi, all white"
                    />
                  </label>
                </div>
              )}

              <fieldset className="mt-5 rounded-xl border border-[#d9e2ec] p-4">
                <legend className="px-2 text-sm font-semibold text-[#23466f]">
                  {mode === "event" ? "Flyer or banner image" : "Invite picture"}
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#edf2f7] p-3 text-sm font-semibold text-[#23466f]">
                    <input
                      type="radio"
                      checked={form.media_source === "upload"}
                      onChange={() => setForm({ ...form, media_source: "upload" })}
                      className="h-4 w-4 accent-[#E91E8C]"
                    />
                    Upload my own image
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#edf2f7] p-3 text-sm font-semibold text-[#23466f]">
                    <input
                      type="radio"
                      checked={form.media_source === "ai"}
                      onChange={() => setForm({ ...form, media_source: "ai" })}
                      className="h-4 w-4 accent-[#E91E8C]"
                    />
                    Generate image with AI
                  </label>
                </div>
                {form.media_source === "upload" ? (
                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm({ ...form, uploaded_image_name: e.target.files?.[0]?.name || "" })}
                      className="block w-full cursor-pointer rounded-xl border border-[#d9e2ec] px-3 py-2 text-sm text-[#23466f] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#07182f] file:px-4 file:py-2 file:font-bold file:text-white"
                    />
                    <p className="text-xs text-[#94a3b8]">Recommended: 1920×1080px, max 10MB</p>
                  </label>
                ) : (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={form.image_prompt}
                      onChange={(e) => setForm({ ...form, image_prompt: e.target.value })}
                      className="min-h-24 w-full resize-none rounded-xl border border-[#d9e2ec] px-3 py-3 text-sm outline-none focus:border-[#E91E8C]"
                      placeholder="Describe the image style, colors, couple, stage, crowd, venue, or mood you want AI to create."
                    />
                    <button
                      type="button"
                      onClick={generateImage}
                      disabled={aiImageGenerating}
                      className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#E91E8C] px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[0_12px_28px_rgba(233,30,140,0.28)] transition hover:bg-[#C4166F] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {aiImageGenerating ? "Generating image..." : "Generate image with AI"}
                    </button>
                  </div>
                )}
              </fieldset>

              <div className="mt-4 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-[#23466f]">
                    {mode === "event" ? "Event description" : "Invite message"}
                  </span>
                  <button
                    type="button"
                    onClick={generateMessage}
                    disabled={aiGenerating}
                    className="cursor-pointer rounded-xl bg-[#E91E8C] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_24px_rgba(233,30,140,0.26)] transition hover:bg-[#C4166F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiGenerating ? "Generating..." : "Auto Generate"}
                  </button>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-32 w-full resize-none rounded-xl border border-[#d9e2ec] px-3 py-3 text-sm outline-none focus:border-[#E91E8C]"
                  placeholder={mode === "event" ? "Describe the event for public discovery." : "Write the message your guests should receive."}
                  required
                />
              </div>

              {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
              {message && (
                <div className="mt-5 rounded-xl bg-[#f7fbff] px-4 py-4 text-sm text-[#23466f]">
                  <p className="font-semibold text-[#07182f]">{message}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Preview</p>
                      <p className="mt-1 font-bold text-[#07182f]">{mode === "event" ? "Flyer ready" : "Invite ready"}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">QR</p>
                      <p className="mt-1 font-bold text-[#07182f]">Ready</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">
                        {mode === "event" ? "Discover" : "Channels"}
                      </p>
                      <p className="mt-1 font-bold text-[#07182f]">
                        {mode === "event" ? "Publish after signup" : selectedChannelNames.join(" + ")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link href="/register" className="btn-primary justify-center rounded-xl px-6 py-3">
                      Continue with account
                    </Link>
                    <Link href="/contact" className="justify-center rounded-xl border border-[#d9e2ec] px-6 py-3 text-center font-semibold text-[#07182f]">
                      Talk to sales
                    </Link>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (hydrated && mode ? usedTrials[mode] : false)}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#07182f] px-6 text-sm font-bold text-white transition-all hover:bg-[#E91E8C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Preparing preview..." : "Test this feature"}
              </button>
            </form>

            <aside className="rounded-2xl bg-[#07182f] p-6 text-white shadow-[0_18px_48px_rgba(7,24,47,0.22)]">
              {mode === "event" ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff7abf]">Flyer builder</p>
                  <h3 className="mt-3 text-3xl font-black">Discovery preview</h3>
                  <p className="mt-2 text-sm text-white/58">
                    POST EVENT creates a flyer/banner-style preview for Discover Events. Invite delivery pricing does not apply here.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff7abf]">Live estimate</p>
                  <h3 className="mt-3 text-3xl font-black">{formatNaira(selectedPrice)}</h3>
                  <p className="mt-2 text-sm text-white/58">
                    {form.guest_range} guests across {pricingUnits} pricing block{pricingUnits > 1 ? "s" : ""} of 100.
                  </p>

                  <div className="mt-5 space-y-2">
                    {form.delivery_channels.length === 0 ? (
                      <p className="rounded-xl bg-white/8 p-3 text-sm text-white/70">Select at least one channel.</p>
                    ) : (
                      form.delivery_channels.map((channel) => (
                        <div key={channel} className="flex items-center justify-between rounded-xl bg-white/8 p-3 text-sm">
                          <span>{channelLabels[channel]}</span>
                          <strong>{formatNaira(pricing[channel] * pricingUnits)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <div className="mt-8 overflow-hidden rounded-xl bg-white text-[#07182f]">
                <div
                  className="flex min-h-48 flex-col justify-end p-5 text-white bg-cover bg-center"
                  style={{
                    background:
                      form.generated_image_url
                        ? `linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url(${form.generated_image_url})`
                        : form.media_source === "ai" && form.generated_image_ready
                        ? "linear-gradient(135deg, #E91E8C 0%, #07182f 52%, #F5A623 100%)"
                        : form.uploaded_image_name
                        ? "linear-gradient(135deg, #20304a 0%, #6d254f 55%, #0f172a 100%)"
                        : "linear-gradient(135deg, #0f172a 0%, #263b5e 50%, #E91E8C 100%)",
                    backgroundSize: form.generated_image_url ? "cover" : undefined,
                  }}
                >
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/68">
                    {mode === "event" ? "Event flyer" : "Invite flyer"}
                  </p>
                  <h4 className="mt-3 text-3xl font-black leading-tight">{form.title || "Your Event Title"}</h4>
                  <p className="mt-2 text-sm text-white/78">
                    {detailsToBeCommunicated ? "Venue to be communicated" : form.venue || "Event venue"}
                  </p>
                </div>
                <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
                    {mode === "event" ? "Public event flyer" : "Invite flyer preview"}
                  </span>
                  <span className="rounded-full bg-[#fff1f8] px-2 py-1 text-xs font-bold text-[#E91E8C]">
                    {mode === "invite" ? selectedQrDelivery.label : "QR"}
                  </span>
                </div>
                <h4 className="text-xl font-black">{form.title || "Your Event Title"}</h4>
                <p className="mt-1 text-sm text-[#64748b]">{form.host_name || "Host name"}</p>
                <p className="mt-1 text-xs font-semibold text-[#E91E8C]">
                  {mode === "event" ? "Listed for discovery and tickets" : "Private guest-list invite"}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-[#f8fafc] p-2">
                    <dt className="font-bold uppercase tracking-widest text-[#94a3b8]">Date</dt>
                    <dd className="mt-1 font-semibold">{detailsToBeCommunicated ? "To be communicated" : form.event_date || "Event date"}</dd>
                  </div>
                  <div className="rounded-lg bg-[#f8fafc] p-2">
                    <dt className="font-bold uppercase tracking-widest text-[#94a3b8]">Time</dt>
                    <dd className="mt-1 font-semibold">{detailsToBeCommunicated ? "To be communicated" : form.event_time || "Event time"}</dd>
                  </div>
                  {mode === "invite" ? (
                    <>
                      <div className="rounded-lg bg-[#f8fafc] p-2">
                        <dt className="font-bold uppercase tracking-widest text-[#94a3b8]">Male</dt>
                        <dd className="mt-1 font-semibold">{form.male_dress_code || "Dress code"}</dd>
                      </div>
                      <div className="rounded-lg bg-[#f8fafc] p-2">
                        <dt className="font-bold uppercase tracking-widest text-[#94a3b8]">Female</dt>
                        <dd className="mt-1 font-semibold">{form.female_dress_code || "Dress code"}</dd>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg bg-[#f8fafc] p-2">
                        <dt className="font-bold uppercase tracking-widest text-[#94a3b8]">Gate fee</dt>
                        <dd className="mt-1 font-semibold">{form.gate_fee || "Free / ticket fee"}</dd>
                      </div>
                      <div className="rounded-lg bg-[#f8fafc] p-2">
                        <dt className="font-bold uppercase tracking-widest text-[#94a3b8]">Social</dt>
                        <dd className="mt-1 font-semibold">
                          {selectedSocialPlatform.label}: {form.social_handle || selectedSocialPlatform.placeholder}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
                <p className="mt-4 text-sm text-[#23466f]">
                  {form.description || "Your AI-generated or edited message will appear here in the test preview."}
                </p>
                {mode === "event" && form.headliners && (
                  <p className="mt-3 rounded-lg bg-[#fff1f8] p-3 text-sm font-semibold text-[#C4166F]">
                    Featuring: {form.headliners}
                  </p>
                )}
                {mode === "invite" && (
                  <p className="mt-3 rounded-lg bg-[#f8fafc] p-3 text-xs font-semibold text-[#64748b]">
                    Sent via {selectedChannelNames.length ? selectedChannelNames.join(" + ") : "selected channels"} to {form.guest_range} guests. {selectedQrDelivery.description}
                  </p>
                )}
                {(mode === "event" || form.qr_delivery !== "without_qr") && (
                  <div className="mt-5 grid h-24 w-24 animate-pulse grid-cols-5 gap-1 rounded-lg bg-[#f8fafc] p-2 shadow-[0_0_0_4px_rgba(233,30,140,0.08)]">
                    {Array.from({ length: 25 }).map((_, index) => (
                      <span
                        key={index}
                        className={`rounded-sm ${[0, 1, 2, 5, 10, 12, 14, 18, 20, 21, 22, 24].includes(index) ? "bg-[#07182f]" : "bg-white"}`}
                      />
                    ))}
                  </div>
                )}
                {mode === "invite" && form.qr_delivery === "qr_later" && (
                  <div className="mt-4 rounded-lg bg-[#fff1f8] p-3 text-xs font-semibold text-[#C4166F]">
                    Later QR send: {form.qr_later_title || "QR accreditation details"} - {form.qr_later_message || "Message and image can be prepared now or added when you return."}
                  </div>
                )}
                {trialComplete && (
                  <div className="mt-5 rounded-xl bg-[#ecfdf5] p-3 text-sm text-[#047857]">
                    {mode === "event"
                      ? "Test result: flyer preview created. Signup is required before download and publishing to Discover Events."
                      : `Test result: invite preview created with ${selectedQrDelivery.label.toLowerCase()}. Signup is required before real sending.`}
                  </div>
                )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
