"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/shared/loading-skeleton";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { API_BASE } from "@/lib/api-client";

type TicketData = {
  reference: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  quantity: number;
  amount: number;
  paid_at: string | null;
  event: {
    id: number;
    title: string;
    event_date: string;
    event_time: string;
    venue: string;
    host_name: string;
  };
};

function TicketContent() {
  const { reference } = useParams<{ reference: string }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reference) return;
    fetch(`${API_BASE}/tickets/purchases/${reference}/ticket`)
      .then((r) => {
        if (!r.ok) throw new Error("Ticket not found");
        return r.json();
      })
      .then(setTicket)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reference]);

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="bg-white/5 rounded-2xl p-8 space-y-4">
          <Skeleton className="h-8 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
          <div className="space-y-3 border-t border-b border-white/10 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48 w-48 mx-auto rounded-xl" />
        </div>
      </div>
    </div>
  );
  if (error || !ticket) return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4">
      <p className="text-muted-foreground">{error || "Ticket not found"}</p>
      <Link href="/" className="text-primary underline underline-offset-4">Go Home</Link>
    </div>
  );

  const qrUrl = `${API_BASE}/tickets/purchases/${reference}/qr-image`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      <div ref={printRef} className="w-full max-w-md">
        {/* Ticket Card */}
        <div className="rounded-2xl bg-white overflow-hidden shadow-2xl">
          {/* Top accent */}
          <div className="h-2 bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500" />

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Admit One</h1>
              <p className="text-sm text-gray-500 mt-1">{ticket.event.title}</p>
            </div>

            {/* Event Details */}
            <div className="border-t border-b border-gray-200 py-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">{ticket.event.event_date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-gray-900">{ticket.event.event_time}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Venue</span>
                <span className="font-medium text-gray-900">{ticket.event.venue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Host</span>
                <span className="font-medium text-gray-900">{ticket.event.host_name}</span>
              </div>
            </div>

            {/* Attendee */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Attendee</p>
              <p className="text-lg font-bold text-gray-900">{ticket.buyer_name}</p>
              <p className="text-sm text-gray-500">{ticket.buyer_email}</p>
              <p className="text-xs text-gray-400 mt-1">
                {ticket.quantity} ticket(s) &middot; Ref: {ticket.reference}
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <img
                src={qrUrl}
                alt="Ticket QR Code"
                className="w-48 h-48 border-2 border-gray-200 rounded-xl"
              />
            </div>

            {/* Status */}
            <div className="text-center">
              <span className="inline-block rounded-full bg-green-100 text-green-800 text-xs font-medium px-3 py-1">
                Payment Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-xl bg-white/10 text-white font-medium py-3 hover:bg-white/20 transition-colors"
          >
            Print Ticket
          </button>
          <Link href={`/events/${ticket.event.id}`} className="flex-1 rounded-xl bg-purple-600 text-white font-medium py-3 text-center hover:bg-purple-500 transition-colors">
            Event Page
          </Link>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Powered by Accredit.vip
        </p>
      </div>
    </div>
  );
}

export default function TicketPage() {
  return (
    <ErrorBoundary>
      <TicketContent />
    </ErrorBoundary>
  );
}
