"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { ChevronLeft, Search, CheckCircle2, XCircle, AlertCircle, Clock, Eye, Trash2, Menu, X, BarChart3, Calendar, Users, Settings, LogOut } from "lucide-react";

export default function AdminEventsPage() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");

  const events = [
    { id: 1, title: "Tech Conference 2026", organizer: "John Doe", date: "2026-07-15", guests: "500+", status: "pending", keywords: [] },
    { id: 2, title: "Summer Music Festival", organizer: "Jane Smith", date: "2026-08-20", guests: "2000+", status: "pending", keywords: ["celebration"] },
    { id: 3, title: "Corporate Team Building", organizer: "Acme Corp", date: "2026-06-30", guests: "150", status: "flagged", keywords: ["alcohol"] },
    { id: 4, title: "Community Charity Run", organizer: "Local Charity", date: "2026-07-05", guests: "300", status: "approved", keywords: [] },
  ];

  const filteredEvents = events.filter((e) =>
    filterStatus === "all"
      ? e.title.toLowerCase().includes(searchQuery.toLowerCase())
      : e.status === filterStatus && e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-[#e8edf2] transition-all duration-300 z-40 ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="h-20 flex items-center justify-between px-4 border-b border-[#e8edf2]">
          {sidebarOpen && <Link href="/admin" className="font-bold text-[#0D1B2A] text-sm">Admin Panel</Link>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#f0f1f7] rounded-lg transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {[
            { label: "Dashboard", href: "/admin", Icon: BarChart3 },
            { label: "Events", href: "/admin/events", Icon: Calendar },
            { label: "Users", href: "/admin/users", Icon: Users },
            { label: "Settings", href: "/admin/settings", Icon: Settings },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748b] hover:bg-[#f0f1f7] hover:text-[#E91E8C] transition-all">
              <item.Icon className="w-5 h-5" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-400 font-bold text-sm transition-all hover:shadow-lg active:scale-95">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <header className="h-20 border-b border-[#e8edf2] bg-white sticky top-0 z-30">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-[#64748b] hover:text-[#0D1B2A]"><ChevronLeft className="w-5 h-5" /></Link>
              <h1 className="text-2xl font-black text-[#0D1B2A]">Event Moderation</h1>
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="bg-white rounded-2xl border border-[#e8edf2] p-6 mb-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                <input type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#e8edf2] focus:outline-none focus:border-[#E91E8C] text-[#0D1B2A]" />
              </div>
              <div className="flex gap-2">
                {["All", "Pending", "Approved", "Flagged"].map((label) => (
                  <button key={label} onClick={() => setFilterStatus(label.toLowerCase())} className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${filterStatus === label.toLowerCase() ? "bg-[#E91E8C] text-white" : "bg-[#f0f1f7] text-[#64748b] hover:bg-[#e8edf2]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl border border-[#e8edf2] hover:border-[#E91E8C] p-6 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-black text-[#0D1B2A]">{event.title}</h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${event.status === "pending" ? "bg-amber-50 text-amber-600" : event.status === "approved" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                      {event.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm text-[#64748b]">
                    <div><p className="text-xs text-[#94a3b8]">Organizer</p><p className="text-[#0D1B2A] font-medium">{event.organizer}</p></div>
                    <div><p className="text-xs text-[#94a3b8]">Date</p><p className="text-[#0D1B2A] font-medium">{event.date}</p></div>
                    <div><p className="text-xs text-[#94a3b8]">Guests</p><p className="text-[#0D1B2A] font-medium">{event.guests}</p></div>
                    <div><p className="text-xs text-[#94a3b8]">Keywords</p><p className="text-[#0D1B2A] font-medium">{event.keywords.length ? event.keywords.join(", ") : "None"}</p></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-3 hover:bg-[#f0f1f7] rounded-xl"><Eye className="w-5 h-5 text-[#94a3b8]" /></button>
                  {event.status === "pending" && (
                    <>
                      <button className="p-3 hover:bg-green-50 rounded-xl"><CheckCircle2 className="w-5 h-5 text-[#94a3b8]" /></button>
                      <button className="p-3 hover:bg-red-50 rounded-xl"><XCircle className="w-5 h-5 text-[#94a3b8]" /></button>
                    </>
                  )}
                  <button className="p-3 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5 text-[#94a3b8]" /></button>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#e8edf2] p-12 text-center">
              <p className="text-[#94a3b8]">No events found</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
