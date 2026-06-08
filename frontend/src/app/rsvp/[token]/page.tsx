"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Check, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface RSVPData {
  event_title: string;
  event_date: string;
  event_time: string;
  venue: string;
  host_name: string;
  guest_name: string;
}

export default function RSVPPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token;

  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadRsvpData = async () => {
      try {
        const data = await apiClient<RSVPData>(`/rsvp/${token}`);
        setRsvpData(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid or expired RSVP link");
        setLoading(false);
      }
    };

    if (token) {
      loadRsvpData();
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!response) {
      setError("Please select a response");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await apiClient(`/rsvp/${token}`, {
        method: "POST",
        body: JSON.stringify({ response }),
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
          <p className="mt-2 text-[#64748b]">{error || "This RSVP link is no longer valid"}</p>
          <p className="mt-4 text-sm text-[#94a3b8]">
            Please check your email for the correct link or contact the event organizer.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 border border-[#e8edf2] text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0fdf4]">
            <svg className="h-8 w-8 text-[#10b981]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Thank You!</h1>
          <p className="mt-2 text-[#64748b]">
            Your response has been recorded. {response === "yes" ? "See you at the event!" : "We'll miss you!"}
          </p>
          <p className="mt-4 text-sm text-[#94a3b8]">
            You can close this window now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E91E8C]/5 to-[#C4166F]/5 px-4 py-8">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 border border-[#e8edf2] shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-[#0D1B2A]">You're Invited!</h1>
          <p className="mt-2 text-[#64748b]">Join us for a special celebration</p>
        </div>

        <div className="space-y-4 mb-8 pb-8 border-b border-[#e8edf2]">
          <div>
            <p className="text-sm text-[#64748b] mb-1">Event</p>
            <p className="font-bold text-[#0D1B2A] text-lg">{rsvpData.event_title}</p>
          </div>
          <div>
            <p className="text-sm text-[#64748b] mb-1">Host</p>
            <p className="font-semibold text-[#0D1B2A]">{rsvpData.host_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-[#64748b] mb-1">
                <Calendar className="w-4 h-4" />
                <span>Date</span>
              </div>
              <p className="font-semibold text-[#0D1B2A]">{rsvpData.event_date}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm text-[#64748b] mb-1">
                <Clock className="w-4 h-4" />
                <span>Time</span>
              </div>
              <p className="font-semibold text-[#0D1B2A]">{rsvpData.event_time}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm text-[#64748b] mb-1">
              <MapPin className="w-4 h-4" />
              <span>Venue</span>
            </div>
            <p className="font-semibold text-[#0D1B2A]">{rsvpData.venue}</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-lg font-bold text-[#0D1B2A] mb-4">Will you attend?</p>

          {error && (
            <div className="mb-4 rounded-xl bg-[#fef2f2] border border-[#fecdd3] p-3">
              <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setResponse("yes")}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                response === "yes"
                  ? "bg-[#E91E8C] text-white"
                  : "bg-[#f0fdf4] text-[#166534] border border-[#dcfce7] hover:bg-[#dcfce7]"
              }`}
            >
              <Check className="w-4 h-4" />
              Yes, I'll Attend
            </button>

            <button
              onClick={() => setResponse("no")}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                response === "no"
                  ? "bg-[#ef4444] text-white"
                  : "bg-[#fef2f2] text-[#991b1b] border border-[#fecdd3] hover:bg-[#fecdd3]"
              }`}
            >
              <X className="w-4 h-4" />
              Sorry, Can't Attend
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!response || submitting}
          className="w-full px-6 py-3 rounded-xl bg-[#E91E8C] text-white font-bold hover:bg-[#C4166F] disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Response"}
        </button>

        <p className="text-xs text-[#94a3b8] text-center mt-4">
          Your response will be recorded and sent to the event organizer.
        </p>
      </div>
    </div>
  );
}
