import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ClientProviders } from "./client-providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "accredit.vip — Premium Event Infrastructure for Africa",
  description:
    "Create events, manage guests, send invitations via WhatsApp/SMS/Email, generate QR codes, and track attendance — all from one beautiful platform built for Africa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>
        <AuthProvider>
          {children}
          <ClientProviders />
        </AuthProvider>
      </body>
    </html>
  );
}
