"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Bell, CheckCircle, UserPlus, Users, Volume2 } from "lucide-react";

type WaitlistTabContentProps = {
  eventId: string;
};

export default function WaitlistTabContent({ eventId }: WaitlistTabContentProps) {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    apiClient<any[]>(`/waitlist/${eventId}`).then(setEntries).catch(() => {});
  }, [eventId]);

  const markNotified = async (entryId: number) => {
    try {
      await apiClient(`/waitlist/${entryId}/notify`, { method: "POST" });
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, notified: true } : e)));
    } catch {}
  };

  const promoteToGuest = async (entry: any) => {
    try {
      await apiClient(`/waitlist/${entry.id}/promote`, { method: "POST" });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch {}
  };

  const notifiedCount = entries.filter((e) => e.notified).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-secondary flex items-center gap-2">
          <Users className="w-5 h-5" />
          Waitlist
        </h2>
        <p className="text-sm text-slate-500 mt-1">Guests who signed up after tickets sold out</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Waiting</p>
          <p className="text-3xl font-bold text-secondary mt-1">{entries.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notified</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{notifiedCount}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-600">No waitlist entries yet</p>
          <p className="text-xs text-slate-400 mt-1">When guests sign up after tickets sell out, they&apos;ll appear here</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-secondary">{e.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{e.email}{e.phone && ` • ${e.phone}`}</p>
                <p className="text-xs text-slate-400 mt-0.5">Qty: {e.quantity}</p>
              </div>
              <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                {e.notified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Notified
                  </span>
                ) : (
                  <button onClick={() => markNotified(e.id)} className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    Mark Notified
                  </button>
                )}
                <button onClick={() => promoteToGuest(e)} className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  Promote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
