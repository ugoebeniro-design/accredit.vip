"use client";
import { useEffect, useRef } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  visible: boolean;
  onClose: () => void;
  duration?: number;
};

export function Toast({ message, type = "success", visible, onClose, duration = 5000 }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onClose, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg border transition-all duration-300 opacity-100 translate-y-0 ${
        type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 flex-shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
