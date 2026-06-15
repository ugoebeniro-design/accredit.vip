"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Plus, Copy } from "lucide-react";

type TemplatesTabContentProps = {
  eventId: string;
};

export default function TemplatesTabContent({ eventId }: TemplatesTabContentProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [eventData, setEventData] = useState<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient<any[]>("/event-templates").then(setTemplates).catch(() => {});
    apiClient<any>(`/events/${eventId}`).then(setEventData).catch(() => {});
  }, [eventId]);

  const saveAsTemplate = async () => {
    if (!templateName || !eventData) return;
    setSaving(true);
    try {
      const config = {
        title: eventData.title,
        event_type: eventData.event_type,
        venue: eventData.venue,
        dress_code: eventData.dress_code,
        description: eventData.description,
        guest_count_range: eventData.guest_count_range,
      };
      const mode = eventData.ticket_price ? "event" : "invite";
      await apiClient("/event-templates", { method: "POST", body: { name: templateName, mode, config } });
      setTemplateName("");
      const updated = await apiClient<any[]>("/event-templates");
      setTemplates(updated);
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const loadTemplate = async (template: any) => {
    try {
      await apiClient(`/event-templates/${template.id}`);
      router.push(`/dashboard/create?template=${template.id}`);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Save Current Event as Template
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Template Name</label>
            <input
              placeholder="e.g. Monthly Networking, Annual Conference"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <button
            onClick={saveAsTemplate}
            disabled={!templateName || saving}
            className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Copy className="w-5 h-5" />
          Your Templates ({templates.length})
        </h2>
        {templates.length === 0 ? (
          <div className="rounded-xl border border-slate-200 border-dashed p-12 text-center bg-slate-50">
            <p className="text-sm text-slate-600">No templates saved yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {t.mode} · {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => loadTemplate(t)}
                    className="ml-4 px-3 py-2 text-sm font-medium text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
