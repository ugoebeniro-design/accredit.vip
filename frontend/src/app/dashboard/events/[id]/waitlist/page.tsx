"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

export default function WaitlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);
  useEffect(() => { if (user && eventId) apiClient<any[]>(`/waitlist/${eventId}`).then(setEntries).catch(() => {}); }, [user, eventId]);

  const markNotified = async (entryId: number) => {
    try {
      await apiClient(`/waitlist/${entryId}/notify`, { method: "POST" });
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, notified: true } : e));
    } catch {}
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="border-b bg-white px-4 py-4">
        <button onClick={() => router.back()} className="text-sm text-pink-600 hover:underline">&larr; Back</button>
        <h1 className="text-2xl font-bold mt-1">Waitlist</h1>
        <p className="text-sm text-gray-500">{entries.length} people waiting</p>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="rounded-xl border bg-white p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{e.name}</p>
              <p className="text-xs text-gray-500">{e.email} {e.phone && `· ${e.phone}`}</p>
              <p className="text-xs text-gray-400">Qty: {e.quantity}</p>
            </div>
            <div className="text-right">
              {e.notified ? <span className="text-xs text-green-600">Notified</span> : <button onClick={() => markNotified(e.id)} className="text-xs text-pink-600 hover:underline">Mark notified</button>}
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-center text-gray-400 py-8">No waitlist entries</p>}
      </main>
    </div>
  );
}
