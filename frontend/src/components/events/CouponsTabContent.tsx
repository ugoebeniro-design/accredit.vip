"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Ticket } from "lucide-react";

type CouponsTabContentProps = {
  eventId: string;
};

export default function CouponsTabContent({ eventId }: CouponsTabContentProps) {
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    apiClient<any[]>(`/coupons/${eventId}`).then(setCoupons).catch(() => {});
  }, [eventId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Applied Coupons ({coupons.length})
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Coupons are created by the admin for promotional use. If a coupon has been applied to your event, it will appear here.
        </p>
        {coupons.length === 0 ? (
          <div className="rounded-xl border border-slate-200 border-dashed p-12 text-center bg-slate-50">
            <p className="text-sm text-slate-600">No coupons applied to this event</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{c.code}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {c.discount_percent
                        ? `${c.discount_percent}% off`
                        : c.discount_fixed
                          ? `₦${c.discount_fixed.toLocaleString()} off`
                          : "No discount"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-600 ml-4 flex-shrink-0">
                    <p className="font-medium">{c.used_count}/{c.max_uses || "∞"} used</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
