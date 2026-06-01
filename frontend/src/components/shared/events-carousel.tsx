"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface PublicEvent {
  id: number;
  title: string;
  venue: string;
  event_date: string;
  category: string;
  description: string;
  cover_image: string | null;
  timezone: string;
}

export function EventsCarousel() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/events/public`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.slice(0, 10));
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading || events.length === 0) return null;

  return (
    <section className="motion-rise py-12 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E91E8C]">Live Events</span>
            <h2 className="text-xl font-bold text-[#0D1B2A] mt-1">Discover events happening near you</h2>
          </div>
          <Link href="/attend" className="text-xs font-semibold text-[#E91E8C] hover:underline flex-shrink-0">
            View all &rarr;
          </Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 px-4 sm:px-6 lg:px-8 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {[...events, ...events].map((ev, i) => (
          <Link
            key={`${ev.id}-${i}`}
            href={`/events/${ev.id}`}
            className="event-card-motion flex-shrink-0 w-64 rounded-2xl border border-[#e8edf2] p-4 hover:shadow-lg transition-all hover:-translate-y-1 no-underline"
            style={{ scrollSnapAlign: "start" }}
          >
            {ev.cover_image && (
              <div
                className="w-full h-32 rounded-xl mb-3 bg-cover bg-center"
                style={{ backgroundImage: `url(${ev.cover_image.startsWith("http") ? ev.cover_image : `${API_BASE.replace("/api/v1", "")}${ev.cover_image}`})` }}
              />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E91E8C]">{ev.category || "Event"}</span>
            <h3 className="text-sm font-bold text-[#0D1B2A] mt-1 leading-snug">{ev.title}</h3>
            <p className="text-xs text-gray-400 mt-1 truncate">{ev.venue}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ev.event_date ? new Date(ev.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
