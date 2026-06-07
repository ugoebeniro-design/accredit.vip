"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

export default function QuestionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);
  useEffect(() => { if (user && eventId) apiClient<any[]>(`/rsvp-questions/${eventId}`).then(setQuestions).catch(() => {}); }, [user, eventId]);

  const addQuestion = () => setQuestions((prev) => [...prev, { label: "", type: "text", required: false, options: null }]);

  const update = (i: number, field: string, value: any) => {
    setQuestions((prev) => prev.map((q, j) => j === i ? { ...q, [field]: value } : q));
  };

  const remove = (i: number) => setQuestions((prev) => prev.filter((_, j) => j !== i));

  const save = async () => {
    try {
      await apiClient(`/rsvp-questions/${eventId}`, { method: "POST", body: questions });
      alert("Questions saved!");
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="border-b bg-white px-4 py-4">
        <button onClick={() => router.back()} className="text-sm text-pink-600 hover:underline">&larr; Back</button>
        <h1 className="text-2xl font-bold mt-1">RSVP Questions</h1>
        <p className="text-sm text-gray-500">Ask guests extra questions during RSVP</p>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border bg-white p-4 space-y-2">
            <input placeholder="Question text" value={q.label} onChange={(e) => update(i, "label", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <select value={q.type} onChange={(e) => update(i, "type", e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                <option value="text">Text</option>
                <option value="select">Dropdown</option>
                <option value="checkbox">Checkbox</option>
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={q.required} onChange={(e) => update(i, "required", e.target.checked)} /> Required</label>
              <button onClick={() => remove(i)} className="ml-auto text-red-500 text-sm hover:underline">Remove</button>
            </div>
            {q.type === "select" && <input placeholder="Options (comma separated)" onChange={(e) => update(i, "options", e.target.value.split(",").map((s: string) => s.trim()))} className="w-full rounded-lg border px-3 py-2 text-sm" />}
          </div>
        ))}
        <button onClick={addQuestion} className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 hover:border-pink-500 hover:text-pink-600">+ Add Question</button>
        {questions.length > 0 && <button onClick={save} className="w-full rounded-xl bg-pink-600 text-white py-3 font-bold text-sm hover:bg-pink-700">Save Questions</button>}
      </main>
    </div>
  );
}
