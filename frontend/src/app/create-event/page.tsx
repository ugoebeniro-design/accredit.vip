"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { apiClient } from "@/lib/api-client";
import { aiChat, generateFlier, parseFlier } from "@/lib/api/ai";

const DRAFT_KEY = "accredit_event_draft";
const DRAFT_KEYS: Record<string, string> = { invite: "accredit_draft_invite", event: "accredit_draft_event" };

const DEFAULT_FORM = {
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
  qr_message: "",
  invite_template: "elegant" as InviteTemplate | null,
  qr_style: "pulsing" as QRStyle,
  event_template: null as EventTemplate,
};

type Mode = "invite" | "event";
type Channel = "email" | "whatsapp" | "sms";
type QrDeliveryOption = "with_qr" | "without_qr" | "qr_later";
type SocialPlatform = "instagram" | "x" | "facebook" | "tiktok" | "linkedin" | "website" | "other";
type InviteTemplate = "elegant" | "bold" | "minimal" | "vibrant" | "corporate";
type QRStyle = "pulsing" | "rotating" | "gradient" | "neon" | "bounce" | "custom";
type EventTemplate = "elegant" | "bold" | "minimal" | "vibrant" | "corporate" | null;
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

const inviteTemplates: Array<{
  value: InviteTemplate | null;
  label: string;
  description: string;
  bestFor: string;
  icon: (props: any) => React.ReactNode
}> = [
  {
    value: null,
    label: "Use My Own",
    description: "No template - use your custom design",
    bestFor: "Custom, branded invitations",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: "elegant",
    label: "Elegant",
    description: "Classic, sophisticated, timeless",
    bestFor: "Weddings, formal galas, upscale events",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2.293-2.293a1 1 0 00-1.414 0L10 12.586 5.707 8.293a1 1 0 00-1.414 0L2 10.586V19a2 2 0 002 2h16a2 2 0 002-2V7z" />
      </svg>
    ),
  },
  {
    value: "bold",
    label: "Bold",
    description: "Vibrant, energetic, eye-catching",
    bestFor: "Concerts, festivals, nightlife, parties",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Clean, simple, plenty of breathing room",
    bestFor: "Corporate events, conferences, seminars",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
      </svg>
    ),
  },
  {
    value: "vibrant",
    label: "Vibrant",
    description: "Fun, colorful, playful, modern",
    bestFor: "Birthdays, celebrations, social events",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    value: "corporate",
    label: "Corporate",
    description: "Professional, business-ready",
    bestFor: "Business meetings, professional events",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.217m0 0a9.01 9.01 0 00-5.566 0m5.566 0A8.973 8.973 0 0019 21m0 0h2" />
      </svg>
    ),
  },
];

