"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { createEvent } from "@/lib/api/events";
import { apiClient } from "@/lib/api-client";
import { aiChat, generateFlier } from "@/lib/api/ai";
import {
  cleanLineup,
  cleanPassPackages,
  parseTimeInputTo24Hour,
} from "@/lib/event-form-options";
import { INVITE_EVENT_TYPES, EVENT_EVENT_TYPES } from "@/lib/event-types";

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

const pricing: Record<Channel, number> = { email: 100000, whatsapp: 200000, sms: 300000 };
const channelLabels: Record<Channel, string> = { email: "Email", whatsapp: "WhatsApp", sms: "SMS" };

const qrDeliveryOptions: Array<{ value: QrDeliveryOption; label: string; description: string }> = [
  { value: "with_qr", label: "With QR code", description: "Send the flyer-style invitation and a unique animated accreditation QR code together." },
  { value: "without_qr", label: "Without QR code", description: "Send only the invitation message and design." },
  { value: "qr_later", label: "With QR code, but later", description: "Send the invite now, then optionally return later to send unique animated QR accreditation details." },
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

const inviteTemplates: Array<{ value: InviteTemplate | null; label: string; description: string; bestFor: string; icon: (props: any) => React.ReactNode }> = [
  { value: null, label: "Use My Own", description: "No template - use your custom design", bestFor: "Custom, branded invitations", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>) },
  { value: "elegant", label: "Elegant", description: "Classic, sophisticated, timeless", bestFor: "Weddings, formal galas, upscale events", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2.293-2.293a1 1 0 00-1.414 0L10 12.586 5.707 8.293a1 1 0 00-1.414 0L2 10.586V19a2 2 0 002 2h16a2 2 0 002-2V7z" /></svg>) },
  { value: "bold", label: "Bold", description: "Vibrant, energetic, eye-catching", bestFor: "Concerts, festivals, nightlife, parties", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>) },
  { value: "minimal", label: "Minimal", description: "Clean, simple, plenty of breathing room", bestFor: "Corporate events, conferences, seminars", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg>) },
  { value: "vibrant", label: "Vibrant", description: "Fun, colorful, playful, modern", bestFor: "Birthdays, celebrations, social events", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>) },
  { value: "corporate", label: "Corporate", description: "Professional, business-ready", bestFor: "Business meetings, professional events", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.217m0 0a9.01 9.01 0 00-5.566 0m5.566 0A8.973 8.973 0 0019 21m0 0h2" /></svg>) },
];

const eventTemplates: Array<{ value: EventTemplate; label: string; description: string; bestFor: string; icon: (props: any) => React.ReactNode }> = [
  { value: "elegant", label: "Elegant", description: "Classic, sophisticated, timeless", bestFor: "Weddings, formal galas", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2.293-2.293a1 1 0 00-1.414 0L10 12.586 5.707 8.293a1 1 0 00-1.414 0L2 10.586V19a2 2 0 002 2h16a2 2 0 002-2V7z" /></svg>) },
  { value: "bold", label: "Bold", description: "Vibrant, energetic, eye-catching", bestFor: "Concerts, festivals", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>) },
  { value: "minimal", label: "Minimal", description: "Clean, simple", bestFor: "Corporate events, conferences", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg>) },
  { value: "vibrant", label: "Vibrant", description: "Fun, colorful, modern", bestFor: "Celebrations", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>) },
  { value: "corporate", label: "Corporate", description: "Professional, business-ready", bestFor: "Business events", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.217m0 0a9.01 9.01 0 00-5.566 0m5.566 0A8.973 8.973 0 0019 21m0 0h2" /></svg>) },
];

const qrStyles: Array<{ value: string; label: string; description: string; bestFor: string; icon: (props: any) => React.ReactNode }> = [
  { value: "pulsing", label: "Pulsing", description: "Subtle glow with pulsing animation", bestFor: "Elegant, premium feel", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
  { value: "rotating", label: "Rotating", description: "Spinning QR with rotation effect", bestFor: "Dynamic, attention-grabbing", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>) },
  { value: "gradient", label: "Gradient", description: "Color shift animation", bestFor: "Modern, vibrant events", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>) },
  { value: "neon", label: "Neon", description: "Bright neon glow effect", bestFor: "Nightlife, parties, concerts", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>) },
  { value: "bounce", label: "Bounce", description: "Bouncing/scaling animation", bestFor: "Fun, playful events", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>) },
  { value: "custom", label: "Use My Own", description: "Upload your custom QR code", bestFor: "Branded, unique design", icon: ({ className }: any) => (<svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>) },
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
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function toggleChannel(channels: Channel[], channel: Channel) {
  return channels.includes(channel) ? channels.filter((item) => item !== channel) : [...channels, channel];
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[date.getMonth()];
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
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxW && height <= maxH) { resolve(file); return; }
      const ratio = Math.min(maxW / width, maxH / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => { if (blob) resolve(blob); else resolve(file); }, file.type);
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
  bounce: { wrapper: "animate-bounce", square: "" },
};

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
  invite_template: null as InviteTemplate | null,
  qr_style: "pulsing" as QRStyle,
  event_template: null as EventTemplate,
};

