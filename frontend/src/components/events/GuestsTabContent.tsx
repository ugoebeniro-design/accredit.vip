"use client";

import { useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Users } from "lucide-react";

type Guest = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  rsvp_status: string;
  rsvp_note?: string | null;
  invite_sent: boolean;
  invite_attempts?: number;
  invite_viewed_at?: string | null;
};

type GuestsTabContentProps = {
  guestLimit: number | null;
  totalGuests: number;
  remainingGuests: number | null;
  guestName: string;
  setGuestName: (v: string) => void;
  guestPhone: string;
  setGuestPhone: (v: string) => void;
  guestEmail: string;
  setGuestEmail: (v: string) => void;
  addGuest: (e: FormEvent) => Promise<void>;
  csvFile: File | null;
  setCsvFile: (f: File | null) => void;
  csvUploading: boolean;
  csvResult: string | null;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  uploadCsv: () => Promise<void>;
  guests: Guest[];
  guestSearch: string;
  setGuestSearch: (v: string) => void;
  guestRsvpFilter: string;
  setGuestRsvpFilter: (v: string) => void;
  handleGuestSearch: (e: FormEvent) => void;
  resetGuestFilter: () => void;
  editingGuest: number | null;
  setEditingGuest: (v: number | null) => void;
  editName: string;
  setEditName: (v: string) => void;
  editPhone: string;
  setEditPhone: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  saveEdit: (guestId: number) => Promise<void>;
  deleteConfirm: number | null;
  setDeleteConfirm: (v: number | null) => void;
  handleDeleteGuest: (guestId: number) => Promise<void>;
  startEdit: (guest: Guest) => void;
  sendGuestInvite: (guestId: number) => Promise<void>;
  generateQR: (guestId: number) => Promise<void>;
  generatingQR: number | null;
  currentPage: number;
  pageCount: number;
  goToPage: (page: number) => void;
};

export default function GuestsTabContent({
  guestLimit,
  totalGuests,
  remainingGuests,
  guestName,
  setGuestName,
  guestPhone,
  setGuestPhone,
  guestEmail,
  setGuestEmail,
  addGuest,
  csvFile,
  setCsvFile,
  csvUploading,
  csvResult,
  fileInputRef,
  uploadCsv,
  guests,
  guestSearch,
  setGuestSearch,
  guestRsvpFilter,
  setGuestRsvpFilter,
  handleGuestSearch,
  resetGuestFilter,
  editingGuest,
  setEditingGuest,
  editName,
  setEditName,
  editPhone,
  setEditPhone,
  editEmail,
  setEditEmail,
  saveEdit,
  deleteConfirm,
  setDeleteConfirm,
  handleDeleteGuest,
  startEdit,
  sendGuestInvite,
  generateQR,
  generatingQR,
  currentPage,
  pageCount,
  goToPage,
}: GuestsTabContentProps) {
  const localFileRef = useRef<HTMLInputElement | null>(null);
  const resolvedFileRef = fileInputRef ?? localFileRef;
  return (
    <div className="space-y-6">
      {/* Add Guest Form */}
      <div className="rounded-xl border p-6 bg-gradient-to-br from-blue-50 to-transparent">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Add Individual Guest</h3>
        <div>
          {guestLimit !== null && (
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Threshold: {totalGuests} / {guestLimit} {remainingGuests !== null ? `(${remainingGuests} remaining)` : ""}
            </p>
          )}
          <form onSubmit={addGuest} className="space-y-3">
            <input placeholder="Full Name *" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <input placeholder="Phone (optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <input placeholder="Email (optional)" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <Button type="submit" disabled={guestLimit !== null && totalGuests >= guestLimit} className="w-full bg-[#E91E8C] hover:bg-[#C4166F]">Add Guest</Button>
          </form>
        </div>
      </div>

      {/* CSV Import */}
      <div className="rounded-xl border p-6 bg-gradient-to-br from-purple-50 to-transparent">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Upload className="w-5 h-5" /> Bulk Import (CSV)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a CSV file with columns: <code className="bg-gray-100 px-2 py-1 rounded text-xs">name, phone, email</code>
        </p>
        <div className="flex gap-2">
          <input ref={resolvedFileRef} type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[#E91E8C] file:px-3 file:py-1 file:text-xs file:text-white cursor-pointer" />
          <Button onClick={uploadCsv} disabled={!csvFile || csvUploading || (guestLimit !== null && totalGuests >= guestLimit)}>
            {csvUploading ? "..." : "Upload"}
          </Button>
        </div>
        {csvResult && <p className="text-xs mt-2 text-green-600 font-medium">{csvResult}</p>}
      </div>

      {/* Guests List */}
      <div className="rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Guest List ({totalGuests})</h3>
        {guests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No guests added yet. Start by adding a guest above or importing a CSV.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <form onSubmit={handleGuestSearch} className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search guests..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <select
                  value={guestRsvpFilter}
                  onChange={(e) => setGuestRsvpFilter(e.target.value)}
                  className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="pending">Pending</option>
                </select>
              </form>
              {(guestSearch || guestRsvpFilter) && (
                <Button variant="ghost" size="sm" onClick={resetGuestFilter} className="text-xs">Clear</Button>
              )}
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {guests.map((guest) => (
                <div key={guest.id} className="rounded-lg border p-4 hover:bg-gray-50 transition">
                  {editingGuest === guest.id ? (
                    <div className="space-y-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Phone" />
                        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Email" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(guest.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingGuest(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : deleteConfirm === guest.id ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Delete {guest.name}?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteGuest(guest.id)}>Delete</Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{guest.name}</p>
                        <p className="text-xs text-muted-foreground">{guest.email || guest.phone || "No contact"}</p>
                        <div className="flex gap-2 flex-wrap mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            guest.rsvp_status === 'accepted' ? 'bg-green-100 text-green-700' :
                            guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {guest.rsvp_status}
                          </span>
                          {guest.invite_sent && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Invited</span>}
                          {guest.invite_attempts ? <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{guest.invite_attempts}/3</span> : null}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => sendGuestInvite(guest.id)} title="Send invite">✉️</Button>
                        <Button size="sm" variant="ghost" onClick={() => generateQR(guest.id)} disabled={generatingQR === guest.id} title="Generate QR">QR</Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(guest)} title="Edit">✏️</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleteConfirm(guest.id)} title="Delete">🗑</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {pageCount > 1 && (
              <div className="flex items-center justify-center gap-1 mt-4">
                <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(0)}>«</button>
                <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>‹</button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button key={i} onClick={() => goToPage(i)} className={`px-3 py-1.5 text-xs rounded border hover:bg-accent ${i === currentPage ? "bg-[#E91E8C] text-white border-[#E91E8C] font-bold" : ""}`}>
                    {i + 1}
                  </button>
                ))}
                <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(currentPage + 1)}>›</button>
                <button className="px-2 py-1.5 text-xs rounded border hover:bg-accent disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(pageCount - 1)}>&raquo;</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
