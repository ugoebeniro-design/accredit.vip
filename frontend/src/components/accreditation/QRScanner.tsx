"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Loader } from "lucide-react";

interface QRScannerProps {
  onScan: (token: string) => void;
  onError: (message: string) => void;
  onStart: () => void;
  onStop: () => void;
  scanningDisabled?: boolean;
}

export default function QRScanner({ onScan, onError, onStart, onStop, scanningDisabled }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [error, setError] = useState("");
  const [Html5QrcodeLib, setHtml5QrcodeLib] = useState<any>(null);

  useEffect(() => {
    import("html5-qrcode").then((mod) => setHtml5QrcodeLib(mod.Html5Qrcode)).catch(() => {});
    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
    } catch {}
    scannerRef.current = null;
    setScannerStarted(false);
    onStop();
  };

  const startScanner = async () => {
    setError("");
    if (!Html5QrcodeLib) return;

    onStart();
    setScannerStarted(true);
    await new Promise((r) => setTimeout(r, 100));

    if (!mountedRef.current) return;

    try {
      const scanner = new Html5QrcodeLib("qr-reader");
      scannerRef.current = scanner;

      setTimeout(() => {
        const el = document.getElementById("qr-reader");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 200, height: 200 } },
        (decodedText: string) => {
          if (scanningDisabled) return;
          const token = decodedText.split("/").pop() || decodedText;
          onScan(token);
        },
        () => {}
      );
    } catch (err: any) {
      if (!mountedRef.current) return;
      setScannerStarted(false);
      onStop();
      const errorMsg = err.message || "";
      let userMessage = "Camera access denied. Use manual search instead.";

      if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission denied")) {
        userMessage = "Camera permission denied. Please enable camera access in your browser settings and try again.";
      } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("No camera")) {
        userMessage = "No camera found. Please use manual search to check in guests.";
      } else if (errorMsg.includes("NotSupportedError")) {
        userMessage = "Your browser doesn't support camera access. Use manual search instead.";
      } else if (errorMsg.includes("HTTPS")) {
        userMessage = "Camera access requires HTTPS. Please ensure you're using a secure connection.";
      }

      setError(userMessage);
      onError(userMessage);
    }
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      {scannerStarted && (
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            SCANNING
          </p>
          <button onClick={stopScanner} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-700 text-sm font-semibold transition min-h-[44px]">
            <X className="w-4 h-4" />
            Stop
          </button>
        </div>
      )}
      <div className={`relative w-full ${scannerStarted ? "min-h-[350px]" : "min-h-[280px]"}`}>
        {scannerStarted ? (
          <div className="relative w-full h-full">
            <div id="qr-reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_img]:w-full [&_img]:h-full" />
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className="absolute left-0 right-0 h-1 bg-gradient-to-b from-pink-500 to-transparent"
                style={{
                  animation: "scannerLine 2s ease-in-out infinite",
                  boxShadow: "0 0 20px rgba(236, 72, 153, 0.8)"
                }}
              />
            </div>
            <style>{`
              @keyframes scannerLine {
                0% { top: 5%; }
                50% { top: 95%; }
                100% { top: 5%; }
              }
            `}</style>
          </div>
        ) : (
          <button
            onClick={startScanner}
            disabled={!Html5QrcodeLib}
            className="w-full h-full flex flex-col items-center justify-center text-white/30 cursor-pointer hover:bg-white/[0.02] transition group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="relative mb-4">
              <Check className="w-20 h-20 text-pink-500/60 group-hover:text-pink-400/80 transition" style={{ animation: "breathe 2.5s ease-in-out infinite" }} />
              <div className="absolute inset-0 rounded-full bg-pink-500/10 blur-xl" style={{ animation: "breathe 2.5s ease-in-out infinite" }} />
            </div>
            <p className="font-semibold text-base text-white/60 group-hover:text-white/80 transition">Start Live Scanner</p>
            <p className="text-xs mt-1.5 text-white/30">Tap anywhere to activate the camera</p>
            <style>{`@keyframes breathe { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.06); opacity: 1; } }`}</style>
          </button>
        )}
      </div>
      {error && (
        <div className="p-4 border-t border-white/10 text-center text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
