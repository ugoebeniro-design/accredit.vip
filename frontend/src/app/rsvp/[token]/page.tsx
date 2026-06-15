"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, Clock, MapPin, Check, X, MessageSquare } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface RSVPData {
  event_title: string;
  event_date: string;
  event_time: string;
  venue: string;
  host_name: string;
  guest_name: string;
  cover_image: string | null;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "TBD";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(timeStr: string) {
  if (!timeStr) return "TBD";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function RSVPPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token;

  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<"yes" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadRsvpData = async () => {
      try {
        const data = await apiClient<RSVPData>(`/rsvp/${token}`);
        setRsvpData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load invitation");
      } finally {
        setLoading(false);
      }
    };
    if (token) loadRsvpData();
  }, [token]);

  const handleSubmit = async () => {
    if (!response) return;
    setSubmitting(true);
    setError("");
    try {
      await apiClient(`/rsvp/${token}`, {
        method: "POST",
        body: { response, note },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fc]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#e8edf2] border-t-[#E91E8C]" />
          <p className="text-[#64748b]">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !rsvpData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 border border-[#e8edf2] text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fef2f2]">
            <svg className="h-8 w-8 text-[#ef4444]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Invalid Link</h1>
          <p className="mt-2 text-[#64748b]">{error || "This QR code is from a test preview — it isn't linked to any real event."}</p>
          <p className="mt-4 text-sm text-[#94a3b8]">
            Create an account at Accredit.vip to generate real QR codes linked to your events!
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 border border-[#d1fae5] text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0fdf4]">
            <svg className="h-8 w-8 text-[#10b981]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Thank You!</h1>
          <p className="mt-2 text-[#64748b]">
            Your response has been recorded. {response === "yes" ? "See you at the event!" : "We'll miss you!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] relative overflow-hidden">
      {/* Animated floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="animate-orb absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-[#E91E8C]/10 to-transparent opacity-60" />
        <div className="animate-orb absolute top-1/3 -right-16 w-56 h-56 rounded-full bg-gradient-to-bl from-[#E91E8C]/8 to-transparent opacity-50" style={{ animationDelay: "-3s" }} />
        <div className="animate-orb absolute -bottom-32 left-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-[#E91E8C]/6 to-transparent opacity-40" style={{ animationDelay: "-6s" }} />
      </div>

      {/* Branded header bar */}
      <div className="relative bg-white/80 backdrop-blur-sm border-b border-[#e8edf2] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo-trim.png" alt="accredit.vip" width={130} height={24} className="h-5 w-auto object-contain" />
          </div>
          <a href="/create-event" className="text-xs font-bold text-[#E91E8C] hover:underline">
            Create Event &rarr;
          </a>
        </div>
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-8">
        <div className="rounded-2xl bg-white border border-[#e8edf2] shadow-lg overflow-hidden motion-pop">
          {/* Flyer image */}
          {rsvpData.cover_image && (
            <div className="h-56 sm:h-64 w-full bg-gray-100">
              <img src={rsvpData.cover_image} alt={rsvpData.event_title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* Guest greeting */}
            <div className="text-center mb-8 motion-rise" style={{ animationDelay: "0.1s" }}>
              <p className="text-sm text-[#94a3b8] uppercase tracking-wider mb-1">Dear {rsvpData.guest_name},</p>
              <h1 className="text-3xl font-bold text-[#0D1B2A] mt-2">You&apos;re Invited!</h1>
              <p className="text-[#64748b] mt-1">{rsvpData.host_name} cordially invites you to</p>
            </div>

            {/* Event details */}
            <div className="space-y-4 mb-8 pb-8 border-b border-[#e8edf2] motion-rise" style={{ animationDelay: "0.2s" }}>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#E91E8C]">{rsvpData.event_title}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="flex items-start gap-3 bg-[#f8f9fc] rounded-xl p-4 motion-float-card">
                  <Calendar className="w-5 h-5 text-[#E91E8C] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-0.5">Date</p>
                    <p className="font-semibold text-[#0D1B2A]">{formatDate(rsvpData.event_date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-[#f8f9fc] rounded-xl p-4 motion-float-card-alt">
                  <Clock className="w-5 h-5 text-[#E91E8C] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-0.5">Time</p>
                    <p className="font-semibold text-[#0D1B2A]">{formatTime(rsvpData.event_time)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#f8f9fc] rounded-xl p-4 motion-float-card" style={{ animationDelay: "-2s" }}>
                <MapPin className="w-5 h-5 text-[#E91E8C] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-0.5">Venue</p>
                  <p className="font-semibold text-[#0D1B2A]">{rsvpData.venue}</p>
                </div>
              </div>
            </div>

            {/* RSVP */}
            <div className="mb-6 motion-rise" style={{ animationDelay: "0.3s" }}>
              <p className="text-center text-lg font-bold text-[#0D1B2A] mb-5">Will you attend?</p>

              {error && (
                <div className="mb-4 rounded-xl bg-[#fef2f2] border border-[#fecdd3] p-3">
                  <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {/* Yes button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setResponse(response === "yes" ? null : "yes")}
                    disabled={response === "no"}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-base transition-all ${
                      response === "yes"
                        ? "bg-[#16a34a] text-white shadow-[0_4px_12px_rgba(22,163,74,0.4)] scale-[1.02]"
                        : response === "no"
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-[#16a34a] text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_16px_rgba(22,163,74,0.45)] hover:scale-[1.02]"
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    Yes, I&apos;ll Attend
                  </button>
                </div>

                {/* No button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setResponse(response === "no" ? null : "no")}
                    disabled={response === "yes"}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-base transition-all ${
                      response === "no"
                        ? "bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(220,38,38,0.4)] scale-[1.02]"
                        : response === "yes"
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_16px_rgba(220,38,38,0.45)] hover:scale-[1.02]"
                    }`}
                  >
                    <X className="w-5 h-5" />
                    Sorry, Can&apos;t Attend
                  </button>
                </div>
              </div>

              {response === "no" && (
                <div className="mt-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#64748b] mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Let us know why (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Share your reason..."
                    rows={3}
                    className="w-full rounded-xl border border-[#e8edf2] px-4 py-3 text-sm text-[#0D1B2A] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#E91E8C] resize-none"
                  />
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center motion-rise" style={{ animationDelay: "0.4s" }}>
              <button
                onClick={handleSubmit}
                disabled={!response || submitting}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#E91E8C] to-[#C4166F] text-white font-bold text-base shadow-[0_4px_12px_rgba(233,30,140,0.4)] hover:shadow-[0_6px_16px_rgba(233,30,140,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? "Submitting..." : "Submit Response"}
              </button>
            </div>
          </div>

          {/* Footer branding */}
          <div className="bg-[#f8f9fc] px-6 py-4 text-center border-t border-[#e8edf2] motion-fade-in" style={{ animationDelay: "0.5s" }}>
            <p className="text-xs text-[#94a3b8]">
              Powered by <a href="/" className="text-[#E91E8C] font-semibold hover:underline">Accredit.vip</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
