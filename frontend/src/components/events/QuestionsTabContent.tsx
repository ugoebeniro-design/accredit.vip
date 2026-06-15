"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Plus, Trash2, HelpCircle } from "lucide-react";

type QuestionsTabContentProps = {
  eventId: string;
};

export default function QuestionsTabContent({ eventId }: QuestionsTabContentProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    apiClient<any[]>(`/rsvp-questions/${eventId}`).then(setQuestions).catch(() => {});
  }, [eventId]);

  const addQuestion = () =>
    setQuestions((prev) => [...prev, { label: "", type: "text", required: false, options: null }]);

  const update = (i: number, field: string, value: any) => {
    setQuestions((prev) => prev.map((q, j) => (j === i ? { ...q, [field]: value } : q)));
  };

  const remove = (i: number) => setQuestions((prev) => prev.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await apiClient(`/rsvp-questions/${eventId}`, { method: "POST", body: questions });
      setSaveMsg("Questions saved!");
    } catch (err: any) {
      setSaveMsg(err.message || "Error saving questions");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
        <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          Add custom questions that guests will answer during RSVP.
        </p>
      </div>

      {saveMsg && (
        <div className={`rounded-lg p-3 text-sm font-medium ${saveMsg === "Questions saved!" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMsg}
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="space-y-3">
              <input
                placeholder="Question text"
                value={q.label}
                onChange={(e) => update(i, "label", e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <div className="flex gap-2">
                <select
                  value={q.type}
                  onChange={(e) => update(i, "type", e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="text">Text</option>
                  <option value="select">Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                </select>
                <label className="flex items-center gap-2 text-sm h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => update(i, "required", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Required</span>
                </label>
                <button
                  onClick={() => remove(i)}
                  className="ml-auto h-10 px-3 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
              {q.type === "select" && (
                <input
                  placeholder="Options (comma separated)"
                  onChange={(e) =>
                    update(i, "options", e.target.value.split(",").map((s: string) => s.trim()))
                  }
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full h-10 rounded-lg border-2 border-dashed border-slate-300 text-slate-600 font-medium hover:border-slate-900 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Question
      </button>

      {questions.length > 0 && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Questions"}
        </button>
      )}
    </div>
  );
}
