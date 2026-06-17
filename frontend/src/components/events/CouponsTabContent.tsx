"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Ticket, Percent, Coins } from "lucide-react";

type CouponsTabContentProps = {
  eventId: string;
};

export default function CouponsTabContent({ eventId }: CouponsTabContentProps) {
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    apiClient<any[]>(`/coupons/${eventId}`).then(setCoupons).catch(() => {});
  }, [eventId]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Applied Coupons
          <span className="text-sm font-normal text-slate-400 ml-1">({coupons.length})</span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">Coupons created by the admin and applied to this event</p>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-600">No coupons applied yet</p>
          <p className="text-xs text-slate-400 mt-1">Admin-created coupons will appear here</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {coupons.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white">
                  {c.discount_percent ? <Percent className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg tracking-wide">{c.code}</p>
                  <p className="text-sm text-slate-500">
                    {c.discount_percent
                      ? `${c.discount_percent}% off`
                      : c.discount_fixed
                        ? `₦${c.discount_fixed.toLocaleString()} off`
                        : "No discount"}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-900">{c.used_count}/{c.max_uses || "∞"}</p>
                <p className="text-xs text-slate-400">used</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
