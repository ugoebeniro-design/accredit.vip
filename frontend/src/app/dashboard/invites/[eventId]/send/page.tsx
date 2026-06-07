"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

interface Guest {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  status: string;
}

interface Event {
  id: number;
  title: string;
  delivery_channels: string[];
  event_date: string;
  event_time: string;
}

export default function SendInvitesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.eventId;

  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<Set<number>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading_, setLoading_] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventData, guestsData] = await Promise.all([
          apiClient<Event>(`/events/${eventId}`),
          apiClient<Guest[]>(`/guests/${eventId}`),
        ]);

        setEvent(eventData);
        setGuests(guestsData);
        setSelectedChannels(new Set(eventData.delivery_channels || []));
        setLoading_(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading_(false);
      }
    };

    if (user && eventId) {
      loadData();
    }
  }, [user, eventId]);

  const handleSelectAll = () => {
    if (selectedGuests.size === guests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(guests.map((g) => g.id)));
    }
  };

  const handleSelectGuest = (guestId: number) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const handleChannelToggle = (channel: string) => {
    const newChannels = new Set(selectedChannels);
    if (newChannels.has(channel)) {
      newChannels.delete(channel);
    } else {
      newChannels.add(channel);
    }
    setSelectedChannels(newChannels);
  };

  const handleSend = async () => {
    if (selectedGuests.size === 0) {
      setError("Please select at least one guest");
      return;
    }

    if (selectedChannels.size === 0) {
      setError("Please select at least one delivery channel");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient<{
        invites_sent: number;
        send_attempts_remaining: number;
      }>("/invites/send", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          channels: Array.from(selectedChannels),
          custom_message: customMessage || null,
          guest_ids: Array.from(selectedGuests),
        }),
      });

      setSuccess(`✓ Invites sent to ${response.invites_sent} guest(s)! You have ${response.send_attempts_remaining} send attempt(s) remaining.`);
      setTimeout(() => {
        router.push(`/dashboard/invites/${eventId}/manage`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invites");
    } finally {
      setSending(false);
    }
  };

  if (loading_) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8f9fc]">
        <header className="border-b border-[#e8edf2] bg-white">
          <div className="container mx-auto px-4 py-4">
            <Link href="/dashboard" className="text-sm font-semibold text-[#E91E8C] hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-black text-[#0D1B2A]">Event Not Found</h1>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fc]">
      <header className="border-b border-[#e8edf2] bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/dashboard/invites/${eventId}/manage`} className="text-sm font-semibold text-[#E91E8C] hover:underline">
            ← Back to Management
          </Link>
          <h1 className="mt-2 text-2xl font-black text-[#0D1B2A]">Send Invitations</h1>
          <p className="text-sm text-[#64748b]">{event.title}</p>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Guest Selection */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6">
              {error && (
                <div className="mb-6 rounded-xl bg-[#fef2f2] border border-[#fecdd3] p-4">
                  <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] p-4">
                  <p className="text-sm font-semibold text-[#166534]">{success}</p>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#0D1B2A]">Select Guests ({selectedGuests.size} of {guests.length})</h2>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm font-semibold text-[#E91E8C] hover:underline"
                  >
                    {selectedGuests.size === guests.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto border border-[#e8edf2] rounded-xl p-4">
                  {guests.length === 0 ? (
                    <p className="text-center text-[#64748b] py-8">No guests added yet</p>
                  ) : (
                    guests.map((guest) => (
                      <label key={guest.id} className="flex items-center gap-3 p-3 hover:bg-[#f8f9fc] rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGuests.has(guest.id)}
                          onChange={() => handleSelectGuest(guest.id)}
                          className="w-4 h-4 rounded border-[#d9e2ec] accent-[#E91E8C]"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-[#0D1B2A]">{guest.name}</p>
                          <p className="text-xs text-[#64748b]">
                            {guest.email && <span>{guest.email}</span>}
                            {guest.email && guest.phone && <span> • </span>}
                            {guest.phone && <span>{guest.phone}</span>}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-[#f0f4f8] text-[#64748b] font-semibold">
                          {guest.status}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-[#e8edf2] pt-6">
                <h3 className="text-lg font-bold text-[#0D1B2A] mb-4">Customize Message</h3>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message to your guests (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C] resize-none"
                  rows={5}
                />
                <p className="text-xs text-[#64748b] mt-2">
                  This message will be included in the invitation email
                </p>
              </div>
            </div>
          </div>

          {/* Right: Summary & Channels */}
          <div>
            <div className="rounded-2xl border border-[#e8edf2] bg-white p-6 sticky top-24">
              <h2 className="text-lg font-bold text-[#0D1B2A] mb-6">Send Summary</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-[#e8edf2]">
                <div>
                  <p className="text-sm text-[#64748b] mb-1">Event</p>
                  <p className="font-bold text-[#0D1B2A]">{event.title}</p>
                </div>
                <div>
                  <p className="text-sm text-[#64748b] mb-1">Selected Guests</p>
                  <p className="font-bold text-[#0D1B2A]">{selectedGuests.size} guests</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-[#0D1B2A] mb-3">Delivery Channels</h3>
                <div className="space-y-2">
                  {["email", "whatsapp", "sms"].map((channel) => (
                    <label key={channel} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedChannels.has(channel)}
                        onChange={() => handleChannelToggle(channel)}
                        disabled={!event.delivery_channels.includes(channel)}
                        className="w-4 h-4 rounded border-[#d9e2ec] accent-[#E91E8C] disabled:opacity-50"
                      />
                      <span className={`font-semibold ${
                        event.delivery_channels.includes(channel)
                          ? "text-[#0D1B2A]"
                          : "text-[#b0b8c1]"
                      }`}>
                        {channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </span>
                      {!event.delivery_channels.includes(channel) && (
                        <span className="text-xs text-[#94a3b8]">(not selected)</span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[#64748b] mt-3">
                  Only channels you selected at payment are available
                </p>
              </div>

              <button
                onClick={handleSend}
                disabled={sending || selectedGuests.size === 0 || selectedChannels.size === 0}
                className="w-full px-6 py-3 rounded-xl bg-[#E91E8C] text-white font-bold hover:bg-[#C4166F] disabled:opacity-50 transition-colors"
              >
                {sending ? "Sending..." : "Send Invitations"}
              </button>

              <Link
                href={`/dashboard/invites/${eventId}/manage`}
                className="block w-full mt-3 px-6 py-3 rounded-xl border border-[#d9e2ec] text-[#0D1B2A] font-bold hover:bg-[#f8f9fc] transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
