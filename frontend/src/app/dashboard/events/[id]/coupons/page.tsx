"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

export default function CouponsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountFixed, setDiscountFixed] = useState("");
  const [maxUses, setMaxUses] = useState("");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);
  useEffect(() => { if (user && eventId) apiClient<any[]>(`/coupons/${eventId}`).then(setCoupons).catch(() => {}); }, [user, eventId]);

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient("/coupons", { method: "POST", body: { event_id: Number(eventId), code, discount_percent: discountPercent ? Number(discountPercent) : null, discount_fixed: discountFixed ? Number(discountFixed) : null, max_uses: Number(maxUses) || 0 } });
      setCode(""); setDiscountPercent(""); setDiscountFixed("");
      const updated = await apiClient<any[]>(`/coupons/${eventId}`);
      setCoupons(updated);
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="border-b bg-white px-4 py-4">
        <button onClick={() => router.back()} className="text-sm text-pink-600 hover:underline">&larr; Back</button>
        <h1 className="text-2xl font-bold mt-1">Coupon Codes</h1>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-6">
        <form onSubmit={createCoupon} className="rounded-2xl border bg-white p-5 space-y-3">
          <h2 className="font-bold">Create Coupon</h2>
          <input placeholder="Code (leave empty for random)" value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Discount % (e.g. 10)" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} type="number" className="rounded-xl border px-4 py-3 text-sm" />
            <input placeholder="Fixed discount (₦)" value={discountFixed} onChange={(e) => setDiscountFixed(e.target.value)} type="number" className="rounded-xl border px-4 py-3 text-sm" />
          </div>
          <input placeholder="Max uses (0 = unlimited)" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" className="w-full rounded-xl border px-4 py-3 text-sm" />
          <button type="submit" className="w-full rounded-xl bg-pink-600 text-white py-3 font-bold text-sm hover:bg-pink-700">Create Coupon</button>
        </form>
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="rounded-xl border bg-white p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{c.code}</p>
                <p className="text-xs text-gray-500">{c.discount_percent ? `${c.discount_percent}% off` : c.discount_fixed ? `₦${c.discount_fixed.toLocaleString()} off` : "No discount"}</p>
              </div>
              <div className="text-right text-xs">
                <p>{c.used_count}/{c.max_uses || "∞"} used</p>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-center text-gray-400 py-8">No coupons yet</p>}
        </div>
      </main>
    </div>
  );
}
