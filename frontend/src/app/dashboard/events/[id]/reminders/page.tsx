"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

type Rule = { id?: number; trigger: string; offset_value: number; offset_unit: string; channel: string; message: string; enabled: boolean };

const DEFAULT_RULE: Rule = { trigger: "before_event", offset_value: 1, offset_unit: "days", channel: "email", message: "Reminder: {{event_title}} is coming up on {{event_date}}!", enabled: true };

export default function RemindersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const [rules, setRules] = useState<Rule[]>([{ ...DEFAULT_RULE }]);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);

  const updateRule = (i: number, field: string, value: any) => {
    setRules((prev) => prev.map((r, j) => j === i ? { ...r, [field]: value } : r));
  };

  const addRule = () => setRules((prev) => [...prev, { ...DEFAULT_RULE }]);

  const removeRule = (i: number) => setRules((prev) => prev.filter((_, j) => j !== i));

  const saveRules = async () => {
    try {
      await apiClient(`/events/${eventId}/settings`, { method: "PUT", body: { reminder_rules: rules } });
      alert("Reminder rules saved!");
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="border-b bg-white px-4 py-4">
        <button onClick={() => router.back()} className="text-sm text-pink-600 hover:underline">&larr; Back</button>
        <h1 className="text-2xl font-bold mt-1">Automated Reminders</h1>
        <p className="text-sm text-gray-500">Guests will receive reminders automatically based on these rules</p>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className="rounded-xl border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Rule {i + 1}</span>
              {rules.length > 1 && <button onClick={() => removeRule(i)} className="text-xs text-red-500 hover:underline">Remove</button>}
            </div>
            <div className="flex gap-2 items-center text-sm">
              <span>Send</span>
              <select value={rule.offset_value} onChange={(e) => updateRule(i, "offset_value", Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm w-20">
                {[1, 2, 3, 7, 14].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={rule.offset_unit} onChange={(e) => updateRule(i, "offset_unit", e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                <option value="hours">hour(s)</option>
                <option value="days">day(s)</option>
                <option value="weeks">week(s)</option>
              </select>
              <select value={rule.trigger} onChange={(e) => updateRule(i, "trigger", e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                <option value="before_event">before event</option>
                <option value="after_rsvp">after RSVP</option>
              </select>
            </div>
            <select value={rule.channel} onChange={(e) => updateRule(i, "channel", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
            <textarea placeholder="Message (use {{event_title}}, {{event_date}}, {{venue}})" value={rule.message} onChange={(e) => updateRule(i, "message", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm min-h-[60px]" />
          </div>
        ))}
        <button onClick={addRule} className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 hover:border-pink-500 hover:text-pink-600">+ Add Rule</button>
        {rules.length > 0 && <button onClick={saveRules} className="w-full rounded-xl bg-pink-600 text-white py-3 font-bold text-sm hover:bg-pink-700">Save Reminder Rules</button>}
      </main>
    </div>
  );
}
