"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

interface EventEditData {
  id: number;
  title: string;
  host_name: string;
  venue: string;
  event_date: string;
  event_time: string;
  description: string;
  male_dress_code?: string;
  female_dress_code?: string;
  after_party_enabled?: boolean;
  after_party_location?: string;
  after_party_time?: string;
}

export default function EditEventPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.eventId;

  const [formData, setFormData] = useState<EventEditData>({
    id: 0,
    title: "",
    host_name: "",
    venue: "",
    event_date: "",
    event_time: "",
    description: "",
    male_dress_code: "",
    female_dress_code: "",
    after_party_enabled: false,
    after_party_location: "",
    after_party_time: "",
  });

  const [loading_, setLoading_] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const event = await apiClient<EventEditData>(`/events/${eventId}`);
        setFormData(event);
        setLoading_(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
        setLoading_(false);
      }
    };

    if (user && eventId) {
      loadEvent();
    }
  }, [user, eventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiClient(`/events/${eventId}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      setSuccess("Event details updated successfully!");
      setTimeout(() => {
        router.push(`/dashboard/invites/${eventId}/manage`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (loading_) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fc]">
      <header className="border-b border-[#e8edf2] bg-white">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/dashboard/invites/${eventId}/manage`} className="text-sm font-semibold text-[#E91E8C] hover:underline">
            ← Back to Management
          </Link>
          <h1 className="mt-2 text-2xl font-black text-[#0D1B2A]">Edit Event Details</h1>
          <p className="text-sm text-[#64748b]">Update any information about your event</p>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-2xl rounded-2xl border border-[#e8edf2] bg-white p-6">
          {error && (
            <div className="mb-6 rounded-xl bg-[#fef2f2] border border-[#fecdd3] p-4">
              <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl bg-[#f0fdf4] border border-[#dbeafe] p-4">
              <p className="text-sm font-semibold text-[#166534]">{success}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-[#23466f] mb-2">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
                placeholder="e.g., Sarah & James Wedding Reception"
              />
            </div>

            {/* Host Name */}
            <div>
              <label className="block text-sm font-semibold text-[#23466f] mb-2">
                Host Name *
              </label>
              <input
                type="text"
                name="host_name"
                value={formData.host_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
                placeholder="e.g., John Doe"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-semibold text-[#23466f] mb-2">
                Venue *
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
                placeholder="e.g., Eko Hotels & Suites, Victoria Island, Lagos"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-[#23466f] mb-2">
                Event Date *
              </label>
              <input
                type="date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-semibold text-[#23466f] mb-2">
                Event Time *
              </label>
              <input
                type="time"
                name="event_time"
                value={formData.event_time}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-[#23466f] mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C] resize-none"
                rows={4}
                placeholder="Add any additional details about your event..."
              />
            </div>

            {/* Dress Code */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#23466f]">Dress Code</h3>
              <div>
                <label className="block text-sm text-[#64748b] mb-2">For Males</label>
                <input
                  type="text"
                  name="male_dress_code"
                  value={formData.male_dress_code || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
                  placeholder="e.g., Black tie, Aso ebi"
                />
              </div>
              <div>
                <label className="block text-sm text-[#64748b] mb-2">For Females</label>
                <input
                  type="text"
                  name="female_dress_code"
                  value={formData.female_dress_code || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
                  placeholder="e.g., Evening gown, Aso ebi"
                />
              </div>
            </div>

            {/* After Party */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="after_party_enabled"
                  checked={formData.after_party_enabled || false}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-[#d9e2ec] accent-[#E91E8C]"
                />
                <span className="font-semibold text-[#23466f]">Enable After Party</span>
              </label>

              {formData.after_party_enabled && (
                <div className="space-y-3 pl-7 border-l-2 border-[#E91E8C]">
                  <div>
                    <label className="block text-sm text-[#64748b] mb-2">After Party Location</label>
                    <input
                      type="text"
                      name="after_party_location"
                      value={formData.after_party_location || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
                      placeholder="Where the after party will be"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#64748b] mb-2">After Party Time</label>
                    <input
                      type="time"
                      name="after_party_time"
                      value={formData.after_party_time || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-[#d9e2ec] outline-none focus:border-[#E91E8C]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl bg-[#E91E8C] text-white font-bold hover:bg-[#C4166F] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/dashboard/invites/${eventId}/manage`}
              className="flex-1 px-6 py-3 rounded-xl border border-[#d9e2ec] text-[#0D1B2A] font-bold hover:bg-[#f8f9fc] transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
