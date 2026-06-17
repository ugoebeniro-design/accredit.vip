"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Plus, Bell } from "lucide-react";

type Rule = {
  id?: number;
  trigger: string;
  offset_value: number;
  offset_unit: string;
  channel: string;
  message: string;
  enabled: boolean;
};

const DEFAULT_RULE: Rule = {
  trigger: "before_event",
  offset_value: 1,
  offset_unit: "days",
  channel: "email",
  message: "Reminder: {{event_title}} is coming up on {{event_date}}!",
  enabled: true,
};

type RemindersTabContentProps = {
  eventId: string;
};

export default function RemindersTabContent({ eventId }: RemindersTabContentProps) {
  const [rules, setRules] = useState<Rule[]>([{ ...DEFAULT_RULE }]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    apiClient<any>(`/events/${eventId}/settings`).then((s) => {
      if (s.reminder_rules?.length) setRules(s.reminder_rules);
    }).catch(() => {});
  }, [eventId]);

  const updateRule = (i: number, field: string, value: any) => {
    setRules((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  };

  const addRule = () => setRules((prev) => [...prev, { ...DEFAULT_RULE }]);

  const removeRule = (i: number) => setRules((prev) => prev.filter((_, j) => j !== i));

  const saveRules = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await apiClient(`/events/${eventId}/settings`, { method: "PUT", body: { reminder_rules: rules } });
      setSaveMsg("Reminder rules saved!");
    } catch (err: any) {
      setSaveMsg(err.message || "Error saving rules");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {saveMsg && (
        <div className={`rounded-lg p-3 text-sm font-medium ${saveMsg === "Reminder rules saved!" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMsg}
        </div>
      )}

      <p className="text-sm text-slate-600">
        Guests will receive reminders automatically based on these rules. Use template variables like <code className="bg-slate-100 px-2 py-1 rounded text-xs">{'{{event_title}}'}</code>, <code className="bg-slate-100 px-2 py-1 rounded text-xs">{'{{event_date}}'}</code>, and <code className="bg-slate-100 px-2 py-1 rounded text-xs">{'{{venue}}'}</code>.
      </p>

      <div className="space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Rule {i + 1}</h3>
                {rules.length > 1 && (
                  <button
                    onClick={() => removeRule(i)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm text-slate-700">Send</span>
                <select
                  value={rule.offset_value}
                  onChange={(e) => updateRule(i, "offset_value", Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {[1, 2, 3, 7, 14].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <select
                  value={rule.offset_unit}
                  onChange={(e) => updateRule(i, "offset_unit", e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="hours">hour(s)</option>
                  <option value="days">day(s)</option>
                  <option value="weeks">week(s)</option>
                </select>
                <select
                  value={rule.trigger}
                  onChange={(e) => updateRule(i, "trigger", e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="before_event">before event</option>
                  <option value="after_rsvp">after RSVP</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Delivery Channel</label>
                <select
                  value={rule.channel}
                  onChange={(e) => updateRule(i, "channel", e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Message</label>
                <textarea
                  placeholder='Message (use {{event_title}}, {{event_date}}, {{venue}})'
                  value={rule.message}
                  onChange={(e) => updateRule(i, "message", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRule}
        className="w-full h-10 rounded-lg border-2 border-dashed border-slate-300 text-slate-600 font-medium hover:border-slate-900 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Rule
      </button>

      {rules.length > 0 && (
        <button
          onClick={saveRules}
          disabled={saving}
          className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 h-10 px-6"
        >
          <Bell className="w-4 h-4" />
          {saving ? "Saving..." : "Save Reminder Rules"}
        </button>
      )}
    </div>
  );
}
