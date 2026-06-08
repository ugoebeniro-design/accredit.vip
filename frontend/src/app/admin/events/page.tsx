"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Check, X, Trash2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

interface Event {
  id: number;
  title: string;
  host_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  ticket_price?: number;
  status: "pending" | "flagged" | "approved";
  created_at: string;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "flagged">("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.is_admin) {
      router.push("/dashboard");
      return;
    }

    fetchEvents();
  }, [user, router, filter, currentPage]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const endpoint =
        filter === "pending"
          ? "/api/v1/admin/events/pending"
          : "/api/v1/admin/events/flagged";

      const response = await fetch(
        `${endpoint}?page=${currentPage}&limit=10`
      );
      if (!response.ok) throw new Error("Failed to fetch events");

      const data = await response.json();
      setEvents(data.events || []);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (eventId: number) => {
    try {
      setActionLoading(eventId);
      const response = await fetch(`/api/v1/admin/events/${eventId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to approve event");

      setEvents(events.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error("Error approving event:", error);
      alert("Failed to approve event");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (eventId: number) => {
    try {
      setActionLoading(eventId);
      const response = await fetch(`/api/v1/admin/events/${eventId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to reject event");

      setEvents(events.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error("Error rejecting event:", error);
      alert("Failed to reject event");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (eventId: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      setActionLoading(eventId);
      const response = await fetch(`/api/v1/admin/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete event");

      setEvents(events.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="border-b border-[#e8edf2] bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-2 px-4 py-2 text-[#E91E8C] border border-[#E91E8C] rounded-lg hover:bg-[#E91E8C]/10 transition-colors font-semibold text-sm"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Admin
          </button>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Event Moderation</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Filter Tabs */}
        <div className="mb-8 flex gap-2 border-b border-[#e8edf2]">
          <button
            onClick={() => {
              setFilter("pending");
              setCurrentPage(1);
            }}
            className={`pb-3 px-4 text-sm font-bold transition-all ${
              filter === "pending"
                ? "border-b-2 border-[#E91E8C] text-[#E91E8C]"
                : "text-[#64748b] hover:text-[#0D1B2A]"
            }`}
          >
            Pending ({events.filter((e) => e.status === "pending").length})
          </button>
          <button
            onClick={() => {
              setFilter("flagged");
              setCurrentPage(1);
            }}
            className={`pb-3 px-4 text-sm font-bold transition-all ${
              filter === "flagged"
                ? "border-b-2 border-[#E91E8C] text-[#E91E8C]"
                : "text-[#64748b] hover:text-[#0D1B2A]"
            }`}
          >
            Flagged
          </button>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-[#E91E8C] border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-[#64748b]">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-[#94a3b8] mx-auto mb-4" />
            <p className="text-[#64748b] font-medium">No {filter} events</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-[#e8edf2] shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[#0D1B2A] mb-1">
                      {event.title}
                    </h3>
                    <p className="text-sm text-[#64748b] mb-3">
                      Hosted by <span className="font-semibold">{event.host_name}</span>
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-[#94a3b8]">Date</span>
                        <p className="font-semibold text-[#0D1B2A]">
                          {new Date(event.event_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#94a3b8]">Time</span>
                        <p className="font-semibold text-[#0D1B2A]">{event.event_time}</p>
                      </div>
                      <div>
                        <span className="text-[#94a3b8]">Venue</span>
                        <p className="font-semibold text-[#0D1B2A]">{event.venue}</p>
                      </div>
                      {event.ticket_price !== null && (
                        <div>
                          <span className="text-[#94a3b8]">Ticket Price</span>
                          <p className="font-semibold text-[#0D1B2A]">
                            {event.ticket_price === 0 || event.ticket_price === undefined
                              ? "Free"
                              : `₦${event.ticket_price.toLocaleString()}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {filter === "flagged" && (
                    <div className="ml-4 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                      ⚠️ Flagged
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-[#e8edf2]">
                  {filter === "pending" ? (
                    <>
                      <button
                        onClick={() => handleApprove(event.id)}
                        disabled={actionLoading === event.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {actionLoading === event.id ? "Approving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(event.id)}
                        disabled={actionLoading === event.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        {actionLoading === event.id ? "Rejecting..." : "Reject"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleApprove(event.id)}
                      disabled={actionLoading === event.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {actionLoading === event.id ? "Approving..." : "Approve"}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={actionLoading === event.id}
                    className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-[#e8edf2] hover:bg-[#f8f9fc] disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg font-bold text-sm transition-all ${
                    page === currentPage
                      ? "bg-[#E91E8C] text-white"
                      : "border border-[#e8edf2] hover:bg-[#f8f9fc]"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-[#e8edf2] hover:bg-[#f8f9fc] disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
