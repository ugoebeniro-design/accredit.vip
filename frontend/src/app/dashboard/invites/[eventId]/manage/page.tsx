"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface InviteEvent {
  id: number;
  title: string;
  host_name: string;
  venue: string;
  event_date: string;
  event_time: string;
  delivery_channels: string[];
  guest_count_range: string;
  guest_count: number;
}

interface Guest {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  status: "pending" | "delivered" | "opened" | "rsvp_yes" | "rsvp_no" | "failed" | "invalid";
  invited_at?: string;
}

export default function ManageInvitesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.eventId;

  const [event, setEvent] = useState<InviteEvent | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tab, setTab] = useState<"overview" | "guests" | "analytics">("overview");
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadEventData = async () => {
      try {
        // TODO: Fetch event details and guests from API
        setPageLoading(false);
      } catch {
        setPageLoading(false);
      }
    };

    if (user && eventId) {
      loadEventData();
    }
  }, [user, eventId]);

  if (loading || pageLoading || !event) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const guestStats = {
    total: guests.length,
    delivered: guests.filter((g) => g.status === "delivered").length,
    opened: guests.filter((g) => g.status === "opened").length,
    rsvpYes: guests.filter((g) => g.status === "rsvp_yes").length,
    rsvpNo: guests.filter((g) => g.status === "rsvp_no").length,
    failed: guests.filter((g) => g.status === "failed").length,
    invalid: guests.filter((g) => g.status === "invalid").length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fc]">
      <header className="border-b border-[#e8edf2] bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-[#E91E8C] hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-black text-[#0D1B2A]">{event.title}</h1>
            <p className="text-sm text-[#64748b]">by {event.host_name}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-4 border-b border-[#e8edf2]">
          {(["overview", "guests", "analytics"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t
                  ? "border-b-2 border-[#E91E8C] text-[#E91E8C]"
                  : "text-[#64748b] hover:text-[#0D1B2A]"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Guests", value: guestStats.total, color: "#E91E8C" },
                { label: "Delivered", value: guestStats.delivered, color: "#10b981" },
                { label: "Opened", value: guestStats.opened, color: "#3b82f6" },
                { label: "RSVP'd", value: guestStats.rsvpYes, color: "#f59e0b" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[#e8edf2] bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-black" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Event Details */}
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-[#0D1B2A]">Event Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Date & Time
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0D1B2A]">
                    {event.event_date} at {event.event_time}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Venue
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0D1B2A]">{event.venue}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Delivery Channels
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0D1B2A]">
                    {event.delivery_channels.join(", ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Guest Quota
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0D1B2A]">
                    {guests.length} / {event.guest_count}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guests Tab */}
        {tab === "guests" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#0D1B2A]">Guest List</h2>
              <button className="px-4 py-2 rounded-lg bg-[#E91E8C] text-white text-sm font-bold hover:bg-[#C4166F] transition-colors">
                + Add Guests
              </button>
            </div>

            {/* Guest Status Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { label: "All", value: "all", count: guestStats.total },
                { label: "Delivered", value: "delivered", count: guestStats.delivered },
                { label: "Opened", value: "opened", count: guestStats.opened },
                { label: "RSVP'd", value: "rsvp_yes", count: guestStats.rsvpYes },
                { label: "Failed", value: "failed", count: guestStats.failed },
                { label: "Invalid", value: "invalid", count: guestStats.invalid },
              ].map((filter) => (
                <button
                  key={filter.value}
                  className="px-4 py-2 rounded-lg border border-[#e8edf2] bg-white text-sm font-semibold text-[#64748b] hover:border-[#E91E8C] transition-colors whitespace-nowrap"
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Guest Table */}
            <div className="rounded-2xl border border-[#e8edf2] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8edf2] bg-[#f8f9fc]">
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-[#64748b]">
                          No guests yet. Add guests to get started.
                        </td>
                      </tr>
                    ) : (
                      guests.map((guest) => (
                        <tr key={guest.id} className="border-b border-[#e8edf2] hover:bg-[#f8f9fc]">
                          <td className="px-6 py-4 text-sm font-semibold text-[#0D1B2A]">
                            {guest.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#64748b]">
                            {guest.email || guest.phone}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{
                                background:
                                  guest.status === "delivered"
                                    ? "rgba(16,185,129,0.1)"
                                    : "rgba(233,30,140,0.1)",
                                color:
                                  guest.status === "delivered" ? "#10b981" : "#E91E8C",
                              }}
                            >
                              {guest.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-xs font-semibold text-[#E91E8C] hover:underline">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {tab === "analytics" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
              <h2 className="mb-6 text-lg font-bold text-[#0D1B2A]">Delivery Analytics</h2>
              <div className="space-y-4">
                {event.delivery_channels.map((channel) => (
                  <div key={channel}>
                    <p className="mb-2 text-sm font-semibold text-[#0D1B2A]">
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </p>
                    <div className="flex h-8 gap-1 rounded-lg bg-[#f8f9fc] overflow-hidden">
                      <div
                        className="bg-[#10b981]"
                        style={{ width: `${(guestStats.delivered / guestStats.total) * 100 || 0}%` }}
                        title="Delivered"
                      />
                      <div
                        className="bg-[#3b82f6]"
                        style={{ width: `${(guestStats.opened / guestStats.total) * 100 || 0}%` }}
                        title="Opened"
                      />
                      <div
                        className="bg-[#f59e0b]"
                        style={{ width: `${(guestStats.rsvpYes / guestStats.total) * 100 || 0}%` }}
                        title="RSVP'd"
                      />
                      <div
                        className="bg-[#ef4444]"
                        style={{ width: `${(guestStats.failed / guestStats.total) * 100 || 0}%` }}
                        title="Failed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Send History */}
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-[#0D1B2A]">Send History</h2>
              <p className="text-sm text-[#64748b] mb-4">
                Sends remaining: <strong>3</strong> (send up to 3 times)
              </p>
              <button className="px-6 py-2 rounded-lg bg-[#E91E8C] text-white text-sm font-bold hover:bg-[#C4166F] transition-colors">
                Send Invites Now
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
