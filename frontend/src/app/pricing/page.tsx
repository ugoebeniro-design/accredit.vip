"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

const channels = [
  {
    id: "email",
    name: "Email",
    price: "₦100k",
    note: "Formal, branded delivery for 1-100 guests.",
    features: ["QR code included", "Invite preview", "RSVP tracking", "Delivery report", "Guest list upload"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    price: "₦200k",
    note: "Fast, familiar delivery for 1-100 guests.",
    features: ["QR code included", "Invite preview", "RSVP tracking", "Reminder-ready flow", "Delivery report"],
    highlight: true,
  },
  {
    id: "sms",
    name: "SMS",
    price: "₦300k",
    note: "Reliable delivery for 1-100 guests, even without internet.",
    features: ["QR code included", "Short invite message", "RSVP tracking", "Delivery report", "Guest list upload"],
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar variant="light" />

      <main className="flex-1">
        <section className="bg-[#07182f] px-4 py-8 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ff7abf]">
              Channel pricing
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <h1 className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                Pay by invite channel, not by package.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/68">
                Each channel price covers 1-100 guests and includes the QR accreditation flow.
                Users can test CREATE INVITE or POST EVENT once before creating an account.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
            {channels.map((channel) => (
              <article
                key={channel.id}
                className="flex flex-col rounded-2xl border p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                style={{
                  background: channel.highlight ? "#101c2c" : "white",
                  borderColor: channel.highlight ? "rgba(233,30,140,0.55)" : "#e2e8f0",
                }}
              >
                {channel.highlight && (
                  <span className="mb-5 w-fit rounded-full bg-[#E91E8C] px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                    Popular
                  </span>
                )}
                <h2 className="text-2xl font-black" style={{ color: channel.highlight ? "white" : "#07182f" }}>
                  {channel.name}
                </h2>
                <p className="mt-2 text-sm leading-6" style={{ color: channel.highlight ? "rgba(255,255,255,0.66)" : "#64748b" }}>
                  {channel.note}
                </p>
                <div className="mt-7">
                  <span className="text-5xl font-black" style={{ color: channel.highlight ? "white" : "#07182f" }}>
                    {channel.price}
                  </span>
                  <span className="ml-2 text-sm" style={{ color: channel.highlight ? "rgba(255,255,255,0.48)" : "#94a3b8" }}>
                    / 1-100 guests
                  </span>
                </div>
                <ul className="mt-8 space-y-3">
                  {channel.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: channel.highlight ? "rgba(255,255,255,0.86)" : "#23466f" }}>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1f8] text-xs font-black text-[#E91E8C]">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/create-event"
                  className={`mt-auto inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-bold transition-all ${
                    channel.highlight
                      ? "bg-gradient-to-r from-[#E91E8C] to-[#C4166F] text-white"
                      : "bg-[#07182f] text-white hover:bg-[#E91E8C]"
                  }`}
                >
                  Test this channel
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
