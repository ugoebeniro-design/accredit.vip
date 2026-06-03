import { Navbar } from "@/components/shared/navbar";
import { HomePageClient } from "@/components/home/home-page-client";

export const metadata = {
  title: "accredit.vip — Premium Event Infrastructure for Africa",
  description:
    "Create events, manage guests, send invitations via WhatsApp/SMS/Email, generate QR codes, and track attendance — all from one premium platform built for Africa.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar variant="solid" />
      <HomePageClient />
    </div>
  );
}
