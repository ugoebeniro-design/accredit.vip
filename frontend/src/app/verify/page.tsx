"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error" | "code">("loading");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("code");
      setMessage("Enter the verification code sent to your phone.");
      return;
    }
    fetch(`${API_BASE}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Verification failed");
        setStatus("success");
        setMessage("Your account has been verified successfully!");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Invalid or expired verification link.");
      });
  }, [token]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) return;
    setVerifyingCode(true);
    try {
      const r = await fetch(`${API_BASE}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      if (!r.ok) throw new Error("Invalid code");
      setStatus("success");
      setMessage("Your account has been verified successfully!");
    } catch {
      setMessage("Invalid or expired verification code.");
    }
    setVerifyingCode(false);
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 animate-orb"
        style={{ background: "radial-gradient(circle, #E91E8C 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15 animate-orb"
        style={{ background: "radial-gradient(circle, #4f7cdc 0%, transparent 70%)", filter: "blur(80px)", animationDelay: "2s" }}
      />

      <div className="relative z-10 text-center w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="inline-block mb-10">
          <Image
            src="/logo-dark-trim.png"
            alt="accredit.vip"
            width={4071}
            height={761}
            className="h-12 w-auto object-contain mx-auto"
          />
        </Link>

        {/* Loading */}
        {status === "loading" && (
          <div
            className="p-10 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex flex-col items-center gap-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)" }}
              >
                <svg className="w-7 h-7 text-[#E91E8C] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">Verifying your account</h1>
                <p className="text-white/50 text-sm">Please wait a moment...</p>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div
            className="p-10 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6"
              style={{
                background: "linear-gradient(135deg, #E91E8C, #C4166F)",
                boxShadow: "0 8px 30px rgba(233,30,140,0.5)",
              }}
            >
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-3">Account Verified!</h1>
            <p className="text-white/65 text-sm leading-relaxed mb-8">{message}</p>
            <Link href="/login" className="btn-primary w-full justify-center">
              Sign In to Your Account
            </Link>
            <Link
              href="/"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm font-semibold text-white transition-all hover:border-[#E91E8C]/45 hover:text-[#E91E8C]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        )}

        {/* Code input */}
        {status === "code" && (
          <div
            className="p-10 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 text-3xl"
              style={{
                background: "linear-gradient(135deg, #E91E8C, #C4166F)",
                boxShadow: "0 8px 30px rgba(233,30,140,0.5)",
              }}
            >
              📱
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-3">Enter Verification Code</h1>
            <p className="text-white/65 text-sm leading-relaxed mb-6">{message}</p>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-[0.3em] h-14 rounded-xl border border-white/20 bg-white/10 px-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/50"
                required
              />
              <button
                type="submit"
                disabled={verifyingCode || code.length < 4}
                className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-60"
              >
                {verifyingCode ? "Verifying..." : "Verify Account"}
              </button>
            </form>
            {message && status !== "code" && <p className="text-red-400 text-sm mt-3">{message}</p>}
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div
            className="p-10 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <svg className="w-9 h-9 text-red-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-3">Verification Failed</h1>
            <p className="text-white/65 text-sm leading-relaxed mb-8">{message}</p>
            <Link href="/register" className="btn-primary w-full justify-center mb-3">
              Create New Account
            </Link>
            <Link href="/login" className="btn-secondary w-full justify-center text-sm">
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-hero-gradient">
          <div className="text-white/60 animate-pulse">Loading...</div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