const qrStyles: Array<{ value: string; label: string; description: string; bestFor: string; icon: (props: any) => React.ReactNode }> = [
  {
    value: "pulsing",
    label: "Pulsing",
    description: "Subtle glow with pulsing animation",
    bestFor: "Elegant, premium feel",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: "rotating",
    label: "Rotating",
    description: "Spinning QR with rotation effect",
    bestFor: "Dynamic, attention-grabbing",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    value: "gradient",
    label: "Gradient",
    description: "Color shift animation",
    bestFor: "Modern, vibrant events",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    value: "neon",
    label: "Neon",
    description: "Bright neon glow effect",
    bestFor: "Nightlife, parties, concerts",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    value: "bounce",
    label: "Bounce",
    description: "Bouncing/scaling animation",
    bestFor: "Fun, playful events",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    ),
  },
  {
    value: "custom",
    label: "Use My Own",
    description: "Upload your custom QR code",
    bestFor: "Branded, unique design",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
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

function TimeDropdown({ value, onChange, disabled, id }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 pr-11 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
        placeholder={disabled ? "To be communicated" : "Select or type time"}
        required={!disabled}
      />
      {!disabled && (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#23466f] hover:bg-[#f8fafc]"
            aria-label="Open time options"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {open && (
            <div className="absolute z-50 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-[#d9e2ec] bg-white shadow-lg">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(slot); setOpen(false); }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#f8fafc] ${value === slot ? "font-bold text-[#E91E8C]" : "text-[#23466f]"}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = MONTHS[date.getMonth()];
  const ordinal = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
  return `${weekday} ${d}${ordinal} ${monthName}, ${y}`;
}

function parseDateParts(isoDate: string) {
  if (!isoDate) return { day: "", month: "", year: "" };
  const [y, m, d] = isoDate.split("-");
  return { day: d || "", month: m || "", year: y || "" };
}


function dataUriToBlob(dataUri: string): Blob {
  const [meta, base64] = dataUri.split(",");
  const mime = meta?.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function resizeImage(file: File, maxW: number, maxH: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxW && height <= maxH) {
        resolve(file);
        return;
      }
      const ratio = Math.min(maxW / width, maxH / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else resolve(file);
      }, file.type);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

const templateStyles: Record<string, { headerBg: string; bodyBg: string; fontClass: string; accent: string; textColor: string }> = {
  elegant: { headerBg: "linear-gradient(135deg,#F5F0E8,#E8D9A0)", bodyBg: "#FDFAF3", fontClass: "font-serif", accent: "#B8860B", textColor: "#2d2416" },
  bold: { headerBg: "#000", bodyBg: "#111", fontClass: "font-sans font-black", accent: "#ef4444", textColor: "#ffffff" },
  minimal: { headerBg: "#f5f5f5", bodyBg: "#fff", fontClass: "font-light", accent: "#6b7280", textColor: "#333333" },
  vibrant: { headerBg: "linear-gradient(135deg,#7C3AED,#EC4899)", bodyBg: "#fdf4ff", fontClass: "font-sans", accent: "#7C3AED", textColor: "#ffffff" },
  corporate: { headerBg: "#0D1B2A", bodyBg: "#fff", fontClass: "font-sans", accent: "#0D1B2A", textColor: "#ffffff" },
};

const qrStyleConfig: Record<string, { wrapper: string; square: string }> = {
  pulsing: { wrapper: "animate-pulse", square: "" },
  rotating: { wrapper: "animate-spin [animation-duration:3s]", square: "" },
  gradient: { wrapper: "", square: "bg-gradient-to-br from-[#E91E8C] to-[#07182f]" },
  neon: { wrapper: "", square: "bg-[#00ff88] shadow-[0_0_6px_#00ff88]" },
  bounce: { wrapper: "", square: "animate-bounce" },
};

export default function CreateEventPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [fingerprint, setFingerprint] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [usedTrials, setUsedTrials] = useState<Record<Mode, boolean>>({ invite: false, event: false });
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | null>(null);
  const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);
  const [venueSuggestionsOpen, setVenueSuggestionsOpen] = useState(false);
  const [trialComplete, setTrialComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [passPackages, setPassPackages] = useState<PassPackage[]>([
    { name: "Regular", price: "" },
  ]);
  const [socialHandles, setSocialHandles] = useState<SocialHandle[]>([
    { platform: "instagram", handle: "" },
  ]);
  const [lineup, setLineup] = useState<LineupPerson[]>([
    {
      role: "",
      name: "",
      attachHeadshot: true,
      headshotSource: "upload",
      headshotFileName: "",
      generatedHeadshot: false,
    },
  ]);
  // Date picker parts — tracked independently so partial selections aren't lost
  const [dayPart, setDayPart] = useState("");
  const [monthPart, setMonthPart] = useState("");
  const [yearPart, setYearPart] = useState("");

  // AI generation errors
  const [aiImageError, setAiImageError] = useState("");
  const [aiGenerateError, setAiGenerateError] = useState("");

  // Flier upload / parse state
  const [flierParsing, setFlierParsing] = useState(false);
  const [flierPreview, setFlierPreview] = useState<string | null>(null);
  const [flierParsed, setFlierParsed] = useState(false);
  const [flierParseError, setFlierParseError] = useState("");

  // Email input modal for test invites
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");

  // Event preview modal for test events
  const [eventPreviewUrl, setEventPreviewUrl] = useState<string | null>(null);

  // Invitation flyer preview modal
  const [inviteFlyer, setInviteFlyer] = useState<string | null>(null);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const autoResize = useCallback(() => {
    const el = descriptionRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem("accredit_last_mode") as Mode | null;
    if (savedMode) setMode(savedMode);
    const key = DRAFT_KEYS[savedMode || "invite"];
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.form) setForm(parsed.form);
        if (parsed.passPackages) setPassPackages(parsed.passPackages);
        if (parsed.socialHandles) setSocialHandles(parsed.socialHandles);
        if (parsed.lineup) setLineup(parsed.lineup);
        if (parsed.uploadedImageData) {
          setUploadedImageData(parsed.uploadedImageData);
          setUploadedImagePreviewUrl(URL.createObjectURL(dataUriToBlob(parsed.uploadedImageData)));
        }
        if (parsed.form?.event_date) {
          const parts = parseDateParts(parsed.form.event_date);
          setDayPart(String(parseInt(parts.day || "0", 10)) || "");
          setMonthPart(parts.month || "");
          setYearPart(parts.year || "");
        }
      } catch {}
    }
    const timer = window.setTimeout(() => {
      setFingerprint(getTrialFingerprint());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || !mode) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEYS[mode], JSON.stringify({ form, passPackages, socialHandles, lineup, uploadedImageData }));
      localStorage.setItem("accredit_last_mode", mode);
    }, 300);
    return () => clearTimeout(timer);
  }, [form, passPackages, socialHandles, lineup, uploadedImageData, mode, hydrated]);

  useEffect(() => {
    return () => {
      if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
    };
  }, [uploadedImagePreviewUrl]);

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
  const visibleLineup = lineup.filter((item) => item.role.trim() && item.name.trim());

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
        const result = await parseFlier(dataUrl, file.type) as Record<string, unknown>;

        const str = (v: unknown) => (typeof v === "string" ? v : "");
        const num = (v: unknown) => (typeof v === "number" ? v : 0);

        setForm((prev) => ({
          ...prev,
          title: str(result.title) || prev.title,
          host_name: str(result.host_name) || prev.host_name,
          venue: str(result.venue) || prev.venue,
          male_dress_code: str(result.dress_code) || prev.male_dress_code,
          description: str(result.description) || prev.description,
          category: str(result.category) || prev.category,
          gate_fee: num(result.ticket_price) > 0 ? String(result.ticket_price) : prev.gate_fee,
          event_time: str(result.event_time) || prev.event_time,
          after_party_enabled: !!(result.after_party_location) || prev.after_party_enabled,
          after_party_location: str(result.after_party_location) || prev.after_party_location,
          after_party_time: str(result.after_party_time) || prev.after_party_time,
        }));

        // Sync date parts if a date was extracted
        const rawDate = str(result.event_date);
        if (rawDate) {
          const parts = parseDateParts(rawDate);
          const d = String(parseInt(parts.day || "0", 10));
          if (d && d !== "0") { setDayPart(d); setMonthPart(parts.month); setYearPart(parts.year); }
          setForm((prev) => ({ ...prev, event_date: rawDate }));
        }

        if (Array.isArray(result.lineup) && result.lineup.length > 0) {
          setLineup(result.lineup.map((p: { role?: string; name?: string }) => ({
            role: p.role || "", name: p.name || "",
            attachHeadshot: false, headshotSource: "upload" as const, headshotFileName: "", generatedHeadshot: false,
          })));
        }
        if (Array.isArray(result.pass_packages) && result.pass_packages.length > 0) {
          setPassPackages(result.pass_packages.map((p: { name?: string; price?: string }) => ({
            name: p.name || "", price: p.price || "",
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

  const generateMessage = async () => {
    if (!hydrated || !mode) return;
    setAiGenerateError("");
    setAiGenerating(true);
    try {
      const dateLine = detailsToBeCommunicated ? "to be communicated" : formatDisplayDate(form.event_date) || "your selected date";
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

      if (mode === "event") {
        const categoryText = form.category ? ` Category: ${form.category}.` : "";
        const dressText = form.male_dress_code ? ` Dress code: ${form.male_dress_code}.` : "";
        const context = `Write a compelling event description for a public listing: ${title} hosted by ${host}.${categoryText}${passText}${lineupText}${afterPartyText}${socialText}${dressText}`;
        const reply = await aiChat([{ role: "user", text: `Generate a 2-4 sentence event description for a public listing. NEVER include the date, time, venue, ticket prices, or dress code — those are shown separately. Focus only on atmosphere, highlights, and what makes this event special. Context for reference only (do NOT write it): Date: ${dateLine}, Time: ${timeLine}, Venue: ${venueLine}.\n\n${context}` }]);
        setForm((current) => ({ ...current, description: reply }));
      } else {
        const context = `Write a warm invitation message for a private invite: ${title} hosted by ${host}.${passText}${lineupText}${afterPartyText}${socialText}`;
        const reply = await aiChat([{ role: "user", text: `Write ONLY the warm welcome paragraph of an invitation from ${host}. Use their actual name — no placeholders like [Host's Name] or [Guest Name]. Address the reader as "you". NEVER include the date, time, venue, or dress code — those are shown separately. Focus purely on atmosphere, what makes this event special, and the feeling of being invited. Details for context only (do NOT write them): Date: ${dateLine}, Time: ${timeLine}. Venue: ${venueLine}.\n\n${context}` }]);
        setForm((current) => ({ ...current, description: reply }));
      }
    } catch {
      setAiGenerateError("Auto-generation is unavailable right now. Please write your message manually.");
      setForm((current) => ({ ...current, description: "Unable to generate message. Please write manually." }));
    } finally {
      setAiGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!hydrated || !mode) return;
    setAiImageGenerating(true);
    try {
      const autoPrompt = [
        form.title ? `Premium flyer for "${form.title}".` : "Premium event flyer.",
        form.category ? `Category: ${form.category}.` : "",
        form.venue ? `Venue: ${form.venue}.` : "",
        form.male_dress_code ? `Dress code: ${form.male_dress_code}.` : "",
        form.event_date ? `Date: ${form.event_date}.` : "",
        form.event_time ? `Time: ${form.event_time}.` : "",
        visibleLineup.length
          ? `Featuring: ${visibleLineup.slice(0, 3).map((p) => p.name).filter(Boolean).join(", ")}.`
          : "",
        "Bold poster typography, vibrant colors, professional design. NO text, words, letters, numbers, or dates on the image.",
      ].filter(Boolean).join(" ");
      const prompt = form.image_prompt.trim() || autoPrompt;
      setAiImageError("");
      const url = await generateFlier(prompt);
      setForm((current) => ({
        ...current,
        media_source: "ai",
        generated_image_ready: true,
        generated_image_url: url,
        image_prompt: current.image_prompt || autoPrompt,
      }));
    } catch (err) {
      setAiImageError("Could not generate image. Please try again later or upload your own.");
    } finally {
      setAiImageGenerating(false);
    }
  };

  const showEmailModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode || !fingerprint) return;
    if (mode === "invite") {
      if (form.delivery_channels.length === 0) {
        setError("Select at least one delivery channel to test.");
        return;
      }
      setEmailModalOpen(true);
      setError("");
    } else {
      runTrial();
    }
  };

  const runTrial = async () => {
    if (!mode || !fingerprint) return;

    setError("");
    setMessage("");
    setTrialComplete(false);
    setSubmitting(true);
    setEmailModalOpen(false);

    try {
      const result = await apiClient<{ flier_url?: string; sent_to?: string; sent_via?: string; flyer_url?: string }>("/trials/use", {
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
            test_email: mode === "invite" ? testEmail : undefined,
            test_phone: mode === "invite" ? testPhone || undefined : undefined,
          },
        },
      });

      if (form.venue.trim()) saveVenue(form.venue.trim());
      localStorage.setItem(`accredit_trial_used_${mode}`, "true");
      setUsedTrials((current) => ({ ...current, [mode]: true }));
      localStorage.removeItem(DRAFT_KEY);
      setTrialComplete(true);

      if (mode === "event" && result.flier_url) {
        setEventPreviewUrl(result.flier_url);
        setMessage("Event flier preview generated! Here's what your event will look like on Discover Events:");
      } else if (mode === "invite" && result.sent_to) {
        const viaText = result.sent_via ? ` via ${result.sent_via}` : "";
        if (result.flyer_url) {
          setInviteFlyer(result.flyer_url);
          setMessage(`✓ Test invitation flyer sent to ${result.sent_to}${viaText}. Here's the beautiful invitation your guests will see:`);
        } else {
          setMessage(`✓ Test invite sent to ${result.sent_to}${viaText}. Check your messages to see the invitation flyer. Create an account to send real invites to your guest list.`);
        }
      } else {
        setMessage(mode === "event"
          ? "Event preview ready. Create an account to publish to Discover Events."
          : `Invite preview sent. Create an account to send to your full guest list.`
        );
      }
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
                The test previews exactly what your guests will see — no payment required.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e8edf2] bg-[#f8f9fc] p-4 sm:p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">
                Choose one to get started
              </p>
              {/* Flier upload shortcut — gated by mode selection */}
              {!mode ? (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-amber-800">Please select CREATE INVITE or POST EVENT first</p>
                </div>
              ) : flierParsing ? (
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-white border border-[#e8edf2] px-4 py-3">
                  <div className="w-4 h-4 rounded-full border-2 border-[#E91E8C] border-t-transparent animate-spin flex-shrink-0" />
                  <p className="text-sm font-semibold text-[#0D1B2A]">AI is reading your flier…</p>
                </div>
              ) : flierParsed ? (
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-white border border-[#e8edf2] px-4 py-3">
                  {flierPreview && <img src={flierPreview} alt="Flier" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-600">Flier parsed — form pre-filled</p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">Review the fields below and adjust as needed</p>
                  </div>
                  <label className="cursor-pointer text-xs font-bold text-[#E91E8C] hover:underline flex-shrink-0">
                    Change
                    <input type="file" accept="image/*" className="sr-only" onChange={handleFlierUpload} disabled={!mode} />
                  </label>
                </div>
              ) : (
                <label className={`mb-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors ${mode ? "border-[#d9e2ec] bg-white hover:border-[#E91E8C]" : "border-gray-300 bg-gray-50 cursor-not-allowed opacity-50"}`}>
                  <div className="w-8 h-8 rounded-lg bg-[#fff1f8] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0D1B2A]">Already have a flier? Upload to auto-fill</p>
                    <p className="text-xs text-[#94a3b8] truncate">AI extracts title, date, lineup, tickets and more</p>
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFlierUpload} disabled={!mode} />
                </label>
              )}
              {flierParseError && (
                <p className="mb-2 text-xs text-amber-600 font-medium px-1">{flierParseError}</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    const newMode = mode === "invite" ? null : "invite";
                    if (newMode !== mode) {
                      setForm({ ...DEFAULT_FORM });
                      setPassPackages([{ name: "Regular", price: "" }]);
                      setSocialHandles([{ platform: "instagram", handle: "" }]);
                      setLineup([{ role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }]);
                      if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
                      setUploadedImagePreviewUrl(null);
                      setUploadedImageData(null);
                      setDayPart(""); setMonthPart(""); setYearPart("");
                      setFlierPreview(null); setFlierParsed(false); setFlierParseError("");
                    }
                    setMode(() => newMode);
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
                    const newMode = mode === "event" ? null : "event";
                    if (newMode !== mode) {
                      setForm({ ...DEFAULT_FORM });
                      setPassPackages([{ name: "Regular", price: "" }]);
                      setSocialHandles([{ platform: "instagram", handle: "" }]);
                      setLineup([{ role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }]);
                      if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
                      setUploadedImagePreviewUrl(null);
                      setUploadedImageData(null);
                      setDayPart(""); setMonthPart(""); setYearPart("");
                      setFlierPreview(null); setFlierParsed(false); setFlierParseError("");
                    }
                    setMode(() => newMode);
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
                  <strong className="block text-xl font-black text-[#07182f]">POST EVENT</strong>
                  <span className="mt-2 block text-sm text-gray-500">
                    Public listing on Discover Events, ticket sales, flyer/banner, lineup, gate fee.
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
            <form onSubmit={showEmailModal} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-block px-3 py-1.5 rounded-lg" style={{ background: "rgba(233,30,140,0.1)" }}>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">
                      {mode === "event" ? "Post Event Test" : "Create Invite Test"}
                    </p>
                  </div>
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

              {/* Flier upload strip — POST EVENT only */}
              {mode === "event" && (
                <div className="mb-6">
                  {flierParsing ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#e8edf2] bg-[#f8f9fc] px-4 py-3">
                      <div className="w-4 h-4 rounded-full border-2 border-[#E91E8C] border-t-transparent animate-spin flex-shrink-0" />
                      <p className="text-sm font-semibold text-[#0D1B2A]">AI is reading your flier and filling the form…</p>
                    </div>
                  ) : flierParsed ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#e8edf2] bg-[#f8f9fc] px-4 py-3">
                      {flierPreview && <img src={flierPreview} alt="Flier" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-600">Flier parsed — form pre-filled below</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">Review each field and make any corrections before testing</p>
                      </div>
                      <label className="cursor-pointer text-xs font-bold text-[#E91E8C] hover:underline flex-shrink-0">
                        Change
                        <input type="file" accept="image/*" className="sr-only" onChange={handleFlierUpload} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#d9e2ec] bg-[#f8f9fc] px-4 py-3 hover:border-[#E91E8C] transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#e8edf2] flex items-center justify-center flex-shrink-0 group-hover:border-[#E91E8C] transition-colors">
                        <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0D1B2A]">Have a flier? Upload it to auto-fill this form</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">AI extracts title, date, venue, lineup, tickets, dress code and more</p>
                      </div>
                      <span className="flex-shrink-0 rounded-lg border border-[#E91E8C] px-3 py-1.5 text-xs font-bold text-[#E91E8C] group-hover:bg-[#fff1f8] transition-colors">
                        Upload
                      </span>
                      <input type="file" accept="image/*" className="sr-only" onChange={handleFlierUpload} />
                    </label>
                  )}
                  {flierParseError && (
                    <p className="mt-2 text-xs font-medium text-amber-600">{flierParseError}</p>
                  )}
                </div>
              )}

              {/* Event template selection — POST EVENT only */}
              {mode === "event" && (
                <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                  <legend className="px-2 text-sm font-semibold text-[#23466f]">Event flyer style</legend>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {inviteTemplates.filter(t => t.value !== null).map((template) => (
                      <div
                        key={String(template.value)}
                        onClick={() => setForm({ ...form, event_template: form.event_template === template.value ? null : (template.value as EventTemplate) })}
                        className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all ${
                          form.event_template === template.value
                            ? "border-[#E91E8C] bg-pink-50 ring-2 ring-[#E91E8C]/20"
                            : "border-[#edf2f7] bg-white hover:border-[#E91E8C]/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            {typeof template.icon === 'function' && (
                              <div className="h-8 w-8 text-[#E91E8C] flex-shrink-0">
                                {template.icon({ className: "w-full h-full" })}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#23466f]">{template.label}</p>
                              <p className="text-xs text-[#64748b] leading-4 mt-1">{template.description}</p>
                            </div>
                          </div>
                          <input
                            type="radio"
                            checked={form.event_template === template.value}
                            onChange={() => {}}
                            className="h-4 w-4 accent-[#E91E8C] flex-shrink-0 mt-1"
                          />
                        </div>
                        <p className="text-xs font-semibold text-[#E91E8C] px-2 py-1.5 bg-pink-100/50 rounded-lg">
                          Best for: {template.bestFor}
                        </p>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}

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
                  <div className="flex gap-2">
                    <select
                      value={dayPart}
                      onChange={(e) => {
                        const d = e.target.value;
                        setDayPart(d);
                        if (d && monthPart && yearPart) {
                          setForm((f) => ({ ...f, event_date: `${yearPart}-${monthPart}-${d.padStart(2, "0")}` }));
                        }
                      }}
                      disabled={detailsToBeCommunicated}
                      className="h-11 w-20 rounded-xl border border-[#d9e2ec] px-2 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
                      required={!detailsToBeCommunicated}
                    >
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                      ))}
                    </select>
                    <select
                      value={monthPart}
                      onChange={(e) => {
                        const m = e.target.value;
                        setMonthPart(m);
                        if (dayPart && m && yearPart) {
                          setForm((f) => ({ ...f, event_date: `${yearPart}-${m}-${dayPart.padStart(2, "0")}` }));
                        }
                      }}
                      disabled={detailsToBeCommunicated}
                      className="h-11 flex-1 rounded-xl border border-[#d9e2ec] px-2 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
                      required={!detailsToBeCommunicated}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((name, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={yearPart}
                      onChange={(e) => {
                        const y = e.target.value;
                        setYearPart(y);
                        if (dayPart && monthPart && y) {
                          setForm((f) => ({ ...f, event_date: `${y}-${monthPart}-${dayPart.padStart(2, "0")}` }));
                        }
                      }}
                      disabled={detailsToBeCommunicated}
                      className="h-11 w-24 rounded-xl border border-[#d9e2ec] px-2 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
                      required={!detailsToBeCommunicated}
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = 2024 + i;
                        return <option key={year} value={String(year)}>{year}</option>;
                      })}
                    </select>
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#23466f]">Time</span>
                  <TimeDropdown
                    id="event-time-input"
                    value={form.event_time}
                    onChange={(v) => setForm({ ...form, event_time: v })}
                    disabled={detailsToBeCommunicated}
                  />
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

                  {/* Venue & Dress Code - moved up */}
                  <label className="relative block space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Venue</span>
                    <input
                      value={form.venue}
                      onChange={(e) => {
                        setForm({ ...form, venue: e.target.value });
                        setVenueSuggestionsOpen(true);
                      }}
                      onFocus={() => setVenueSuggestionsOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setVenueSuggestionsOpen(false);
                        }
                      }}
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

                  {/* Dress code - Male & Female */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[#23466f]">Dress code - Male</span>
                      <input
                        value={form.male_dress_code}
                        onChange={(e) => setForm({ ...form, male_dress_code: e.target.value })}
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                        placeholder="Black suit, agbada, senator"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[#23466f]">Dress code - Female</span>
                      <input
                        value={form.female_dress_code || ""}
                        onChange={(e) => setForm({ ...form, female_dress_code: e.target.value })}
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                        placeholder="Evening gown, aso ebi, all white"
                      />
                    </label>
                  </div>

                  <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                    <legend className="px-2 text-sm font-semibold text-[#23466f]">Invitation template style</legend>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {inviteTemplates.map((template) => (
                        <div
                          key={String(template.value)}
                          onClick={() => setForm({ ...form, invite_template: form.invite_template === template.value ? null : (template.value as InviteTemplate | null) })}
                          className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all ${
                            form.invite_template === template.value
                              ? "border-[#E91E8C] bg-pink-50 ring-2 ring-[#E91E8C]/20"
                              : "border-[#edf2f7] bg-white hover:border-[#E91E8C]/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              {typeof template.icon === 'function' && (
                                <div className="h-8 w-8 text-[#E91E8C] flex-shrink-0">
                                  {template.icon({ className: "w-full h-full" })}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#23466f]">{template.label}</p>
                                <p className="text-xs text-[#64748b] leading-4 mt-1">{template.description}</p>
                              </div>
                            </div>
                            <input
                              type="radio"
                              checked={form.invite_template === template.value}
                              onChange={() => {}}
                              className="h-4 w-4 accent-[#E91E8C] flex-shrink-0 mt-1"
                            />
                          </div>
                          <p className="text-xs font-semibold text-[#E91E8C] px-2 py-1.5 bg-pink-100/50 rounded-lg">
                            Best for: {template.bestFor}
                          </p>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {/* QR code option - AFTER template */}
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

                    {/* Animated QR style - ONLY when "With QR" is selected */}
                    {form.qr_delivery === "with_qr" && (
                      <>
                        <div className="mt-4 rounded-xl bg-pink-50 border border-[#E91E8C]/20 p-3">
                          <p className="text-xs font-semibold text-[#E91E8C] mb-3">Choose your animated QR style:</p>
                          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                            {qrStyles.map((style) => (
                              <div
                                key={style.value}
                                onClick={() => setForm({ ...form, qr_style: form.qr_style === style.value ? "pulsing" : (style.value as QRStyle) })}
                                className={`flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-3 text-sm transition-all ${
                                  form.qr_style === style.value
                                    ? "border-[#E91E8C] bg-white ring-2 ring-[#E91E8C]/20"
                                    : "border-[#edf2f7] bg-white hover:border-[#E91E8C]/50"
                                }`}
                              >
                                <div className="h-8 w-8 text-[#E91E8C]">
                                  {style.icon({ className: "w-full h-full" })}
                                </div>
                                <p className="font-bold text-[#23466f] text-xs">{style.label}</p>
                                <p className="text-xs text-[#64748b] leading-3">{style.description}</p>
                                <p className="text-xs font-semibold text-[#E91E8C]">{style.bestFor}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <textarea
                            value={form.qr_message}
                            onChange={(e) => setForm({ ...form, qr_message: e.target.value })}
                            className="min-h-20 w-full resize-none rounded-xl border border-[#d9e2ec] bg-white px-3 py-3 text-sm outline-none focus:border-[#E91E8C]"
                            placeholder="Optional message to accompany the QR code (e.g. 'Attached to this invite is your QR code. Kindly present it at the event for entry.')"
                          />
                        </div>
                      </>
                    )}

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
                              Upload QR
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#edf2f7] bg-white p-3 text-sm font-semibold text-[#23466f]">
                              <input
                                type="radio"
                                checked={form.qr_later_media_source === "ai"}
                                onChange={() => setForm({ ...form, qr_later_media_source: "ai" })}
                                className="h-4 w-4 accent-[#E91E8C]"
                              />
                              Generate QR
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
className="block w-full cursor-pointer rounded-xl border border-[#d9e2ec] bg-white px-3 py-2 text-sm text-[#23466f] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#E91E8C] file:px-4 file:py-2 file:font-bold file:text-white file:hover:bg-[#C4166F]"
                            />
                            <p className="mt-1 text-xs text-[#94a3b8]">Recommended: 1200×675px, max 5MB</p>
                           </div>
                        ) : (
                          <input
                            value={form.qr_later_image_prompt}
                            onChange={(e) => setForm({ ...form, qr_later_image_prompt: e.target.value })}
                            className="h-11 w-full rounded-xl border border-[#d9e2ec] bg-white px-3 text-sm outline-none focus:border-[#E91E8C]"
                            placeholder="Describe the QR code design you want AI to generate"
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

              {mode === "event" ? (
                <>
                {/* Note: Venue and Dress Code are now in the invite-specific section above for both CREATE INVITE and POST EVENT modes */}
                <div className="mt-5 space-y-5">
                  <fieldset className="rounded-xl border border-[#d9e2ec] p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <legend className="text-sm font-bold text-[#23466f]">Gate fee / pass packages</legend>
                      <button
                        type="button"
                        onClick={() => setPassPackages((current) => [...current, { name: "", price: "" }])}
                        className="w-fit cursor-pointer rounded-lg bg-[#E91E8C] px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#C4166F]"
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
                        className="w-fit cursor-pointer rounded-lg bg-[#E91E8C] px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#C4166F]"
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
                                  className="block w-full cursor-pointer rounded-xl border border-[#d9e2ec] bg-white px-3 py-2 text-sm text-[#23466f] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#E91E8C] file:px-4 file:py-2 file:font-bold file:text-white file:hover:bg-[#C4166F]"
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
                        <TimeDropdown
                          id="after-party-time-input"
                          value={form.after_party_time}
                          onChange={(v) => setForm({ ...form, after_party_time: v })}
                        />
                      </div>
                    )}
                  </fieldset>
                </div>
                </>
              ) : (
                <div className="mt-4"></div>
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
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        setForm({ ...form, uploaded_image_name: file?.name || "" });
                        if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
                        if (file) {
                          const resized = await resizeImage(file, 1920, 1080);
                          setUploadedImagePreviewUrl(URL.createObjectURL(resized));
                          const reader = new FileReader();
                          reader.onload = () => setUploadedImageData(reader.result as string);
                          reader.readAsDataURL(resized);
                        } else {
                          setUploadedImagePreviewUrl(null);
                          setUploadedImageData(null);
                        }
                      }}
                      className="block w-full cursor-pointer rounded-xl border border-[#d9e2ec] px-3 py-2 text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#E91E8C] file:px-4 file:py-2 file:font-bold file:text-white file:hover:bg-[#C4166F]"
                    />
                    {form.uploaded_image_name && (
                      <p className="text-xs font-medium text-[#23466f]">Selected: {form.uploaded_image_name}</p>
                    )}
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
                    {aiImageError && (
                      <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
                        {aiImageError}
                      </p>
                    )}
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
                {aiGenerateError && (
                  <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
                    {aiGenerateError}
                  </p>
                )}
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
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#E91E8C] px-6 text-sm font-bold text-white transition-all hover:bg-[#C4166F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Preparing preview..." : "Test this feature"}
              </button>
            </form>

            <aside className="sticky top-8 self-start rounded-2xl bg-white p-6 text-[#0D1B2A] shadow-[0_18px_48px_rgba(0,0,0,0.08)] border border-[#e8edf2]">
              {mode === "event" ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">Flyer builder</p>
                  <h3 className="mt-3 text-3xl font-black">Discovery preview</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    POST EVENT creates a flyer/banner-style preview for Discover Events. Invite delivery pricing does not apply here.
                  </p>
                </>
              ) : (
                <div className="rounded-xl bg-gradient-to-br from-[#fef2f8] to-[#fff5f9] p-5 border border-[#fce4f0]">
                  <div className="inline-block px-3 py-1.5 rounded-lg" style={{ background: "rgba(233,30,140,0.1)" }}>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">Live estimate</p>
                  </div>
                  <h3 className="mt-3 text-3xl font-black text-[#0D1B2A]">{formatNaira(selectedPrice)}</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {form.guest_range} guests across {pricingUnits} pricing block{pricingUnits > 1 ? "s" : ""} of 100.
                  </p>

                  <div className="mt-5 space-y-2">
                    {form.delivery_channels.length === 0 ? (
                      <p className="rounded-xl bg-white/80 p-3 text-sm text-gray-500 border border-[#e8edf2]">Select at least one channel.</p>
                    ) : (
                      form.delivery_channels.map((channel) => (
                        <div key={channel} className="flex items-center justify-between rounded-xl bg-white/80 p-3 text-sm border border-[#e8edf2]">
                          <span className="text-gray-700">{channelLabels[channel]}</span>
                          <strong className="text-[#0D1B2A]">{formatNaira(pricing[channel] * pricingUnits)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-5">
                {(uploadedImagePreviewUrl || form.generated_image_url) && (
                  <div className="overflow-hidden rounded-xl bg-white">
                    <img
                      src={uploadedImagePreviewUrl || form.generated_image_url}
                      alt="Event image"
                      className="w-full object-cover"
                    />
                  </div>
                )}
                <div className="overflow-hidden rounded-xl bg-white text-[#07182f]">
                  {(() => {
                    const activeTemplate = mode === "invite" ? form.invite_template : form.event_template;
                    const styles = activeTemplate ? templateStyles[activeTemplate] : null;
                    const headerText = styles ? styles.textColor : "white";
                    return (
                      <>
                        <div
                          className="flex min-h-36 flex-col justify-end p-5"
                          style={{
                            background: styles ? styles.headerBg : (
                              mode === "invite"
                                ? "linear-gradient(135deg, #E91E8C 0%, #07182f 52%, #F5A623 100%)"
                                : "linear-gradient(135deg, #0f172a 0%, #263b5e 50%, #E91E8C 100%)"
                            ),
                            color: headerText,
                          }}
                        >
                          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-75">
                            {mode === "event" ? "Event flyer" : "Invite flyer"}
                          </p>
                          <h4 className="mt-3 text-3xl font-black leading-tight">{form.title || "Your Event Title"}</h4>
                          <p className="mt-2 text-sm opacity-85">
                            {detailsToBeCommunicated ? "Venue to be communicated" : form.venue || "Event venue"}
                          </p>
                        </div>
                        <div className="p-4">
                  <h4 className="text-xl font-black">{form.title || "Your Event Title"}</h4>
                  <p className="mt-1 text-sm text-[#64748b]">{form.host_name || "Host name"}</p>
                    {mode === "event" ? (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-[#f8fafc] p-2">
                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Date</dt>
                          <dd className="mt-1 font-semibold">{formatDisplayDate(form.event_date) || "Event date"}</dd>
                        </div>
                        <div className="rounded-lg bg-[#f8fafc] p-2">
                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Time</dt>
                          <dd className="mt-1 font-semibold">{form.event_time || "Event time"}</dd>
                        </div>
                        <div className="col-span-2 rounded-lg bg-[#f8fafc] p-2">
                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Venue</dt>
                          <dd className="mt-1 font-semibold">{form.venue || "Event venue"}</dd>
                        </div>
                        <div className="col-span-2 rounded-lg bg-[#f8fafc] p-2">
                          <dt className="font-bold uppercase tracking-widest text-[#475569]">
                            {visiblePassPackages.length > 0 ? "Tickets / Gate fee" : "Gate fee"}
                          </dt>
                          {visiblePassPackages.length > 0 ? (
                            visiblePassPackages.map((pkg, i) => (
                              <dd key={i} className="mt-1 font-semibold">
                                {pkg.name}{pkg.price ? ` — ${pkg.price}` : ""}
                              </dd>
                            ))
                          ) : (
                            <dd className="mt-1 font-semibold">Free entry</dd>
                          )}
                        </div>
                        <div className="col-span-2 rounded-lg bg-[#f8fafc] p-2">
                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Dress code</dt>
                        </div>
                        <div className="rounded-lg bg-[#f8fafc] p-2">
                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Male</dt>
                          <dd className="mt-1 font-semibold">{form.male_dress_code || "Not specified"}</dd>
                        </div>
                        <div className="rounded-lg bg-[#f8fafc] p-2">
                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Female</dt>
                          <dd className="mt-1 font-semibold">{form.female_dress_code || "Not specified"}</dd>
                        </div>
                        {visibleSocialHandles.length > 0 && (
                          <div className="rounded-lg bg-[#f8fafc] p-2">
                            <dt className="font-bold uppercase tracking-widest text-[#475569]">Social</dt>
                            <dd className="mt-1 font-semibold truncate">{visibleSocialHandles[0].handle}</dd>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-[#23466f]">
                        {(form.description || "").split(/\n{2,}/).filter((p) => p.trim()).length > 0
                          ? (form.description || "").split(/\n{2,}/).map((para, i) => (
                              <p key={i} dangerouslySetInnerHTML={{ __html: para.replace(/\n/g, "<br />") }} />
                            ))
                          : <p>Your event description will appear here in the test preview.</p>}
                      </div>
                      {visibleLineup.length > 0 && (
                        <p className="mt-3 rounded-lg bg-[#fff1f8] p-3 text-sm font-semibold text-[#C4166F]">
                          Featuring: {visibleLineup.map((p) => p.name).filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {form.after_party_enabled && (
                        <p className="mt-2 rounded-lg bg-[#fff1f8] p-3 text-sm font-semibold text-[#C4166F]">
                          After party at {form.after_party_location || "TBD"}{form.after_party_time ? ` by ${form.after_party_time}` : ""}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mt-4 space-y-3 text-sm text-[#23466f]">
                        <p className="font-semibold">Dear <span className="text-[#E91E8C]">[Guest Name]</span>,</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-[#f8fafc] p-2">
                            <dt className="font-bold uppercase tracking-widest text-[#475569]">Date</dt>
                            <dd className="mt-1 font-semibold">{detailsToBeCommunicated ? "To be communicated" : formatDisplayDate(form.event_date) || "Event date"}</dd>
                          </div>
                          <div className="rounded-lg bg-[#f8fafc] p-2">
                            <dt className="font-bold uppercase tracking-widest text-[#475569]">Time</dt>
                            <dd className="mt-1 font-semibold">{detailsToBeCommunicated ? "To be communicated" : form.event_time || "Event time"}</dd>
                          </div>
                          <div className="col-span-2 rounded-lg bg-[#f8fafc] p-2">
                            <dt className="font-bold uppercase tracking-widest text-[#475569]">Venue</dt>
                            <dd className="mt-1 font-semibold">{detailsToBeCommunicated ? "To be communicated" : form.venue || "Event venue"}</dd>
                          </div>
                          <div className="col-span-2 rounded-lg bg-[#f8fafc] p-2">
                            <dt className="font-bold uppercase tracking-widest text-[#475569]">Dress code</dt>
                          </div>
                          <div className="rounded-lg bg-[#f8fafc] p-2">
                            <dt className="font-bold uppercase tracking-widest text-[#475569]">Male</dt>
                            <dd className="mt-1 font-semibold">{form.male_dress_code || "Not specified"}</dd>
                          </div>
                          <div className="rounded-lg bg-[#f8fafc] p-2">
                            <dt className="font-bold uppercase tracking-widest text-[#475569]">Female</dt>
                            <dd className="mt-1 font-semibold">{form.female_dress_code || "Not specified"}</dd>
                          </div>
                        </div>
                        {(() => {
                          const desc = form.description || "";
                          const paragraphs = desc.split(/\n{2,}/).filter((p) => p.trim());
                          if (paragraphs.length === 0) {
                            return <p className="mt-3">Your AI-generated or edited message will appear here in the test preview.</p>;
                          }
                          return paragraphs.map((para, i) => (
                            <p key={i} dangerouslySetInnerHTML={{ __html: para.replace(/\n/g, "<br />") }} />
                          ));
                        })()}
                      </div>
                    </>
                  )}
                        </div>
                      </>
                    );
                  })()}
                </div>
                {mode === "invite" && form.qr_delivery !== "without_qr" && (
                  <div className="rounded-xl bg-white p-4 text-[#07182f]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">QR code</p>
                    {(form.qr_message || form.qr_delivery === "with_qr") && (
                      <p className="mt-2 text-sm text-[#23466f]">{form.qr_message || "Attached to this invite is your QR code. Kindly present it at the event for entry."}</p>
                    )}
                    <div className={`mt-3 grid h-24 w-24 grid-cols-5 gap-1 rounded-lg bg-[#f8fafc] p-2 shadow-[0_0_0_4px_rgba(233,30,140,0.08)] ${qrStyleConfig[form.qr_style]?.wrapper || "animate-pulse"}`}>
                      {form.qr_style === "custom" ? (
                        <div className="col-span-5 flex items-center justify-center text-[10px] text-gray-400 text-center">Your custom QR design</div>
                      ) : (
                        Array.from({ length: 25 }).map((_, index) => (
                          <span
                            key={index}
                            className={`rounded-sm ${qrStyleConfig[form.qr_style]?.square || ""} ${[0, 1, 2, 5, 10, 12, 14, 18, 20, 21, 22, 24].includes(index) ? "bg-[#07182f]" : "bg-white"}`}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>

      {/* Email Input Modal for Test Invites */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-white p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-[#0D1B2A] mb-2">Send Test Invite to Yourself</h2>
            <p className="text-sm text-gray-600 mb-6">We'll send a preview of your invitation so you can see exactly how it looks on each channel.</p>
            <input
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#d9e2ec] rounded-xl outline-none focus:border-[#E91E8C] mb-3"
              autoFocus
            />
            {form.delivery_channels.some((c) => c === "whatsapp" || c === "sms") && (
              <input
                type="tel"
                placeholder="+2348012345678 (for WhatsApp/SMS test)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-4 py-3 border border-[#d9e2ec] rounded-xl outline-none focus:border-[#E91E8C] mb-6"
              />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="flex-1 px-4 py-3 border border-[#d9e2ec] rounded-xl text-sm font-bold text-[#0D1B2A] hover:bg-[#f8f9fc] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runTrial}
                disabled={!testEmail.includes("@")}
                className="flex-1 px-4 py-3 bg-[#E91E8C] text-white rounded-xl text-sm font-bold hover:bg-[#d0147a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Sending..." : "Send Preview"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Flyer Preview Modal */}
      {inviteFlyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-white max-w-md w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#e8edf2]">
              <h2 className="text-2xl font-bold text-[#0D1B2A]">Invitation Flyer</h2>
              <button
                onClick={() => setInviteFlyer(null)}
                className="text-gray-400 hover:text-[#0D1B2A] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">This beautiful flyer is exactly what your guests will see when you send them invitations. Everything they need is visible at a glance on their phone!</p>
              <img src={inviteFlyer} alt="Invitation Flyer" className="w-full rounded-xl shadow-lg" />
            </div>
            <div className="p-6 border-t border-[#e8edf2] bg-[#f8f9fc]">
              <p className="text-sm text-gray-600 mb-4">Ready to send real invitations? Create an account to set up your guest list and start sending.</p>
              <button
                onClick={() => setInviteFlyer(null)}
                className="w-full px-4 py-3 bg-[#E91E8C] text-white rounded-xl font-bold hover:bg-[#d0147a] transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Preview Modal */}
      {eventPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-white max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#e8edf2]">
              <h2 className="text-2xl font-bold text-[#0D1B2A]">Event Preview</h2>
              <button
                onClick={() => setEventPreviewUrl(null)}
                className="text-gray-400 hover:text-[#0D1B2A] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">This is how your event will look on Discover Events once you create an account and publish it.</p>
              <img src={eventPreviewUrl} alt="Event Preview" className="w-full rounded-xl" />
            </div>
            <div className="p-6 border-t border-[#e8edf2] bg-[#f8f9fc]">
              <p className="text-sm text-gray-600 mb-4">Ready to publish this event? Create an account to save your settings and post to Discover Events.</p>
              <button
                onClick={() => setEventPreviewUrl(null)}
                className="w-full px-4 py-3 bg-[#E91E8C] text-white rounded-xl font-bold hover:bg-[#d0147a] transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
