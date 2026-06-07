"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [eventData, setEventData] = useState<any>(null);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);
  useEffect(() => {
    if (user) {
      apiClient<any[]>("/event-templates").then(setTemplates).catch(() => {});
      if (eventId) apiClient<any>(`/events/${eventId}`).then(setEventData).catch(() => {});
    }
  }, [user, eventId]);

  const saveAsTemplate = async () => {
    if (!templateName || !eventData) return;
    try {
      const config = { title: eventData.title, event_type: eventData.event_type, venue: eventData.venue, dress_code: eventData.dress_code, description: eventData.description, guest_count_range: eventData.guest_count_range };
      const mode = eventData.ticket_price ? "event" : "invite";
      await apiClient("/event-templates", { method: "POST", body: { name: templateName, mode, config } });
      setTemplateName("");
      const updated = await apiClient<any[]>("/event-templates");
      setTemplates(updated);
    } catch (err: any) { alert(err.message); }
  };

  const loadTemplate = async (template: any) => {
    try {
      const full = await apiClient(`/event-templates/${template.id}`);
      router.push(`/dashboard/create?template=${template.id}`);
    } catch {}
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="border-b bg-white px-4 py-4">
        <button onClick={() => router.back()} className="text-sm text-pink-600 hover:underline">&larr; Back</button>
        <h1 className="text-2xl font-bold mt-1">Event Templates</h1>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="rounded-2xl border bg-white p-5 space-y-3">
          <h2 className="font-bold">Save Current Event as Template</h2>
          <input placeholder="Template name (e.g. Monthly Networking)" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm" />
          <button onClick={saveAsTemplate} disabled={!templateName} className="w-full rounded-xl bg-pink-600 text-white py-3 font-bold text-sm hover:bg-pink-700 disabled:opacity-50">Save Template</button>
        </div>
        <div className="space-y-2">
          <h2 className="font-bold">Your Templates</h2>
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border bg-white p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-gray-500">{t.mode} · {new Date(t.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => loadTemplate(t)} className="text-sm text-pink-600 hover:underline">Use</button>
            </div>
          ))}
          {templates.length === 0 && <p className="text-center text-gray-400 py-8">No templates saved</p>}
        </div>
      </main>
    </div>
  );
}
