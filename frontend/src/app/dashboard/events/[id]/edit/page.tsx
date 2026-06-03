"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getEvent, updateEvent, type EventData } from "@/lib/api/events";
import { GoBack } from "@/components/shared/go-back";
import { VenueInput } from "@/components/shared/venue-input";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    event_type: "wedding",
    host_name: "",
    event_date: "",
    event_time: "",
    timezone: "WAT",
    venue: "",
    guest_count_range: "1-100",
    description: "",
    dress_code: "",
    map_link: "",
    ticket_price: "",
    tickets_available: "",
  });
  const [locationData, setLocationData] = useState<{ city: string | null; state: string | null; country: string | null; lat: number | null; lng: number | null }>({ city: null, state: null, country: "Nigeria", lat: null, lng: null });
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user && id) {
      setLoadError(false);
      getEvent(Number(id)).then((e) => {
        setEvent(e);
        setForm({
          title: e.title,
          event_type: e.event_type,
          host_name: e.host_name,
          event_date: e.event_date,
          event_time: e.event_time,
          timezone: e.timezone || "WAT",
          venue: e.venue,
          guest_count_range: e.guest_count_range,
          description: e.description || "",
          dress_code: e.dress_code || "",
          map_link: e.map_link || "",
          ticket_price: e.ticket_price?.toString() || "",
          tickets_available: e.tickets_available?.toString() || "",
        });
      }).catch(() => setLoadError(true));
    }
  }, [user, loading, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await updateEvent(Number(id), {
        ...form,
        timezone: form.timezone || "WAT",
        is_public: event?.is_public || false,
        category: form.event_type,
        ticket_price: form.ticket_price ? Number(form.ticket_price) : undefined,
        tickets_available: form.tickets_available ? Number(form.tickets_available) : undefined,
        city: locationData.city || event?.city || undefined,
        state: locationData.state || event?.state || undefined,
        country: locationData.country || event?.country || "Nigeria",
        latitude: locationData.lat ?? event?.latitude ?? undefined,
        longitude: locationData.lng ?? event?.longitude ?? undefined,
      });
      router.push(`/dashboard/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    }
    setSubmitting(false);
  };

  if (loading || !user) return null;
  if (loadError) return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-semibold">Could not load event</h2>
        <p className="text-sm text-muted-foreground">The event may have been deleted or a network error occurred.</p>
        <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent">Go to Dashboard</button>
      </div>
    </div>
  );
  if (!event) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Accredit<span className="text-primary">.vip</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground">Dashboard</Link>
            <span className="text-sm text-muted-foreground">{user.full_name}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6"><GoBack fallback={`/dashboard/events/${id}`} /></div>
        <h1 className="text-2xl font-bold mb-8">Edit Event</h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="wedding">Wedding</option>
                <option value="birthday">Birthday</option>
                <option value="corporate">Corporate</option>
                <option value="concert">Concert</option>
                <option value="conference">Conference</option>
                <option value="festival">Festival</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Host Name</label>
              <input value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Guest Count</label>
              <select value={form.guest_count_range} onChange={(e) => setForm({ ...form, guest_count_range: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="1-100">1-100</option>
                <option value="101-200">101-200</option>
                <option value="201-400">201-400</option>
                <option value="400+">400+</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <select value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Select time</option>
                <option value="00:00">12:00 AM</option>
                <option value="00:30">12:30 AM</option>
                <option value="01:00">1:00 AM</option>
                <option value="01:30">1:30 AM</option>
                <option value="02:00">2:00 AM</option>
                <option value="02:30">2:30 AM</option>
                <option value="03:00">3:00 AM</option>
                <option value="03:30">3:30 AM</option>
                <option value="04:00">4:00 AM</option>
                <option value="04:30">4:30 AM</option>
                <option value="05:00">5:00 AM</option>
                <option value="05:30">5:30 AM</option>
                <option value="06:00">6:00 AM</option>
                <option value="06:30">6:30 AM</option>
                <option value="07:00">7:00 AM</option>
                <option value="07:30">7:30 AM</option>
                <option value="08:00">8:00 AM</option>
                <option value="08:30">8:30 AM</option>
                <option value="09:00">9:00 AM</option>
                <option value="09:30">9:30 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="10:30">10:30 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="11:30">11:30 AM</option>
                <option value="12:00">12:00 PM</option>
                <option value="12:30">12:30 PM</option>
                <option value="13:00">1:00 PM</option>
                <option value="13:30">1:30 PM</option>
                <option value="14:00">2:00 PM</option>
                <option value="14:30">2:30 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="15:30">3:30 PM</option>
                <option value="16:00">4:00 PM</option>
                <option value="16:30">4:30 PM</option>
                <option value="17:00">5:00 PM</option>
                <option value="17:30">5:30 PM</option>
                <option value="18:00">6:00 PM</option>
                <option value="18:30">6:30 PM</option>
                <option value="19:00">7:00 PM</option>
                <option value="19:30">7:30 PM</option>
                <option value="20:00">8:00 PM</option>
                <option value="20:30">8:30 PM</option>
                <option value="21:00">9:00 PM</option>
                <option value="21:30">9:30 PM</option>
                <option value="22:00">10:00 PM</option>
                <option value="22:30">10:30 PM</option>
                <option value="23:00">11:00 PM</option>
                <option value="23:30">11:30 PM</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <optgroup label="Africa">
                  <option value="WAT">🇳🇬 WAT (UTC+1) — Lagos, Nigeria</option>
                  <option value="CAT">🇿🇦 CAT (UTC+2) — Johannesburg, Cape Town</option>
                  <option value="EAT">🇰🇪 EAT (UTC+3) — Nairobi, Dar es Salaam</option>
                  <option value="GMT">🇬🇭 GMT (UTC+0) — Accra, Abidjan</option>
                  <option value="SAST">🇿🇦 SAST (UTC+2) — South Africa (standard)</option>
                  <option value="MUT">🇲🇺 MUT (UTC+4) — Mauritius, Seychelles</option>
                  <option value="WEST">🇲🇦 WEST (UTC+1) — Casablanca, Tunis</option>
                </optgroup>
                <optgroup label="Europe / UK">
                  <option value="BST">🇬🇧 BST (UTC+1) — London (summer)</option>
                  <option value="CET">🇫🇷 CET (UTC+1) — Paris, Berlin, Rome, Madrid</option>
                  <option value="CEST">🇫🇷 CEST (UTC+2) — Central Europe (summer)</option>
                  <option value="EET">🇬🇷 EET (UTC+2) — Athens, Helsinki, Bucharest</option>
                  <option value="EEST">🇬🇷 EEST (UTC+3) — Eastern Europe (summer)</option>
                  <option value="MSK">🇷🇺 MSK (UTC+3) — Moscow, St. Petersburg</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="EST">🇺🇸 EST (UTC-5) — New York, Miami, Toronto</option>
                  <option value="EDT">🇺🇸 EDT (UTC-4) — Eastern US (summer)</option>
                  <option value="CST">🇺🇸 CST (UTC-6) — Chicago, Mexico City</option>
                  <option value="CDT">🇺🇸 CDT (UTC-5) — Central US (summer)</option>
                  <option value="MST">🇺🇸 MST (UTC-7) — Denver, Phoenix</option>
                  <option value="MDT">🇺🇸 MDT (UTC-6) — Mountain US (summer)</option>
                  <option value="PST">🇺🇸 PST (UTC-8) — Los Angeles, Vancouver</option>
                  <option value="PDT">🇺🇸 PDT (UTC-7) — Pacific US (summer)</option>
                  <option value="AKST">🇺🇸 AKST (UTC-9) — Anchorage, Alaska</option>
                  <option value="HAST">🇺🇸 HAST (UTC-10) — Honolulu, Hawaii</option>
                  <option value="ART">🇦🇷 ART (UTC-3) — Buenos Aires, Montevideo</option>
                  <option value="BRT">🇧🇷 BRT (UTC-3) — Brasília, São Paulo</option>
                  <option value="CLT">🇨🇱 CLT (UTC-4) — Santiago, Asunción</option>
                  <option value="PET">🇵🇪 PET (UTC-5) — Lima, Bogotá, Quito</option>
                  <option value="AST">🇵🇷 AST (UTC-4) — San Juan, Port of Spain</option>
                </optgroup>
                <optgroup label="Asia / Middle East">
                  <option value="GST">🇦🇪 GST (UTC+4) — Dubai, Abu Dhabi, Muscat</option>
                  <option value="AST_A">🇸🇦 AST (UTC+3) — Riyadh, Kuwait, Doha</option>
                  <option value="IST">🇮🇳 IST (UTC+5:30) — New Delhi, Mumbai, Colombo</option>
                  <option value="PKT">🇵🇰 PKT (UTC+5) — Karachi, Lahore, Islamabad</option>
                  <option value="BST_A">🇧🇩 BST (UTC+6) — Dhaka</option>
                  <option value="ICT">🇹🇭 ICT (UTC+7) — Bangkok, Hanoi, Phnom Penh</option>
                  <option value="SGT">🇸🇬 SGT (UTC+8) — Singapore, Kuala Lumpur</option>
                  <option value="CST_A">🇨🇳 CST (UTC+8) — Beijing, Shanghai, Hong Kong</option>
                  <option value="JST">🇯🇵 JST (UTC+9) — Tokyo, Seoul, Osaka</option>
                  <option value="WIB">🇮🇩 WIB (UTC+7) — Jakarta, Sumatra</option>
                  <option value="WITA">🇮🇩 WITA (UTC+8) — Bali, Sulawesi</option>
                  <option value="WIT">🇮🇩 WIT (UTC+9) — Papua, Maluku</option>
                  <option value="PHST">🇵🇭 PHST (UTC+8) — Manila</option>
                </optgroup>
                <optgroup label="Oceania">
                  <option value="AEST">🇦🇺 AEST (UTC+10) — Sydney, Melbourne, Brisbane</option>
                  <option value="AEDT">🇦🇺 AEDT (UTC+11) — Eastern Australia (summer)</option>
                  <option value="ACST">🇦🇺 ACST (UTC+9:30) — Adelaide, Darwin</option>
                  <option value="AWST">🇦🇺 AWST (UTC+8) — Perth</option>
                  <option value="NZST">🇳🇿 NZST (UTC+12) — Auckland, Wellington</option>
                  <option value="NZDT">🇳🇿 NZDT (UTC+13) — New Zealand (summer)</option>
                  <option value="FJT">🇫🇯 FJT (UTC+12) — Suva, Fiji</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Venue</label>
            <VenueInput
              value={form.venue}
              onChange={(v) => setForm({ ...form, venue: v })}
              onLocationChange={setLocationData}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-none" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dress Code</label>
              <input value={form.dress_code} onChange={(e) => setForm({ ...form, dress_code: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Map Link</label>
              <input value={form.map_link} onChange={(e) => setForm({ ...form, map_link: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
