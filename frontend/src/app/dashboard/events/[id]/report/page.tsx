"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Guest = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  rsvp_status: string;
  invite_sent: boolean;
  invite_attempts: number;
  invite_viewed_at: string | null;
  notes: string | null;
  tags: string[];
  created_at: string | null;
  qr_token: string | null;
  communication_status?: Record<string, { status: string }>;
};

export default function EventReportPage() {
  const params = useParams();
  const id = params?.id as string;
  const [event, setEvent] = useState<any>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiClient<any>(`/events/${id}`),
      apiClient<{ guests: Guest[] }>(`/events/${id}/guests?limit=1000`),
    ])
      .then(([evt, gst]) => {
        setEvent(evt);
        setGuests(gst.guests);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full" />
      </div>
    );
  }

  const accepted = guests.filter((g) => g.rsvp_status === "accepted");
  const declined = guests.filter((g) => g.rsvp_status === "declined");
  const pending = guests.filter((g) => g.rsvp_status === "pending");
  const sent = guests.filter((g) => g.invite_sent);
  const notSent = guests.filter((g) => !g.invite_sent);
  const hasContact = guests.filter((g) => g.email || g.phone);
  const noContact = guests.filter((g) => !g.email && !g.phone);
  const withNotes = guests.filter((g) => g.notes);
  const withTags = guests.filter((g) => g.tags && g.tags.length > 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Print-optimized styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-size: 11pt; }
          @page { margin: 0.75in; }
          .break-after { page-break-after: always; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Toolbar */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10 no-print">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/dashboard/events/${id}?tab=guests`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900">{event?.title || "Event Report"}</h1>
          {event?.event_date && (
            <p className="text-slate-500 mt-2">
              {new Date(event.event_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {event.event_time && <> at {(() => { const p = event.event_time.split(":"); if (p.length < 2) return event.event_time; const h = parseInt(p[0]); return `${h % 12 || 12}:${p[1]} ${h >= 12 ? "PM" : "AM"}`; })()}</>}
            </p>
          )}
          {event?.venue && <p className="text-slate-500">{event.venue}</p>}
          <p className="text-xs text-slate-400 mt-1">Report generated {new Date().toLocaleString()}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Guests", value: guests.length, color: "bg-slate-100 text-slate-900" },
            { label: "Accepted", value: accepted.length, color: "bg-emerald-100 text-emerald-900" },
            { label: "Pending", value: pending.length, color: "bg-amber-100 text-amber-900" },
            { label: "Declined", value: declined.length, color: "bg-red-100 text-red-900" },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-medium text-blue-600">Invite Sent</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{sent.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-600">Not Yet Sent</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{notSent.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-600">Has Contact</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{hasContact.length}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-xs font-medium text-red-600">No Contact</p>
            <p className="text-xl font-bold text-red-900 mt-1">{noContact.length}</p>
          </div>
        </div>

        {/* Guest Table */}
        <h2 className="text-lg font-bold text-slate-900 mb-4">Guest List ({guests.length})</h2>
        {guests.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No guests added yet.</p>
        ) : (
          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">RSVP</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Invite</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Tags</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-sm font-medium text-slate-900">{g.name}</td>
                  <td className="py-2.5 px-3 text-sm text-slate-600">
                    {[g.email, g.phone].filter(Boolean).join(" · ") || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      g.rsvp_status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                      g.rsvp_status === "declined" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {g.rsvp_status === "accepted" ? "Accepted" : g.rsvp_status === "declined" ? "Declined" : "Pending"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs text-slate-600">
                    {g.invite_sent ? `Sent (${g.invite_attempts})` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-600 max-w-[200px] truncate">
                    {g.notes || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    {g.tags && g.tags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {g.tags.map((t) => (
                          <span key={t} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{t}</span>
                        ))}
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Notes Section */}
        {withNotes.length > 0 && (
          <div className="break-after">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Guest Notes ({withNotes.length})</h2>
            <div className="space-y-2">
              {withNotes.map((g) => (
                <div key={g.id} className="border border-slate-200 rounded-lg p-3">
                  <p className="font-medium text-sm text-slate-900">{g.name}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{g.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags Section */}
        {withTags.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Tag Summary</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(guests.flatMap((g) => g.tags || []))).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                  {tag}
                  <span className="text-xs text-slate-400">({guests.filter((g) => (g.tags || []).includes(tag)).length})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>Accredit.vip — {event?.title} — Report generated {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
