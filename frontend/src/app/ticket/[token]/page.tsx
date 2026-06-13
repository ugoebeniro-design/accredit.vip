"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface TicketData {
  guest_name: string;
  event_title: string;
  event_date: string;
  event_time: string;
  venue: string;
  status: string;
  valid: boolean;
}

export default function TicketPage() {
  const params = useParams();
  const token = params?.token;
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    apiClient<TicketData>(`/qr/${token}`)
      .then(setTicket)
      .catch((err) => setError(err instanceof Error ? err.message : "Invalid QR code"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D1B2A]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#E91E8C]" />
          <p className="text-white/60">Loading your ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center">
          <XCircle className="mx-auto mb-4 w-16 h-16 text-red-500" />
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Invalid QR Code</h1>
          <p className="mt-2 text-[#64748b]">{error || "This QR code is not recognized."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full rounded-2xl bg-white overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#E91E8C] to-[#C4166F] p-6 text-center">
          <p className="text-white/70 text-sm uppercase tracking-widest mb-1">Entry Ticket</p>
          <h1 className="text-white text-2xl font-black">{ticket.event_title}</h1>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center pb-4 border-b border-[#e8edf2]">
            <p className="text-[#64748b] text-sm">Guest</p>
            <p className="text-xl font-bold text-[#0D1B2A]">{ticket.guest_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-[#64748b] mb-1">
                <Calendar className="w-4 h-4" />
                <span>Date</span>
              </div>
              <p className="font-semibold text-[#0D1B2A]">{ticket.event_date}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm text-[#64748b] mb-1">
                <Clock className="w-4 h-4" />
                <span>Time</span>
              </div>
              <p className="font-semibold text-[#0D1B2A]">{ticket.event_time}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-sm text-[#64748b] mb-1">
              <MapPin className="w-4 h-4" />
              <span>Venue</span>
            </div>
            <p className="font-semibold text-[#0D1B2A]">{ticket.venue}</p>
          </div>

          {ticket.valid ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800 text-sm">Valid Ticket</p>
                <p className="text-xs text-green-600">Show this at the entrance</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-800 text-sm">Expired</p>
                <p className="text-xs text-red-600">This ticket is no longer valid</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#f8f9fc] px-6 py-4 text-center">
          <p className="text-xs text-[#94a3b8]">
            Powered by <span className="font-semibold text-[#E91E8C]">Accredit.vip</span>
          </p>
        </div>
      </div>
    </div>
  );
}
