"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Calendar } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { apiClient } from "@/lib/api-client";
import { aiChat, generateFlier, parseFlier } from "@/lib/api/ai";
import { TrialStore } from "@/lib/trial-store";
import { CURRENCIES, getCurrencySymbol } from "@/lib/event-form-options";
import { formatCurrencyAmount } from "@/lib/currencies";
import { VenueInput } from "@/components/shared/venue-input";

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
  delivery_channels: [] as Channel[],
  qr_delivery: "with_qr" as QrDeliveryOption,
  qr_later_title: "",
  qr_later_message: "",
  qr_later_media_source: "upload" as "upload" | "ai",
  qr_later_image_name: "",
  qr_later_image_prompt: "",
  male_dress_code: "",
  female_dress_code: "",
  gate_fee: "",
  currency: CURRENCIES[0]?.code || "NGN",
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
type QRStyle = "pulsing" | "rotating" | "gradient" | "neon" | "bounce" | "scanner" | "ripple" | "sparkle" | "custom";
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
    value: "scanner",
    label: "Scanner",
    description: "Scanning beam moving top-to-bottom",
    bestFor: "Tech, futuristic events",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: "ripple",
    label: "Ripple",
    description: "Expanding circular ripple from center",
    bestFor: "Concert, festival vibes",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 11-16 0 8 8 0 0116 0zM12 10a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
  {
    value: "sparkle",
    label: "Sparkle",
    description: "Sparkling dots across the QR",
    bestFor: "Luxury, premium events",
    icon: ({ className }: any) => (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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
  { value: "Africa/Lagos|WAT", label: "NG Lagos, Nigeria (WAT)" },
  { value: "Africa/Accra|GMT", label: "GH Accra, Ghana (GMT)" },
  { value: "Africa/Nairobi|EAT", label: "KE Nairobi, Kenya (EAT)" },
  { value: "Africa/Johannesburg|SAST", label: "ZA Johannesburg, South Africa (SAST)" },
  { value: "Europe/London|GMT/BST", label: "GB London, United Kingdom (GMT/BST)" },
  { value: "Europe/Paris|CET", label: "FR Paris, France (CET)" },
  { value: "America/New_York|ET", label: "US New York, United States (ET)" },
  { value: "America/Los_Angeles|PT", label: "US Los Angeles, United States (PT)" },
  { value: "Asia/Dubai|GST", label: "AE Dubai, UAE (GST)" },
];

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

function SelectDropdown({ children, value, onChange, className, disabled, required }: {
  children: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`${className || ""} appearance-none`}
        style={{ WebkitAppearance: "none", MozAppearance: "none" }}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
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
  scanner: { wrapper: "animate-pulse", square: "bg-[#E91E8C]" },
  ripple: { wrapper: "", square: "bg-gradient-to-br from-[#E91E8C] to-[#7C3AED] animate-ping" },
  sparkle: { wrapper: "animate-pulse", square: "bg-[#FFD700] shadow-[0_0_4px_#FFD700]" },
};

export default function CreateEventPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(0);
  const [formPage, setFormPage] = useState(0);
  const totalFormPages = 3;
  const [fingerprint, setFingerprint] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [usedTrials, setUsedTrials] = useState<Record<Mode, boolean>>({ invite: false, event: false });
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | null>(null);
  const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
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

  // Controlled open state for collapsible details
  const [inviteTemplateOpen, setInviteTemplateOpen] = useState(false);
  const [qrDetailsOpen, setQrDetailsOpen] = useState(false);
  const [eventTemplateOpen, setEventTemplateOpen] = useState(false);

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
    const timer = window.setTimeout(() => {
      setFingerprint(getTrialFingerprint());

      const lastMode = localStorage.getItem("accredit_last_mode") as Mode | null;
      if (lastMode && ["invite", "event"].includes(lastMode)) {
        setMode(lastMode);
        const savedDraft = localStorage.getItem(DRAFT_KEYS[lastMode]);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setForm({ ...DEFAULT_FORM, ...(draft.form || {}) });
            setPassPackages(draft.passPackages || [{ name: "Regular", price: "" }]);
            setSocialHandles(draft.socialHandles || [{ platform: "instagram", handle: "" }]);
            setLineup(draft.lineup || [{ role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }]);
            setUploadedImageData(draft.uploadedImageData || null);
          } catch {}
        }
        const lastStep = localStorage.getItem("accredit_create_step");
        if (lastStep) setStep(parseInt(lastStep, 10));
        const lastFormPage = localStorage.getItem("accredit_create_formPage");
        if (lastFormPage) setFormPage(parseInt(lastFormPage, 10));
      }

      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || !mode) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEYS[mode], JSON.stringify({ form, passPackages, socialHandles, lineup, uploadedImageData }));
      localStorage.setItem("accredit_last_mode", mode as string);
      localStorage.setItem("accredit_create_step", String(step));
      localStorage.setItem("accredit_create_formPage", String(formPage));
    }, 300);
    return () => clearTimeout(timer);
  }, [form, passPackages, socialHandles, lineup, uploadedImageData, mode, step, formPage, hydrated]);

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
      setUploadedImagePreviewUrl(dataUrl);
      setUploadedImageData(dataUrl);
      setForm((prev) => ({ ...prev, media_source: "upload", uploaded_image_name: file.name }));
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
        form.title ? `Premium visual artwork for "${form.title}".` : "Premium event visual artwork.",
        form.category ? `Category: ${form.category}.` : "",
        form.venue ? `Venue mood inspired by ${form.venue}.` : "",
        form.male_dress_code ? `Dress code mood: ${form.male_dress_code}.` : "",
        form.event_date ? `Season/date mood: ${form.event_date}.` : "",
        form.event_time ? `Lighting mood: ${form.event_time}.` : "",
        visibleLineup.length
          ? `Featuring: ${visibleLineup.slice(0, 3).map((p) => p.name).filter(Boolean).join(", ")}.`
          : "",
        "Vibrant professional event artwork only. Do not include text, words, letters, numbers, dates, labels, logos, or headline copy.",
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
          setMessage(`Test invitation flyer sent to ${result.sent_to}${viaText}. Here's the beautiful invitation your guests will see:`);
        } else {
          setMessage(`Test invite sent to ${result.sent_to}${viaText}. Check your messages to see the invitation flyer. Create an account to send real invites to your guest list.`);
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

  const handleTestAndSignup = async () => {
    if (!mode) return;

    setSubmitting(true);
    setError("");

    try {
      // Save to trial store (runTrial already called /trials/use)
      const trialEvent = TrialStore.create(mode as 'invite' | 'event');
      trialEvent.form = form;
      trialEvent.passPackages = passPackages;
      trialEvent.socialHandles = socialHandles;
      trialEvent.lineup = lineup;
      trialEvent.uploadedImageData = uploadedImageData;
      trialEvent.tested = true;
      trialEvent.testedVia = mode === "invite"
        ? (form.delivery_channels.includes("email") ? "email" : form.delivery_channels[0] || "email") as 'email' | 'whatsapp' | 'sms'
        : 'email';
      trialEvent.testRecipient = mode === "invite" ? testEmail || "" : undefined;
      TrialStore.save(trialEvent);

      // For POST EVENT mode, also save to sessionStorage so onboarding can create a real event
      if (mode === "event") {
        const eventData = {
          title: form.title,
          host_name: form.host_name,
          event_date: form.event_date,
          event_time: form.event_time,
          venue: form.venue,
          description: form.description,
          guest_count_range: form.guest_range,
          event_type: form.event_type || "concert",
          category: form.category,
          ticket_price: form.gate_fee ? Number(form.gate_fee) : undefined,
          currency: form.currency,
          pass_packages: passPackages,
          lineup,
        };
        sessionStorage.setItem("post_event_trial_data", JSON.stringify(eventData));
      }

      // Redirect to onboarding
      router.push('/auth/onboarding');
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Failed to test. Please try again.";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <style>{`
      @keyframes pulse-accent {
        0%, 100% { box-shadow: 0 0 0 0 rgba(233,30,140,0.7); }
        50% { box-shadow: 0 0 20px 10px rgba(233,30,140,0.3); }
      }
      @keyframes dance {
        0%, 100% { transform: translateY(0) scale(1); }
        25% { transform: translateY(-8px) scale(1.02); }
        50% { transform: translateY(0) scale(1); }
        75% { transform: translateY(-4px) scale(1.01); }
      }
      @keyframes pulse-breathing {
        0%, 100% { box-shadow: 0 0 0 0 rgba(233,30,140,0.4); }
        50% { box-shadow: 0 0 0 8px rgba(233,30,140,0.1); }
      }
      @keyframes gentleBounce {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-6px) scale(1.01); }
      }
      .bounce-button {
        animation: gentleBounce 0.8s ease-in-out infinite;
        will-change: transform;
        transform: translateZ(0);
      }
    `}</style>
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar variant="light" />

      <main className="flex-1">
        <section className="px-4 py-3 sm:py-6 sm:px-6 lg:px-8 bg-white border-b border-[#e8edf2]">
          <div className="mx-auto grid max-w-6xl gap-6 lg:gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            {step === 0 && (
            <div>
              <h1 className="max-w-3xl text-2xl sm:text-5xl lg:text-6xl font-black leading-tight text-[#0D1B2A]">
                Test your invite
              </h1>
              <p className="mt-2 sm:mt-6 max-w-2xl text-sm sm:text-lg leading-6 sm:leading-8 text-gray-500">
                Choose CREATE INVITE for private guest lists or POST EVENT for public discovery.
                The test previews exactly what your guests will see - no payment required.
              </p>
            </div>
            )}

            {step === 0 && (
              <div className="rounded-2xl border border-[#e8edf2] bg-[#f8f9fc] p-4 sm:p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">
                  Choose one to get started
                </p>

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
                      if (newMode) { setStep(1); setFormPage(0); } else setStep(0);
                      setMessage("");
                      setError("");
                      setTrialComplete(false);
                    }}
                    className={`rounded-xl border-2 p-6 text-left transition-all duration-200 cursor-pointer ${
                      mode === "invite"
                        ? "border-[#E91E8C] bg-white shadow-[0_4px_20px_rgba(233,30,140,0.14)] ring-2 ring-[#E91E8C]/15"
                        : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50 hover:shadow-md"
                    }`}
                    style={step === 0 && !mode ? { animation: "dance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) infinite" } : {}}
                  >
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
                      if (newMode) { setStep(1); setFormPage(0); } else setStep(0);
                      setMessage("");
                      setError("");
                      setTrialComplete(false);
                    }}
                    className={`rounded-xl border-2 p-6 text-left transition-all duration-200 cursor-pointer ${
                      mode === "event"
                        ? "border-[#E91E8C] bg-white shadow-[0_4px_20px_rgba(233,30,140,0.14)] ring-2 ring-[#E91E8C]/15"
                        : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50 hover:shadow-md"
                    }`}
                    style={step === 0 && !mode ? { animation: "dance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) infinite 0.1s" } : {}}
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
            )}
          </div>
        </section>

        <section className={`px-4 sm:px-6 lg:px-8 ${step > 0 ? 'pt-0 pb-0' : 'py-4 sm:py-8'}`}>
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_390px]">
            <form id="create-event-form" onSubmit={showEmailModal} className={`rounded-2xl border border-[#e2e8f0] bg-white p-3 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-4 ${step === 1 ? '' : 'hidden'}`}>
              {step === 1 && (
              <>
              {formPage === 0 && (<>

              {/* Mode header */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-block px-3 py-1.5 rounded-lg" style={{ background: "rgba(233,30,140,0.1)" }}>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">
                      {mode === "event" ? "Post Event Test" : "Create Invite Test"}
                    </p>
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-[#07182f]">
                    {mode ? "Try it once, then continue securely" : "Choose a flow above"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {mode && (
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-[#0D1B2A] hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  )}
                  {mode && usedTrials[mode] && (
                    <span className="rounded-full bg-[#fff1f8] px-3 py-1 text-xs font-bold text-[#C4166F]">
                      Trial already used
                    </span>
                  )}
                </div>
              </div>

              {/* Flier upload - INVITE only */}
              {mode === "invite" && (
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
                      <p className="text-sm font-bold text-emerald-600">Flier parsed - form pre-filled below</p>
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
                        <p className="text-sm font-bold text-emerald-600">Flier parsed - form pre-filled below</p>
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
                <details open={eventTemplateOpen} className="rounded-xl border border-[#d9e2ec] p-4 group">
                  <summary onClick={(e) => { e.preventDefault(); setEventTemplateOpen(!eventTemplateOpen); }} className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                    <span className="px-2">Event flyer style</span>
                    <svg className={`w-4 h-4 text-[#94a3b8] transition-transform ${eventTemplateOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {inviteTemplates.filter(t => t.value !== null).map((template) => (
                      <div
                        key={String(template.value)}
                        onClick={() => { setForm({ ...form, event_template: form.event_template === template.value ? null : (template.value as EventTemplate) }); setEventTemplateOpen(false); }}
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
                </details>
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
                    {mode === "event" ? "Host or promoter" : "Host name"} <span className="text-xs font-normal text-[#94a3b8]">(optional)</span>
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
                    <SelectDropdown
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
                    </SelectDropdown>
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
                    <SelectDropdown
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
                    </SelectDropdown>
                  </label>
                )}

                {mode === "invite" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Number of guests</span>
                    <SelectDropdown
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
                    </SelectDropdown>
                  </label>
                ) : (
                  <details className="rounded-xl border border-[#d9e2ec] group">
                    <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                      <span>Social media handles</span>
                      <svg className="w-4 h-4 text-[#94a3b8] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-4 pb-4">
                      <button
                        type="button"
                        onClick={() => setSocialHandles((current) => [...current, { platform: "instagram", handle: "" }])}
                        className="mb-3 rounded-lg border border-[#d9e2ec] px-3 py-2 text-xs font-bold text-[#23466f] hover:bg-[#fff1f8]"
                      >
                        Add
                      </button>
                      <div className="space-y-2">
                      {socialHandles.map((social, index) => {
                        const platform = socialPlatforms.find((item) => item.value === social.platform) || socialPlatforms[0];
                        return (
                          <div key={index} className="grid gap-2 sm:grid-cols-[0.9fr_1.1fr_auto]">
                            <SelectDropdown
                              value={social.platform}
                              onChange={(e) => updateSocialHandle(index, { platform: e.target.value as SocialPlatform })}
                              className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm font-semibold outline-none focus:border-[#E91E8C]"
                            >
                              {socialPlatforms.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </SelectDropdown>
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
                  </details>
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
                    <SelectDropdown
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
                    </SelectDropdown>
                    <SelectDropdown
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
                    </SelectDropdown>
                    <SelectDropdown
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
                        const year = new Date().getFullYear() + i;
                        return <option key={year} value={String(year)}>{year}</option>;
                      })}
                    </SelectDropdown>
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
                  <SelectDropdown
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
                  </SelectDropdown>
                </label>
              </div>
              </>)}

              {formPage === 1 && mode === 'invite' && (<>
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
                          <span>{channelLabels[channel]}{channel !== "email" && <span className="ml-2 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Not available</span>}</span>
                          <span className="ml-auto text-xs text-[#94a3b8]">{formatCurrencyAmount(pricing[channel], "NGN")}/100</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Venue & Dress Code - moved up */}
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-[#23466f]">Venue</span>
                    <VenueInput
                      value={form.venue}
                      onChange={(v) => setForm({ ...form, venue: v })}
                      onLocationChange={(loc) => setLocationData({ lat: loc.lat, lng: loc.lng })}
                      disabled={detailsToBeCommunicated}
                      className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
                      placeholder={detailsToBeCommunicated ? "To be communicated" : "Search for a venue or type manually..."}
                      required={!detailsToBeCommunicated}
                    />
                  </div>

                  {/* Dress code - Female & Male */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[#23466f]">Dress code - Female</span>
                      <input
                        value={form.female_dress_code || ""}
                        onChange={(e) => setForm({ ...form, female_dress_code: e.target.value })}
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                        placeholder="Evening gown, aso ebi, all white"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[#23466f]">Dress code - Male</span>
                      <input
                        value={form.male_dress_code}
                        onChange={(e) => setForm({ ...form, male_dress_code: e.target.value })}
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                        placeholder="Black suit, agbada, senator"
                      />
                    </label>
                  </div>

                  <details open={inviteTemplateOpen} className="rounded-xl border border-[#d9e2ec] p-4 group">
                    <summary onClick={(e) => { e.preventDefault(); setInviteTemplateOpen(!inviteTemplateOpen); }} className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                      <span className="px-2">Invitation template style</span>
                      <svg className={`w-4 h-4 text-[#94a3b8] transition-transform ${inviteTemplateOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {inviteTemplates.map((template) => (
                        <div
                          key={String(template.value)}
                          onClick={() => { setForm({ ...form, invite_template: form.invite_template === template.value ? null : (template.value as InviteTemplate | null) }); setInviteTemplateOpen(false); }}
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
                  </details>

                  {/* QR code option - collapsible */}
                    <details open={qrDetailsOpen} className="rounded-xl border border-[#d9e2ec] group">
                    <summary onClick={(e) => { e.preventDefault(); setQrDetailsOpen(!qrDetailsOpen); }} className="flex cursor-pointer items-center justify-between p-4 text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                      <span>QR code option</span>
                      <svg className={`w-4 h-4 text-[#94a3b8] transition-transform ${qrDetailsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-4 pb-4">
                      <div className="grid gap-3 md:grid-cols-3">
                      {qrDeliveryOptions.map((option) => (
                        <label key={option.value} className="flex cursor-pointer flex-col gap-2 rounded-xl border border-[#edf2f7] p-3 text-sm text-[#23466f]">
                          <span className="flex items-center gap-2 font-bold">
                            <input
                              type="radio"
                              checked={form.qr_delivery === option.value}
                              onChange={() => { setForm({ ...form, qr_delivery: option.value }); setQrDetailsOpen(false); }}
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
                                onClick={() => { setForm({ ...form, qr_style: form.qr_style === style.value ? "pulsing" : (style.value as QRStyle) }); setQrDetailsOpen(false); }}
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
                  </div>
                </details>
                </div>
              )}
              </>)}

              {formPage === 2 && (<>
              {mode === "event" ? (
                <>
                {/* Note: Venue and Dress Code are now in the invite-specific section above for both CREATE INVITE and POST EVENT modes */}
                <div className="mt-5 space-y-5">
                  <details className="rounded-xl border border-[#d9e2ec] group">
                    <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-bold text-[#23466f] [&::-webkit-details-marker]:hidden">
                      <span>Gate fee / pass packages</span>
                      <svg className="w-4 h-4 text-[#94a3b8] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-[#23466f]">Currency:</span>
                        <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                          className="h-9 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] bg-white">
                          {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPassPackages((current) => [...current, { name: "", price: "" }])}
                        className="mb-3 w-fit cursor-pointer rounded-lg bg-[#E91E8C] px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#C4166F]"
                      >
                        Add package
                      </button>
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
                            placeholder={"e.g. "+getCurrencySymbol(form.currency)+"10,000"}
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
                  </div>
                  </details>

                  <details className="rounded-xl border border-[#d9e2ec] group">
                    <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-bold text-[#23466f] [&::-webkit-details-marker]:hidden">
                      <span>Headliners, speakers or artistes</span>
                      <svg className="w-4 h-4 text-[#94a3b8] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-4 pb-4">
                      <button
                        type="button"
                        onClick={() =>
                          setLineup((current) => [
                            ...current,
                            { role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false },
                          ])
                        }
                        className="mb-3 w-fit cursor-pointer rounded-lg bg-[#E91E8C] px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#C4166F]"
                      >
                        Add person
                      </button>
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
                  </div>
                  </details>

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

              </>
              )}
              </>
              )}

              {/* Mobile error + success message - shown after trial */}
              {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

              {/* Sticky Bottom Navigation Bar for Form Pages */}
              {(step === 1) && mode && (
                <div className="sticky bottom-4 z-30 flex items-center gap-3 rounded-xl border border-[#e8edf2] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  <button
                    type="button"
                    onClick={() => {
                      if (formPage === 0) {
                        setStep(0); setMode(null);
                      } else if (mode === "event" && formPage === 2) {
                        setFormPage(0);
                      } else {
                        setFormPage(formPage - 1);
                      }
                    }}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 bounce-button"
                    style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.getElementById('create-event-form') as HTMLFormElement;
                      if (!form?.reportValidity()) return;
                      if (formPage === totalFormPages - 1) {
                        setStep(2);
                      } else if (mode === "event" && formPage === 0) {
                        setFormPage(2);
                      } else {
                        setFormPage(formPage + 1);
                      }
                    }}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 bounce-button"
                    style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}
                  >
                    {formPage === totalFormPages - 1 ? "Next: Preview" : "Next"}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </form>

            {step === 1 && (
              <div className="hidden lg:block space-y-6" data-live-preview>
                <div className="sticky top-20 rounded-2xl bg-white p-6 text-[#0D1B2A] shadow-[0_18px_48px_rgba(0,0,0,0.08)] border border-[#e8edf2] min-h-[500px] flex flex-col">
                  {mode === "event" ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">Flyer builder</p>
                      <h3 className="mt-3 text-3xl font-black">Live Preview</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        See exactly how your event flyer will appear on Discover Events.
                      </p>
                    </>
                  ) : (
                    <div className="rounded-xl bg-gradient-to-br from-[#fef2f8] to-[#fff5f9] p-5 border border-[#fce4f0]">
                      <div className="inline-block px-3 py-1.5 rounded-lg" style={{ background: "rgba(233,30,140,0.1)" }}>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">Live estimate</p>
                      </div>
                      <h3 className="mt-3 text-3xl font-black text-[#0D1B2A]">{formatCurrencyAmount(selectedPrice, form.currency)}</h3>
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
                              <strong className="text-[#0D1B2A]">{formatCurrencyAmount(pricing[channel] * pricingUnits, form.currency)}</strong>
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
                              <h4 className="mt-3 text-3xl font-black leading-tight">{form.title || (mode === "event" ? "Your Event Title" : "Your Invitation")}</h4>
                              <p className="mt-2 text-sm opacity-85">
                                {form.venue || (mode === "event" ? "Event venue" : "Venue TBD")}
                              </p>
                            </div>
                            <div className="p-4">
                              <h4 className="text-xl font-black">{form.title || (mode === "event" ? "Your Event Title" : "Your Invitation")}</h4>
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
                                  </div>
                                  <div className="mt-4 space-y-3 text-sm text-[#23466f]">
                                    {(form.description || "").split(/\n{2,}/).filter((p) => p.trim()).length > 0
                                      ? (form.description || "").split(/\n{2,}/).map((para, i) => (
                                          <p key={i} dangerouslySetInnerHTML={{ __html: para.replace(/\n/g, "<br />") }} />
                                        ))
                                      : <p>Your event description will appear here in the preview.</p>}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="mt-4 space-y-3 text-sm text-[#23466f]">
                                    <p className="font-semibold">Dear <span className="text-[#E91E8C]">[Guest Name]</span>,</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
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
                                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Dress code</dt>
                                        </div>
                                        <div className="rounded-lg bg-[#f8fafc] p-2">
                                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Female</dt>
                                          <dd className="mt-1 font-semibold">{form.female_dress_code || "Not specified"}</dd>
                                        </div>
                                        <div className="rounded-lg bg-[#f8fafc] p-2">
                                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Male</dt>
                                          <dd className="mt-1 font-semibold">{form.male_dress_code || "Not specified"}</dd>
                                        </div>
                                      </div>
                                    {(() => {
                                      const desc = form.description || "";
                                      const paragraphs = desc.split(/\n{2,}/).filter((p) => p.trim());
                                      if (paragraphs.length === 0) {
                                        return <p className="mt-3">Your message will appear here in the preview.</p>;
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
                              <span key={index}
                                className={`rounded-sm ${qrStyleConfig[form.qr_style]?.square || ""} ${[0, 1, 2, 5, 10, 12, 14, 18, 20, 21, 22, 24].includes(index) ? "bg-[#07182f]" : "bg-white"}`}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 px-6 bounce-button"
                  style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous: Edit form
                </button>

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
                      <h3 className="mt-3 text-3xl font-black text-[#0D1B2A]">{formatCurrencyAmount(selectedPrice, form.currency)}</h3>
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
                              <strong className="text-[#0D1B2A]">{formatCurrencyAmount(pricing[channel] * pricingUnits, form.currency)}</strong>
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
                                    {pkg.name}{pkg.price ? ` - ${pkg.price}` : ""}
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
                              <dt className="font-bold uppercase tracking-widest text-[#475569]">Female</dt>
                              <dd className="mt-1 font-semibold">{form.female_dress_code || "Not specified"}</dd>
                            </div>
                            <div className="rounded-lg bg-[#f8fafc] p-2">
                              <dt className="font-bold uppercase tracking-widest text-[#475569]">Male</dt>
                              <dd className="mt-1 font-semibold">{form.male_dress_code || "Not specified"}</dd>
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
                                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Female</dt>
                                          <dd className="mt-1 font-semibold">{form.female_dress_code || "Not specified"}</dd>
                                        </div>
                                        <div className="rounded-lg bg-[#f8fafc] p-2">
                                          <dt className="font-bold uppercase tracking-widest text-[#475569]">Male</dt>
                                          <dd className="mt-1 font-semibold">{form.male_dress_code || "Not specified"}</dd>
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

                    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

                    {message ? (
                      <div className="mt-6 rounded-xl border-2 border-[#E91E8C]/20 bg-gradient-to-br from-[#fef2f8] to-[#fff5f9] p-5 text-sm text-[#23466f]">
                        <p className="text-base font-bold text-[#07182f]">{message}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Preview</p>
                            <p className="mt-1 font-bold text-[#07182f]">{mode === "event" ? "Flyer ready" : "Invite ready"}</p>
                          </div>
                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">QR</p>
                            <p className="mt-1 font-bold text-[#07182f]">Ready</p>
                          </div>
                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">
                              {mode === "event" ? "Discover" : "Channels"}
                            </p>
                            <p className="mt-1 font-bold text-[#07182f]">
                              {mode === "event" ? "Publish after signup" : selectedChannelNames.join(" + ")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleTestAndSignup}
                          disabled={submitting}
                          className="mt-5 flex h-14 w-full items-center justify-center rounded-xl bg-[#E91E8C] px-6 text-base font-black text-white shadow-[0_8px_24px_rgba(233,30,140,0.35)] transition-all hover:bg-[#C4166F] disabled:opacity-50 disabled:cursor-not-allowed bounce-button"
                        >
                          {submitting ? "Setting up..." : "Would you like to continue with your invite?"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        form="create-event-form"
                        disabled={submitting}
                        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#E91E8C] px-6 text-sm font-bold text-white transition-all hover:bg-[#C4166F] disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ animation: 'pulse-accent 2s infinite' }}
                      >
                        {submitting ? "Preparing preview..." : "Test this feature"}
                      </button>
                    )}
                  </div>
                </aside>
              </div>
            )}
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

      {/* Test Invite Result Modal - Full Screen */}
      {message && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-white w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header with logo */}
            <div className="bg-gradient-to-br from-[#E91E8C]/10 to-[#E91E8C]/5 px-6 py-8 text-center border-b border-[#e8edf2]">
              <div className="mb-4 flex justify-center">
                <svg className="w-12 h-12 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-[#0D1B2A]">Test Invite Sent!</h2>
            </div>

            {/* Content */}
            <div className="px-6 py-8 space-y-6">
              <p className="text-base font-medium text-[#0D1B2A]">{message}</p>

              {/* Status Cards */}
              <div className="space-y-3">
                <div className="rounded-xl border-2 border-[#E91E8C]/20 bg-gradient-to-br from-[#fef2f8] to-[#fff5f9] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#E91E8C] mb-1">PREVIEW</p>
                      <p className="text-lg font-bold text-[#0D1B2A]">{mode === "event" ? "Flyer ready" : "Invite ready"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-[#E91E8C]/20 bg-gradient-to-br from-[#fef2f8] to-[#fff5f9] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#E91E8C] mb-1">QR CODE</p>
                  <p className="text-lg font-bold text-[#0D1B2A]">Ready</p>
                </div>

                <div className="rounded-xl border-2 border-[#E91E8C]/20 bg-gradient-to-br from-[#fef2f8] to-[#fff5f9] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#E91E8C] mb-1">
                    {mode === "event" ? "DISCOVER" : "CHANNELS"}
                  </p>
                  <p className="text-lg font-bold text-[#0D1B2A]">
                    {mode === "event" ? "Publish after signup" : selectedChannelNames.join(" + ")}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={handleTestAndSignup}
                disabled={submitting}
                className="w-full h-14 rounded-xl bg-[#E91E8C] px-6 text-lg font-black text-white shadow-[0_8px_24px_rgba(233,30,140,0.35)] transition-all hover:bg-[#C4166F] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Setting up..." : "Would you like to continue with your invite?"}
              </button>

              <p className="text-xs text-center text-[#94a3b8]">
                Create an account to send real invites to your guest list
              </p>
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
                type="button"
                onClick={handleTestAndSignup}
                disabled={submitting}
                className="block w-full px-4 py-3 bg-[#E91E8C] text-white rounded-xl font-bold hover:bg-[#d0147a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bounce-button"
              >
                {submitting ? "Setting up..." : "Test This Feature"}
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
                type="button"
                onClick={handleTestAndSignup}
                disabled={submitting}
                className="block w-full px-4 py-3 bg-[#E91E8C] text-white rounded-xl font-bold hover:bg-[#d0147a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bounce-button"
              >
                {submitting ? "Setting up..." : "Test This Feature"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer visible on desktop only */}
      <div className="hidden sm:block">
        <Footer />
      </div>
    </div>
    </>
  );
}
