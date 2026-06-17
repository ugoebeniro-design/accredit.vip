"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Bell, CheckCircle, UserPlus } from "lucide-react";

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-100 p-4">
          <p className="text-xs text-slate-600 font-medium">Total Waiting</p>
          <p className="text-2xl font-bold text-slate-900">{entries.length}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-4">
          <p className="text-xs text-emerald-600 font-medium">Notified</p>
          <p className="text-2xl font-bold text-emerald-900">{notifiedCount}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 border-dashed p-12 text-center bg-slate-50">
          <Bell className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600">No waitlist entries yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{e.name}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {e.email}{e.phone && ` • ${e.phone}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Qty: {e.quantity}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => promoteToGuest(e)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      Promote
                    </button>
                    {e.notified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700">
                        <CheckCircle className="w-3 h-3" />
                        Notified
                      </span>
                    ) : (
                      <button
                        onClick={() => markNotified(e.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Mark Notified
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