function TimeDropdown({ value, onChange, disabled, id }: { value: string; onChange: (v: string) => void; disabled?: boolean; id: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 pr-11 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
        placeholder={disabled ? "To be communicated" : "Select or type time"} required={!disabled} />
      {!disabled && (
        <>
          <button type="button" onClick={() => setOpen(!open)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#23466f] hover:bg-[#f8fafc]"
            aria-label="Open time options"><ChevronDown className="h-4 w-4" /></button>
          {open && (
            <div className="absolute z-50 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-[#d9e2ec] bg-white shadow-lg">
              {timeSlots.map((slot) => (
                <button key={slot} type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(slot); setOpen(false); }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#f8fafc] ${value === slot ? "font-bold text-[#E91E8C]" : "text-[#23466f]"}`}>{slot}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SelectDropdown({ children, value, onChange, className, disabled, required }: { children: React.ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; disabled?: boolean; required?: boolean }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} disabled={disabled} required={required}
        className={`${className || ""} appearance-none`} style={{ WebkitAppearance: "none", MozAppearance: "none" }}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
    </div>
  );
}

export default function CreateEventPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(0);
  const [formPage, setFormPage] = useState(0);
  const totalFormPages = 3;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | null>(null);
  const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);
  const [venueSuggestionsOpen, setVenueSuggestionsOpen] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [passPackages, setPassPackages] = useState<PassPackage[]>([{ name: "Regular", price: "" }]);
  const [socialHandles, setSocialHandles] = useState<SocialHandle[]>([{ platform: "instagram", handle: "" }]);
  const [lineup, setLineup] = useState<LineupPerson[]>([{ role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }]);
  const [dayPart, setDayPart] = useState("");
  const [monthPart, setMonthPart] = useState("");
  const [yearPart, setYearPart] = useState("");
  const [inviteTemplateOpen, setInviteTemplateOpen] = useState(false);
  const [qrDetailsOpen, setQrDetailsOpen] = useState(false);
  const [eventTemplateOpen, setEventTemplateOpen] = useState(false);
  const [aiImageError, setAiImageError] = useState("");
  const [aiGenerateError, setAiGenerateError] = useState("");

  // Flier upload / parse state
  const [flierParsing, setFlierParsing] = useState(false);
  const [flierPreview, setFlierPreview] = useState<string | null>(null);
  const [flierParsed, setFlierParsed] = useState(false);
  const [flierParseError, setFlierParseError] = useState("");

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const autoResize = useCallback(() => {
    const el = descriptionRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const initialRestoreDone = useRef(false);

  // Restore navigation state on mount (after auth)
  useEffect(() => {
    if (loading) return;
    initialRestoreDone.current = true;
    const lastMode = localStorage.getItem("accredit_last_dashboard_mode") as Mode | null;
    if (lastMode && ["invite", "event"].includes(lastMode)) {
      setMode(lastMode);
      const savedDraft = localStorage.getItem(`accredit_draft_${lastMode}`);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setForm(draft.form || DEFAULT_FORM);
          setPassPackages(draft.passPackages || [{ name: "Regular", price: "" }]);
          setSocialHandles(draft.socialHandles || [{ platform: "instagram", handle: "" }]);
          setLineup(draft.lineup || [{ role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }]);
          setUploadedImageData(draft.uploadedImageData || null);
        } catch {}
      }
      const lastStep = localStorage.getItem("accredit_dashboard_step");
      if (lastStep) setStep(parseInt(lastStep, 10));
      const lastFormPage = localStorage.getItem("accredit_dashboard_formPage");
      if (lastFormPage) setFormPage(parseInt(lastFormPage, 10));
    }
  }, [loading]);

  // Load saved draft when user changes mode mid-session (skip initial restore)
  useEffect(() => {
    if (!mode) return;
    if (initialRestoreDone.current) {
      initialRestoreDone.current = false;
      return;
    }
    const savedDraft = localStorage.getItem(`accredit_draft_${mode}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft) {
          setForm(draft.form || DEFAULT_FORM);
          setPassPackages(draft.passPackages || [{ name: "Regular", price: "" }]);
          setSocialHandles(draft.socialHandles || [{ platform: "instagram", handle: "" }]);
          setLineup(draft.lineup || [{ role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }]);
          setUploadedImageData(draft.uploadedImageData || null);
          setStep(1);
          setFormPage(0);
        }
      } catch {}
    }
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("accredit_draft_" + mode, JSON.stringify({ form, passPackages, socialHandles, lineup, uploadedImageData }));
      localStorage.setItem("accredit_last_dashboard_mode", mode as string);
      localStorage.setItem("accredit_dashboard_step", String(step));
      localStorage.setItem("accredit_dashboard_formPage", String(formPage));
    }, 300);
    return () => clearTimeout(timer);
  }, [form, passPackages, socialHandles, lineup, uploadedImageData, mode, step, formPage]);

  useEffect(() => {
    return () => { if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl); };
  }, [uploadedImagePreviewUrl]);

  const selectedGuestRange = guestRanges.find((range) => range.label === form.guest_range) || guestRanges[0];
  const pricingUnits = selectedGuestRange.units;
  const selectedPrice = useMemo(
    () => (mode === "invite" ? form.delivery_channels.reduce((total, channel) => total + pricing[channel] * pricingUnits, 0) : 0),
    [form.delivery_channels, mode, pricingUnits]
  );
  const selectedChannelNames = form.delivery_channels.map((channel) => channelLabels[channel]);

  const venueRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (venueRef.current && !venueRef.current.contains(e.target as Node)) setVenueSuggestionsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredVenues = useMemo(() => {
    const allVenues = [...STATIC_VENUES, ...getSavedVenues()];
    const search = form.venue.trim().toLowerCase();
    if (!search) return [];
    return allVenues.filter((venue) => venue.toLowerCase().includes(search)).slice(0, 5);
  }, [form.venue]);

  const selectedTimezone = timezoneOptions.find((zone) => zone.value === form.timezone) || timezoneOptions[0];
  const selectedQrDelivery = qrDeliveryOptions.find((option) => option.value === form.qr_delivery) || qrDeliveryOptions[0];
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

  const handleUnifiedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isFlier = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isImage && !isFlier) {
      // Pure image file - resize and use as image
      const blob = await resizeImage(file, 1200, 1200);
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        setUploadedImageData(data);
        setUploadedImagePreviewUrl(data);
        setForm({ ...form, media_source: "upload", uploaded_image_name: file.name });
      };
      reader.readAsDataURL(blob);
    } else {
      // Flier/document - extract and prefill
      setFlierParseError("");
      setFlierParsed(false);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setFlierPreview(dataUrl);
        setFlierParsing(true);
        try {
          const result = await apiClient<Record<string, unknown>>("/ai/parse-flier", {
            method: "POST",
            body: { image_data: dataUrl, mime_type: file.type },
          });
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
            setPassPackages(result.pass_packages.map((p: { name?: string; price?: string }) => ({ name: p.name || "", price: p.price || "" })));
          }
          setFlierParsed(true);
          if (!mode) setMode("event");
        } catch {
          setFlierParseError("Could not read your flier. Fill in the details below manually.");
          if (!mode) setMode("event");
        } finally { setFlierParsing(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateMessage = async () => {
    if (!mode) return;
    setAiGenerateError("");
    setAiGenerating(true);
    try {
      const dateLine = detailsToBeCommunicated ? "to be communicated" : formatDisplayDate(form.event_date) || "your selected date";
      const timeLine = detailsToBeCommunicated ? "to be communicated" : form.event_time || "your selected time";
      const venueLine = detailsToBeCommunicated ? "to be communicated" : form.venue || "the venue";
      const title = form.title || (mode === "event" ? "our upcoming event" : "our special celebration");
      const host = form.host_name || "the host";
      const passText = visiblePassPackages.length ? ` Passes: ${visiblePassPackages.map((item) => `${item.name || "Pass"} ${item.price || ""}`.trim()).join(", ")}.` : "";
      const lineupText = visibleLineup.length ? ` Featuring ${visibleLineup.map((item) => `${item.role || "Guest"}: ${item.name || "Name"}`).join("; ")}.` : "";
      const afterPartyText = mode === "event" && form.after_party_enabled && form.after_party_location ? ` After party at ${form.after_party_location}${form.after_party_time ? ` by ${form.after_party_time}` : ""}.` : "";
      const socialText = visibleSocialHandles.length ? ` Follow ${visibleSocialHandles.map((item) => { const platform = socialPlatforms.find((s) => s.value === item.platform)?.label || "Social"; return `${platform}: ${item.handle}`; }).join(", ")} for updates.` : "";
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
    } finally { setAiGenerating(false); }
  };

  const generateImage = async () => {
    if (!mode) return;
    setAiImageGenerating(true);
    try {
      const autoPrompt = [
        form.title ? `Premium visual artwork for "${form.title}".` : "Premium event visual artwork.",
        form.category ? `Category: ${form.category}.` : "",
        form.venue ? `Venue mood inspired by ${form.venue}.` : "",
        form.male_dress_code ? `Dress code mood: ${form.male_dress_code}.` : "",
        form.event_date ? `Season/date mood: ${form.event_date}.` : "",
        form.event_time ? `Lighting mood: ${form.event_time}.` : "",
        visibleLineup.length ? `Featuring: ${visibleLineup.slice(0, 3).map((p) => p.name).filter(Boolean).join(", ")}.` : "",
        "Vibrant professional event artwork only. Do not include text, words, letters, numbers, dates, labels, logos, or headline copy.",
      ].filter(Boolean).join(" ");
      const prompt = form.image_prompt.trim() || autoPrompt;
      setAiImageError("");
      const url = await generateFlier(prompt);
      setForm((current) => ({ ...current, media_source: "ai", generated_image_ready: true, generated_image_url: url, image_prompt: current.image_prompt || autoPrompt }));
    } catch (err) {
      setAiImageError("Could not generate image. Please try again later or upload your own.");
    } finally { setAiImageGenerating(false); }
  };

  const handleCreateEvent = async () => {
    if (!mode || !user) return;
    try {
      if (form.venue.trim()) saveVenue(form.venue.trim());
      const allDay = [dayPart, monthPart, yearPart].filter(Boolean).join("-");
      const finalDate = allDay.length === 10 ? allDay : form.event_date;
      const event = await createEvent({
        title: form.title,
        host_name: form.host_name,
        event_date: finalDate,
        event_time: parseTimeInputTo24Hour(form.event_time),
        timezone: selectedTimezone.value,
        venue: form.venue,
        guest_count_range: form.guest_range,
        description: form.description,
        is_public: mode === "event",
        category: mode === "event" ? form.category || form.event_type : undefined,
        event_type: mode === "event" ? form.event_type : "private",
        ticket_price: form.gate_fee ? Number(form.gate_fee) : undefined,
        pass_packages: mode === "event" ? cleanPassPackages(passPackages) : undefined,
        lineup: mode === "event" ? cleanLineup(lineup) : undefined,
        dress_code: form.male_dress_code || undefined,
        after_party_enabled: form.after_party_enabled,
        after_party_location: form.after_party_location || undefined,
        after_party_time: form.after_party_time ? parseTimeInputTo24Hour(form.after_party_time) : undefined,
        country: "Nigeria",
      });
      localStorage.removeItem("accredit_draft_" + mode);

      if (mode === "invite") {
        router.push(`/dashboard/invites/${event.id}/manage`);
      } else {
        router.push("/dashboard/events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "wallet">("paystack");

  const handlePaymentRedirect = async () => {
    if (!mode || mode !== "invite" || form.delivery_channels.length === 0) return;

    setSubmitting(true);
    setError("");

    try {
      if (form.venue.trim()) saveVenue(form.venue.trim());
      const allDay = [dayPart, monthPart, yearPart].filter(Boolean).join("-");
      const finalDate = allDay.length === 10 ? allDay : form.event_date;

      // Create temporary event for payment
      const tempEvent = await createEvent({
        title: form.title,
        host_name: form.host_name,
        event_date: finalDate,
        event_time: parseTimeInputTo24Hour(form.event_time),
        timezone: selectedTimezone.value,
        venue: form.venue,
        guest_count_range: form.guest_range,
        description: form.description,
        is_public: false,
        event_type: "private",
        country: "Nigeria",
      });

      // Initiate payment with all selected channels and chosen payment method
      const paymentRes = await apiClient<{
        authorization_url?: string;
        payment_id: number;
        reference: string;
        amount: number;
        method?: string;
      }>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({
          event_id: tempEvent.id,
          channel: form.delivery_channels.join(","),
          provider: "paystack",
          payment_method: paymentMethod,
        }),
      });

      if (paymentMethod === "wallet") {
        // Wallet payment was processed directly — redirect to event manage page
        router.push(`/dashboard/invites/${tempEvent.id}/manage?paid=wallet`);
      } else if (paymentRes.authorization_url) {
        // Redirect to Paystack
        window.location.href = paymentRes.authorization_url;
      } else {
        setError("Failed to initiate payment. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode) return;
    if (mode === "invite" && form.delivery_channels.length === 0) {
      setError("Select at least one delivery channel.");
      return;
    }
    setError("");

    // For CREATE INVITE, initiate payment first (requires login)
    if (mode === "invite") {
      if (!user) {
        router.push("/auth/signup?source=create_invite");
        return;
      }
      await handlePaymentRedirect();
    } else {
      // For POST EVENT
      if (!user) {
        // Trial mode: save and redirect to preview
        const allDay = [dayPart, monthPart, yearPart].filter(Boolean).join("-");
        const trialDate = allDay.length === 10 ? allDay : form.event_date;
        const { saveTrialEvent } = await import("@/lib/post-event-trial");
        saveTrialEvent({
          title: form.title,
          host_name: form.host_name,
          event_date: trialDate,
          event_time: form.event_time,
          venue: form.venue,
          description: form.description,
          guest_count_range: form.guest_range,
          event_type: form.event_type || "concert",
          category: form.category,
          ticket_price: form.gate_fee ? Number(form.gate_fee) : undefined,
          pass_packages: passPackages.length > 0 ? passPackages : undefined,
          lineup: lineup.length > 0 ? lineup : undefined,
        });
        router.push("/create-event/trial-preview");
      } else {
        // Real event creation
        setSubmitting(true);
        await handleCreateEvent();
        setSubmitting(false);
      }
    }
  };

  const showFlierUpload = mode === "event" || mode === "invite";

  if (loading) return null;

  // Allow POST EVENT trial mode without authentication
  // CREATE INVITE requires authentication
  if (!user && mode === "invite") {
    return null; // Will redirect in handleSubmit
  }

  if (!mode) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <style>{`
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
        <header className="border-b border-[#e8edf2] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
              <Image src="/logo-dark-trim.png" alt="accredit.vip" width={4071} height={761} className="h-10 sm:h-12 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/dashboard" className="rounded-lg border border-[#0D1B2A] bg-[#0D1B2A] px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white shadow-sm transition-all hover:bg-[#13283d] hover:border-[#E91E8C] hover:shadow-md">Dashboard</Link>
              <Link href="/" className="rounded-lg border border-[#d9e2ec] bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-[#0D1B2A] shadow-sm transition-all hover:border-[#E91E8C] hover:text-[#E91E8C] hover:shadow-md">Home</Link>
            </div>
          </div>
        </header>
        <div className="flex-1 container mx-auto px-4 py-2 sm:py-8">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-[#e8edf2] bg-[#f8f9fc] p-4 sm:p-5 mt-2">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">Choose one to get started</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setMode("invite"); setFormPage(0); }}
                  className={`rounded-xl border-2 p-6 text-left transition-all duration-200 cursor-pointer ${!mode ? "bounce-button" : ""} ${
                    mode === "invite"
                      ? "border-[#E91E8C] bg-white shadow-[0_4px_20px_rgba(233,30,140,0.14)] ring-2 ring-[#E91E8C]/15"
                      : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50 hover:shadow-md"
                  }`}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-base font-black uppercase tracking-[0.12em] text-[#E91E8C]">CREATE INVITE</span>
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
                  <span className="mt-2 block text-sm text-gray-500">Guest upload, RSVP, reminders, WhatsApp/SMS/Email, QR access.</span>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
                    style={{ color: mode === "invite" ? "#E91E8C" : "#9ca3af" }}
                  >
                    {mode === "invite" ? "Selected" : "Select"}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </span>
                </button>
                <button type="button" onClick={() => { setMode("event"); setFormPage(0); }}
                  className={`rounded-xl border-2 p-6 text-left transition-all duration-200 cursor-pointer ${!mode ? "bounce-button" : ""} ${
                    mode === "event"
                      ? "border-[#E91E8C] bg-white shadow-[0_4px_20px_rgba(233,30,140,0.14)] ring-2 ring-[#E91E8C]/15"
                      : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50 hover:shadow-md"
                  }`}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-base font-black uppercase tracking-[0.12em] text-[#E91E8C]">POST EVENT</span>
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
                  <span className="mt-2 block text-sm text-gray-500">Public listing on Discover Events, ticket sales, flyer/banner, lineup, gate fee.</span>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
                    style={{ color: mode === "event" ? "#E91E8C" : "#9ca3af" }}
                  >
                    {mode === "event" ? "Selected" : "Select"}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <style>{`
        @keyframes dance { 0%,100%{transform:translateY(0)scale(1)} 25%{transform:translateY(-8px)scale(1.02)} 50%{transform:translateY(0)scale(1)} 75%{transform:translateY(-4px)scale(1.01)} }
        @keyframes pulse-accent { 0%,100%{box-shadow:0 0 0 0 rgba(233,30,140,0.7)} 50%{box-shadow:0 0 20px 10px rgba(233,30,140,0.3)} }
        @keyframes gentleBounce { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-6px) scale(1.01); } }
        .bounce-button { animation: gentleBounce 0.8s ease-in-out infinite; will-change: transform; transform: translateZ(0); }
      `}</style>

      {/* Header */}
      <header className="border-b border-[#e8edf2] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button type="button" onClick={() => setMode(null)} className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
            <Image src="/logo-dark-trim.png" alt="accredit.vip" width={4071} height={761} className="h-10 sm:h-12 w-auto object-contain" />
          </button>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard" className="rounded-lg border border-[#0D1B2A] bg-[#0D1B2A] px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white shadow-sm transition-all hover:bg-[#13283d] hover:border-[#E91E8C] hover:shadow-md">Dashboard</Link>
            <Link href="/" className="rounded-lg border border-[#d9e2ec] bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-[#0D1B2A] shadow-sm transition-all hover:border-[#E91E8C] hover:text-[#E91E8C] hover:shadow-md">Home</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Step indicator */}
        <div className="border-b border-[#e8edf2] bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {[
                { index: 0, label: mode === "event" ? "Event type & template" : "Template & style" },
                { index: 1, label: "Details & pricing" },
                { index: 2, label: "Lineup, pass & message" },
              ].map((item) => (
                <button key={item.index} type="button"
                  onClick={() => { if (item.index <= formPage + 1) { const form = document.getElementById('create-event-form') as HTMLFormElement; if (item.index > formPage && form && !form.reportValidity()) return; setFormPage(item.index); } }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${formPage >= item.index ? "text-white bounce-button" : "text-[#94a3b8]"}`}
                  style={{ background: formPage >= item.index ? "linear-gradient(135deg, #E91E8C, #C4166F)" : "transparent" }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: formPage >= item.index ? "rgba(255,255,255,0.2)" : "#e8edf2", color: formPage >= item.index ? "white" : "#94a3b8" }}>
                    {formPage > item.index ? <Check className="w-4 h-4" /> : item.index + 1}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 lg:min-h-screen">
            {/* Main form */}
            <div className="lg:col-span-2 flex flex-col">
              <form id="create-event-form" onSubmit={handleSubmit} className="rounded-2xl border border-[#e2e8f0] bg-white p-3 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setMode(null)} className="flex items-center gap-1.5 rounded-lg border border-[#e8edf2] bg-white px-3.5 py-1.5 text-xs font-bold text-gray-500 shadow-sm transition-all hover:border-[#E91E8C] hover:text-[#E91E8C]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      Change mode
                    </button>
                    <Link href="/dashboard/events" className="flex items-center gap-1.5 rounded-lg border border-[#e8edf2] bg-white px-3.5 py-1.5 text-xs font-bold text-gray-500 shadow-sm transition-all hover:border-[#E91E8C] hover:text-[#E91E8C]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Exit
                    </Link>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                    style={{ background: mode === "event" ? "rgba(233,30,140,0.1)" : "rgba(15,23,42,0.06)", color: mode === "event" ? "#E91E8C" : "#64748b" }}>
                    {mode === "invite" ? "Private" : "Public"}
                  </span>
                </div>

                {formPage === 0 && (
                  <div className="space-y-5">
                    {/* Flier upload */}
                    {showFlierUpload && (
                      <div className="rounded-xl border border-dashed border-[#d9e2ec] bg-[#f8f9fc] p-4">
                        {flierParsing ? (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-[#E91E8C] border-t-transparent animate-spin flex-shrink-0" />
                            <p className="text-sm font-semibold text-[#0D1B2A]">AI is reading your flier and filling the form…</p>
                          </div>
                        ) : flierParsed ? (
                          <div className="flex items-center gap-3">
                            {flierPreview && <img src={flierPreview} alt="Flier" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                            <div className="flex-1">
                              <p className="text-sm font-bold text-emerald-600">Flier parsed - form pre-filled below</p>
                              <p className="text-xs text-[#94a3b8] mt-0.5">Review each field and make any corrections</p>
                            </div>
                            <label className="text-xs font-bold text-[#E91E8C] cursor-pointer hover:underline">Change<input type="file" accept="image/*" className="sr-only" onChange={handleUnifiedUpload} /></label>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#e8edf2] flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-[#E91E8C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-[#0D1B2A]">Upload a flier or image to get started</p>
                              <p className="text-xs text-[#94a3b8] mt-0.5">Upload a flier to auto-fill details or an image to use as your event visual</p>
                            </div>
                            <label className="cursor-pointer rounded-xl border border-[#E91E8C] px-3 py-2 text-xs font-bold text-[#E91E8C] hover:bg-[#fff1f8] transition-colors bounce-button">Upload<input type="file" accept="image/*,.pdf" className="sr-only" onChange={handleUnifiedUpload} /></label>
                          </div>
                        )}
                        {flierParseError && <p className="mt-2 text-xs text-amber-600 font-medium">{flierParseError}</p>}
                      </div>
                    )}

                    {/* Event template (event mode) */}
                    {mode === "event" && (
                      <details open={eventTemplateOpen} className="rounded-xl border border-[#d9e2ec] p-4 group"
                        onToggle={(e) => setEventTemplateOpen((e.target as HTMLDetailsElement).open)}>
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>Event flyer style</span>
                          </span>
                          <svg className={`w-4 h-4 text-[#94a3b8] transition-transform ${eventTemplateOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {eventTemplates.map((template) => (
                            <label key={String(template.value)} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${form.event_template === template.value ? "border-[#E91E8C] bg-[#fff1f8]" : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50"}`}>
                              <input type="radio" name="event-template" className="sr-only" checked={form.event_template === template.value}
                                onChange={() => setForm({ ...form, event_template: template.value })} />
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ color: form.event_template === template.value ? "#E91E8C" : "#94a3b8", background: form.event_template === template.value ? "rgba(233,30,140,0.08)" : "#f8fafc" }}>
                                {template.icon({ className: "w-4 h-4" })}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-[#23466f]">{template.label}</p>
                                <p className="text-xs text-[#64748b] leading-4 mt-1">{template.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Invite template (invite mode) */}
                    {mode === "invite" && (
                      <details open={inviteTemplateOpen} className="rounded-xl border border-[#d9e2ec] p-4 group"
                        onToggle={(e) => setInviteTemplateOpen((e.target as HTMLDetailsElement).open)}>
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>Invitation template style</span>
                          </span>
                          <svg className={`w-4 h-4 text-[#94a3b8] transition-transform ${inviteTemplateOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {inviteTemplates.map((template) => (
                            <label key={String(template.value)} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${form.invite_template === template.value ? "border-[#E91E8C] bg-[#fff1f8]" : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50"}`}>
                              <input type="radio" name="invite-template" className="sr-only" checked={form.invite_template === template.value}
                                onChange={() => setForm({ ...form, invite_template: template.value })} />
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ color: form.invite_template === template.value ? "#E91E8C" : "#94a3b8", background: form.invite_template === template.value ? "rgba(233,30,140,0.08)" : "#f8fafc" }}>
                                {template.icon({ className: "w-4 h-4" })}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-[#23466f]">{template.label}</p>
                                <p className="text-xs text-[#64748b] leading-4 mt-1">{template.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#23466f]">{mode === "event" ? "Event title *" : "Invitation title *"}</label>
                      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                        placeholder={mode === "event" ? "e.g. Lagos Jazz Festival 2026" : "e.g. Sarah & James Wedding Reception"} />
                    </div>

                    {/* Host name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#23466f]">Host name <span className="text-xs font-normal text-[#94a3b8]">(optional)</span></label>
                      <input value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })}
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                        placeholder={user?.full_name || "e.g. John Doe"} />
                    </div>

                    {/* Event type (both modes) */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#23466f]">Event type</label>
                      <select value={form.event_type || ""} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                        className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] appearance-none" style={{ WebkitAppearance: "none" }}>
                        <option value="">Select event type</option>
                        {(mode === "event" ? EVENT_EVENT_TYPES : INVITE_EVENT_TYPES).map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      {form.event_type === "others" && (
                        <input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                          placeholder="Specify your event type..." />
                      )}
                    </div>

                    {/* Social media handles - POST EVENT only */}
                    {mode === "event" && (
                    <details className="rounded-xl border border-[#d9e2ec] group">
                      <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                        <span>Social media handles</span>
                        <svg className="w-4 h-4 text-[#94a3b8] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </summary>
                      <div className="px-4 pb-4 space-y-3">
                        {socialHandles.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <select value={item.platform} onChange={(e) => updateSocialHandle(index, { platform: e.target.value as SocialPlatform })}
                              className="h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] flex-shrink-0 appearance-none" style={{ WebkitAppearance: "none", MozAppearance: "none" }}>
                              {socialPlatforms.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                            <input value={item.handle} onChange={(e) => updateSocialHandle(index, { handle: e.target.value })}
                              className="h-11 flex-1 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]"
                              placeholder={socialPlatforms.find((p) => p.value === item.platform)?.placeholder || "@yourbrand"} />
                            {socialHandles.length > 1 && (
                              <button type="button" onClick={() => setSocialHandles((cur) => cur.filter((_, i) => i !== index))}
                                className="h-11 w-11 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setSocialHandles((cur) => [...cur, { platform: "instagram", handle: "" }])}
                          className="text-xs font-bold text-[#E91E8C] hover:underline bounce-button">+ Add social handle</button>
                      </div>
                    </details>
                    )}

                    {/* Date & Time section */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#23466f]">Event date *</label>
                      <div className="flex gap-2">
                        <select value={dayPart} onChange={(e) => { const d = e.target.value; setDayPart(d); if (d && monthPart && yearPart) setForm({ ...form, event_date: `${yearPart}-${monthPart}-${d.padStart(2, "0")}` }); }} required={!detailsToBeCommunicated}
                          className="h-11 flex-1 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] appearance-none" style={{ WebkitAppearance: "none" }}>
                          <option value="">Day</option>
                          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
                        </select>
                        <select value={monthPart} onChange={(e) => { const m = e.target.value; setMonthPart(m); if (dayPart && m && yearPart) setForm({ ...form, event_date: `${yearPart}-${m}-${dayPart.padStart(2, "0")}` }); }} required={!detailsToBeCommunicated}
                          className="h-11 flex-1 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] appearance-none" style={{ WebkitAppearance: "none" }}>
                          <option value="">Month</option>
                          {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((name, idx) => <option key={idx + 1} value={String(idx + 1).padStart(2, "0")}>{name}</option>)}
                        </select>
                        <select value={yearPart} onChange={(e) => { const y = e.target.value; setYearPart(y); if (dayPart && monthPart && y) setForm({ ...form, event_date: `${y}-${monthPart}-${dayPart.padStart(2, "0")}` }); }} required={!detailsToBeCommunicated}
                          className="h-11 flex-1 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] appearance-none" style={{ WebkitAppearance: "none" }}>
                          <option value="">Year</option>
                          {Array.from({ length: 10 }, (_, i) => <option key={2026 + i} value={String(2026 + i)}>{2026 + i}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Time & Timezone */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-[#23466f]">Time</label>
                        <TimeDropdown id="event-time" value={form.event_time} onChange={(v) => setForm({ ...form, event_time: v })} disabled={detailsToBeCommunicated} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-[#23466f]">Timezone</label>
                        <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} required
                          className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] appearance-none" style={{ WebkitAppearance: "none" }}>
                          {timezoneOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Details to be communicated (invite mode) */}
                    {mode === "invite" && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.details_to_be_communicated}
                          onChange={(e) => setForm({ ...form, details_to_be_communicated: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-[#E91E8C] focus:ring-[#E91E8C]" />
                        <span className="text-xs font-semibold text-[#64748b]">Details to be communicated later</span>
                      </label>
                    )}

                    {/* Venue with suggestions */}
                    <div ref={venueRef} className="space-y-1.5 relative">
                      <label className="text-sm font-semibold text-[#23466f]">Venue / Address</label>
                      <div className="relative">
                        <input value={form.venue} onChange={(e) => { setForm({ ...form, venue: e.target.value }); setVenueSuggestionsOpen(true); }} onFocus={() => setVenueSuggestionsOpen(true)} required={!detailsToBeCommunicated}
                          className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="Search or type venue address" disabled={detailsToBeCommunicated} />
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      </div>
                      {venueSuggestionsOpen && filteredVenues.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#d9e2ec] bg-white shadow-lg overflow-hidden">
                          {filteredVenues.map((venue) => (
                            <button key={venue} type="button" onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, venue }); setVenueSuggestionsOpen(false); }}
                              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#f8fafc] text-[#23466f]">{venue}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Guest range */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#23466f]">Expected guests *</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {guestRanges.map((range) => (
                          <label key={range.label} className={`flex cursor-pointer items-center justify-center rounded-xl border-2 p-2 text-center text-xs font-bold transition-all ${form.guest_range === range.label ? "border-[#E91E8C] bg-[#fff1f8] text-[#E91E8C]" : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#E91E8C]/50"}`}>
                            <input type="radio" name="guest-range" className="sr-only" checked={form.guest_range === range.label}
                              onChange={() => setForm({ ...form, guest_range: range.label })} />
                            {range.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {formPage === 1 && (
                  <div className="space-y-5">
                    {/* Delivery channels (invite mode) */}
                    {mode === "invite" && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-[#23466f]">Delivery channel *</label>
                        <p className="text-xs text-[#94a3b8] mb-2">Select how your invitation will be delivered (at least one required)</p>
                        <div className="grid gap-2">
                          {(["email", "whatsapp", "sms"] as Channel[]).map((channel) => {
                            const selected = form.delivery_channels.includes(channel);
                            return (
                              <label key={channel} className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 transition-all ${selected ? "border-[#E91E8C] bg-[#fff1f8]" : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50"}`}>
                                <div className="flex items-center gap-3">
                                  <input type="checkbox" checked={selected} onChange={() => setForm({ ...form, delivery_channels: toggleChannel(form.delivery_channels, channel) })} className="w-4 h-4 rounded border-gray-300 text-[#E91E8C] focus:ring-[#E91E8C]" />
                                  <span className="text-sm font-bold text-[#23466f]">{channelLabels[channel]}{channel !== "email" && <span className="ml-2 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Not available</span>}</span>
                                </div>
                                <span className="text-xs text-[#94a3b8]">{formatNaira(pricing[channel])}/100</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* QR code options (invite mode) */}
                    {mode === "invite" && (
                      <details open={qrDetailsOpen} className="rounded-xl border border-[#d9e2ec] group"
                        onToggle={(e) => setQrDetailsOpen((e.target as HTMLDetailsElement).open)}>
                        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-semibold text-[#23466f] [&::-webkit-details-marker]:hidden">
                          <span>QR code option</span>
                          <svg className={`w-4 h-4 text-[#94a3b8] transition-transform ${qrDetailsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="px-4 pb-4 space-y-4">
                          {qrDeliveryOptions.map((option) => (
                            <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${form.qr_delivery === option.value ? "border-[#E91E8C] bg-[#fff1f8]" : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50"}`}>
                              <input type="radio" name="qr-delivery" className="sr-only" checked={form.qr_delivery === option.value}
                                onChange={() => setForm({ ...form, qr_delivery: option.value })} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#23466f]">{option.label}</p>
                                <p className="text-xs text-[#64748b] mt-0.5">{option.description}</p>
                              </div>
                            </label>
                          ))}
                          {form.qr_delivery !== "without_qr" && (
                            <>
                              <p className="text-xs font-semibold text-[#E91E8C] mb-2">Choose your animated QR style:</p>
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {qrStyles.map((style) => (
                                  <label key={style.value} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all ${form.qr_style === style.value ? "border-[#E91E8C] bg-[#fff1f8]" : "border-[#e2e8f0] bg-white hover:border-[#E91E8C]/50"}`}>
                                    <input type="radio" name="qr-style" className="sr-only" checked={form.qr_style === style.value}
                                      onChange={() => setForm({ ...form, qr_style: style.value as QRStyle })} />
                                    <span className={form.qr_style === style.value ? "text-[#E91E8C]" : "text-[#94a3b8]"}>{style.icon({ className: "w-5 h-5" })}</span>
                                    <span className="text-[10px] font-bold text-center" style={{ color: form.qr_style === style.value ? "#E91E8C" : "#64748b" }}>{style.label}</span>
                                  </label>
                                ))}
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-[#23466f]">QR message (optional)</label>
                                <textarea value={form.qr_message} onChange={(e) => setForm({ ...form, qr_message: e.target.value })}
                                  className="w-full rounded-xl border border-[#d9e2ec] px-3 py-3 text-sm outline-none focus:border-[#E91E8C] min-h-[60px] resize-none"
                                  placeholder="Message to accompany QR code, e.g. instructions for the guest..." />
                              </div>
                            </>
                          )}
                          {form.qr_delivery === "qr_later" && (
                            <div className="rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-4 space-y-3">
                              <p className="text-xs font-bold text-[#E91E8C]">QR LATER — you can send the QR code after creating the invite</p>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#23466f]">QR email subject</label>
                                <input value={form.qr_later_title} onChange={(e) => setForm({ ...form, qr_later_title: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="e.g. Your QR Code for Sarah & James Wedding" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#23466f]">QR email message</label>
                                <textarea value={form.qr_later_message} onChange={(e) => setForm({ ...form, qr_later_message: e.target.value })}
                                  className="w-full rounded-xl border border-[#d9e2ec] px-3 py-3 text-sm outline-none focus:border-[#E91E8C] min-h-[60px] resize-none"
                                  placeholder="e.g. Please find your unique QR code attached. Present this at the event entrance." />
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    {/* Dress code */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#23466f]">Dress code</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-[#94a3b8] mb-1">Female</p>
                          <input value={form.female_dress_code} onChange={(e) => setForm({ ...form, female_dress_code: e.target.value })}
                            className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="e.g. Evening gown / Casual" disabled={detailsToBeCommunicated} />
                        </div>
                        <div>
                          <p className="text-xs text-[#94a3b8] mb-1">Male</p>
                          <input value={form.male_dress_code} onChange={(e) => setForm({ ...form, male_dress_code: e.target.value })}
                            className="h-11 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="e.g. All white / Black tie" disabled={detailsToBeCommunicated} />
                        </div>
                      </div>
                    </div>

                    {/* After party (event mode only) */}
                    {mode === "event" && (
                      <details className="rounded-xl border border-[#d9e2ec] group">
                        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-bold text-[#23466f] [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            After-party
                          </span>
                          <svg className={`w-4 h-4 text-[#94a3b8] transition-transform group-open:rotate-180`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="px-4 pb-4 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.after_party_enabled} onChange={(e) => setForm({ ...form, after_party_enabled: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 text-[#E91E8C] focus:ring-[#E91E8C]" />
                            <span className="text-xs font-semibold text-[#64748b]">Enable after-party</span>
                          </label>
                          {form.after_party_enabled && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input value={form.after_party_location} onChange={(e) => setForm({ ...form, after_party_location: e.target.value })}
                                className="h-10 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="After party venue or address" />
                              <TimeDropdown id="after-party-time" value={form.after_party_time} onChange={(v) => setForm({ ...form, after_party_time: v })} />
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    {/* Lineup (event mode) */}
                    {mode === "event" && (
                      <details className="rounded-xl border border-[#d9e2ec] group">
                        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-bold text-[#23466f] [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Lineup / Performers
                          </span>
                          <svg className={`w-4 h-4 text-[#94a3b8] transition-transform group-open:rotate-180`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="px-4 pb-4 space-y-3">
                          {lineup.map((person, index) => (
                            <div key={index} className="rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-3 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs font-semibold text-[#23466f] mb-1">Role</p>
                                  <input value={person.role} onChange={(e) => updateLineup(index, { role: e.target.value })}
                                    className="h-10 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="e.g. Headliner" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#23466f] mb-1">Name</p>
                                  <input value={person.name} onChange={(e) => updateLineup(index, { name: e.target.value })}
                                    className="h-10 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="e.g. Wizkid" />
                                </div>
                              </div>
                              {lineup.length > 1 && (
                                <button type="button" onClick={() => setLineup((cur) => cur.filter((_, i) => i !== index))}
                                  className="text-xs font-bold text-red-400 hover:text-red-500">Remove</button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => setLineup((cur) => [...cur, { role: "", name: "", attachHeadshot: true, headshotSource: "upload", headshotFileName: "", generatedHeadshot: false }])}
                            className="text-xs font-bold text-[#E91E8C] hover:underline bounce-button">+ Add lineup member</button>
                        </div>
                      </details>
                    )}

                    {/* Pass packages / tickets (event mode) */}
                    {mode === "event" && (
                      <details className="rounded-xl border border-[#d9e2ec] group">
                        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-bold text-[#23466f] [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                            Pass packages / Tickets
                          </span>
                          <svg className={`w-4 h-4 text-[#94a3b8] transition-transform group-open:rotate-180`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="px-4 pb-4 space-y-3">
                          {passPackages.map((pkg, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <input value={pkg.name} onChange={(e) => updatePassPackage(index, { name: e.target.value })}
                                className="h-10 flex-1 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="Package name" />
                              <input value={pkg.price} onChange={(e) => updatePassPackage(index, { price: e.target.value })} type="number" min="0"
                                className="h-10 w-28 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="Price (₦)" />
                              {passPackages.length > 1 && (
                                <button type="button" onClick={() => setPassPackages((cur) => cur.filter((_, i) => i !== index))}
                                  className="h-10 w-10 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => setPassPackages((cur) => [...cur, { name: "", price: "" }])}
                            className="text-xs font-bold text-[#E91E8C] hover:underline bounce-button">+ Add pass package</button>
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {formPage === 2 && (
                  <div className="space-y-5">
                    {/* Image finalization / AI generation */}
                    <div className="space-y-1.5">
                      <span className="text-sm font-semibold text-[#23466f]">Event Image</span>
                      <div className="rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-4">
                        {form.media_source === "ai" && form.generated_image_url ? (
                          <div className="space-y-2">
                            <img src={form.generated_image_url} alt="AI generated" className="w-full max-h-48 rounded-xl object-cover" />
                            <button type="button" onClick={() => setForm({ ...form, media_source: "upload", generated_image_url: "", generated_image_ready: false, image_prompt: "" })}
                              className="text-xs font-bold text-[#E91E8C] hover:underline bounce-button">Remove & upload instead</button>
                          </div>
                        ) : uploadedImagePreviewUrl ? (
                          <div className="space-y-2">
                            <img src={uploadedImagePreviewUrl} alt="Uploaded" className="w-full max-h-48 rounded-xl object-cover" />
                            <button type="button" onClick={() => { setUploadedImagePreviewUrl(null); setUploadedImageData(null); }}
                              className="text-xs font-bold text-[#E91E8C] hover:underline bounce-button">Remove</button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d9e2ec] p-6 text-center hover:border-[#E91E8C] transition-colors">
                              <svg className="w-6 h-6 text-[#94a3b8]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                              <span className="text-sm font-semibold text-[#64748b]">Upload image</span>
                              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const blob = await resizeImage(file, 1200, 1200);
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const data = reader.result as string;
                                  setUploadedImageData(data);
                                  setUploadedImagePreviewUrl(data);
                                  setForm({ ...form, media_source: "upload", uploaded_image_name: file.name });
                                };
                                reader.readAsDataURL(blob);
                              }} />
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-[#e2e8f0]" />
                              <span className="text-xs text-[#94a3b8]">or generate with AI</span>
                              <div className="flex-1 h-px bg-[#e2e8f0]" />
                            </div>
                            <div className="space-y-2">
                              <input value={form.image_prompt} onChange={(e) => setForm({ ...form, image_prompt: e.target.value })}
                                className="h-10 w-full rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C]" placeholder="Describe the image you want..." />
                              <button type="button" onClick={generateImage} disabled={aiImageGenerating}
                                className="w-full h-10 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 bounce-button"
                                style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
                                {aiImageGenerating ? (
                                  <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating...</span>
                                ) : "Generate with AI"}
                              </button>
                              {aiImageError && <p className="text-xs text-amber-600 font-medium">{aiImageError}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description / message */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#23466f]">{mode === "event" ? "Event description" : "Invitation message"}</label>
                      <textarea ref={descriptionRef} onInput={autoResize} value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })} required
                        className="w-full rounded-xl border border-[#d9e2ec] px-3 py-3 text-sm outline-none focus:border-[#E91E8C] min-h-[100px] resize-none"
                        placeholder={mode === "event" ? "Describe what makes this event special..." : "Write a warm invitation message..."} />
                      <button type="button" onClick={generateMessage} disabled={aiGenerating}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 bounce-button"
                        style={{ background: aiGenerating ? "#94a3b8" : "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
                        {aiGenerating ? (
                          <><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating...</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>AI-generate{mode === "event" ? " description" : " message"}</>
                        )}
                      </button>
                      {aiGenerateError && <p className="text-xs text-amber-600 font-medium">{aiGenerateError}</p>}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-semibold text-red-600">{error}</p>
                  </div>
                )}

                {/* Mobile - Live Preview (appears at end of form on mobile) */}
                <div className="lg:hidden mt-8 rounded-2xl bg-white p-6 text-[#0D1B2A] border border-[#e8edf2]" data-live-preview-mobile>
                  {mode === "event" ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">Flyer builder</p>
                      <h3 className="mt-3 text-2xl font-black">Live Preview</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        See exactly how your event flyer will appear on Discover Events.
                      </p>
                    </>
                  ) : (
                    <div className="rounded-xl bg-gradient-to-br from-[#fef2f8] to-[#fff5f9] p-5 border border-[#fce4f0]">
                      <div className="inline-block px-3 py-1.5 rounded-lg" style={{ background: "rgba(233,30,140,0.1)" }}>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E91E8C]">Live estimate</p>
                      </div>
                      <h3 className="mt-3 text-2xl font-black text-[#0D1B2A]">{formatNaira(selectedPrice)}</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {form.guest_range} guests across {pricingUnits} pricing block{pricingUnits > 1 ? "s" : ""} of 100.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 overflow-hidden rounded-xl bg-white text-[#07182f] border border-[#e8edf2]">
                    {(() => {
                      const activeTemplate = mode === "invite" ? form.invite_template : form.event_template;
                      const styles = activeTemplate ? templateStyles[activeTemplate] : null;
                      const headerText = styles ? styles.textColor : "white";
                      return (
                        <>
                          <div
                            className="flex min-h-28 flex-col justify-end p-4"
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
                            <h4 className="mt-2 text-2xl font-black leading-tight">{form.title || (mode === "event" ? "Your Event Title" : "Your Invitation")}</h4>
                          </div>
                          <div className="p-3">
                            <h4 className="text-lg font-black">{form.title || (mode === "event" ? "Your Event Title" : "Your Invitation")}</h4>
                            <p className="mt-1 text-xs text-[#64748b]">{form.host_name || "Host name"}</p>
                            <p className="mt-2 text-xs text-[#23466f]">{form.venue || "Event venue"}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Live Preview Button - only on final page */}
                {formPage === 2 && (
                  <button type="button" onClick={() => document.querySelector('[data-live-preview-mobile]')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full mt-5 h-12 rounded-xl font-black text-sm border-2 border-[#E91E8C] text-[#E91E8C] transition-all hover:bg-[#fff1f8] bounce-button lg:hidden">
                    Preview Before {mode === "event" ? "Posting" : "Creating"}
                  </button>
                )}

                {/* Payment method toggle - invite mode only */}
                {formPage === 2 && mode === "invite" && (
                  <div className="mt-4 flex gap-2 rounded-xl border border-[#e8edf2] p-1">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("paystack")}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        paymentMethod === "paystack"
                          ? "bg-[#E91E8C] text-white shadow-sm"
                          : "text-[#64748b] hover:text-[#0D1B2A]"
                      }`}
                    >
                      Pay with Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("wallet")}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        paymentMethod === "wallet"
                          ? "bg-[#E91E8C] text-white shadow-sm"
                          : "text-[#64748b] hover:text-[#0D1B2A]"
                      }`}
                    >
                      Pay with Wallet
                    </button>
                  </div>
                )}

                {/* Submit button - only on final page */}
                {formPage === 2 && (
                  <button type="submit" disabled={submitting}
                    className="w-full mt-3 h-12 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bounce-button"
                    style={{ background: submitting ? "#94a3b8" : "linear-gradient(135deg, #E91E8C, #C4166F)", boxShadow: submitting ? "none" : "0 6px 20px rgba(233,30,140,0.35)" }}>
                    {submitting ? "Creating…" : mode === "event" ? "Post Event" : paymentMethod === "wallet" ? "Pay with Wallet" : "Pay with Card"}
                  </button>
                )}

                {/* Bottom navigation */}
                <div className="mt-6 sticky bottom-4 z-30 flex items-center gap-3 rounded-xl border border-[#e8edf2] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  <button type="button" onClick={() => { if (formPage === 0) setMode(null); else setFormPage(formPage - 1); }}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 bounce-button"
                    style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    {formPage === 0 ? "Back to modes" : "Previous"}
                  </button>
                  {formPage < 2 && (
                    <button type="button" onClick={() => { const form = document.getElementById('create-event-form') as HTMLFormElement; if (form && !form.reportValidity()) return; setFormPage(formPage + 1); }}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 bounce-button"
                      style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Sidebar - live preview (visible on desktop at all form stages) */}
            <div className="hidden lg:block lg:col-span-1 space-y-6" data-live-preview>
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
                  {form.generated_image_url && (
                    <div className="overflow-hidden rounded-xl bg-white">
                      <img
                        src={form.generated_image_url}
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
                                    : <p>Your event description will appear here in the preview.</p>}
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
