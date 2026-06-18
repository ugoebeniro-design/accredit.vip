"use client";

import { useRef, useState, useEffect, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiClient, API_BASE } from "@/lib/api-client";
import Link from "next/link";
import { Plus, Upload, Users, Mail, Trash2, Edit2, Loader, Search, Check, Download, QrCode, Tag, Send, Eye, X, Circle, Minus, Printer, ChevronDown, MoreHorizontal } from "lucide-react";

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
  tags?: string[];
  notes?: string | null;
  qr_token?: string | null;
  custom_data?: Record<string, any>;
  created_at?: string | null;
  communication_status?: Record<string, { status: string; sent_count: number; last_sent?: string }>;
};

type CustomField = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

type GuestsTabContentProps = {
  eventId: number;
  guestLimit: number | null;
  totalGuests: number;
  remainingGuests: number | null;
  guestName: string;
  setGuestName: (v: string) => void;
  guestPhone: string;
  setGuestPhone: (v: string) => void;
  guestEmail: string;
  setGuestEmail: (v: string) => void;
  addGuest: (e: FormEvent, customData?: Record<string, any>) => Promise<void>;
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
  triggerSearch: (search?: string, rsvpStatus?: string, page?: number) => void;
  resetGuestFilter: () => void;
  editingGuest: number | null;
  setEditingGuest: (v: number | null) => void;
  editName: string;
  setEditName: (v: string) => void;
  editPhone: string;
  setEditPhone: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
  saveEdit: (guestId: number, customData?: Record<string, any>) => Promise<void>;
  savingGuest: number | null;
  deleteConfirm: number | null;
  setDeleteConfirm: (v: number | null) => void;
  handleDeleteGuest: (guestId: number) => Promise<void>;
  startEdit: (guest: Guest) => void;
  sendGuestInvite: (guestId: number, channels?: string[]) => Promise<void>;
  generateQR: (guestId: number) => Promise<void>;
  generatingQR: number | null;
  currentPage: number;
  pageCount: number;
  goToPage: (page: number) => void;
  channels: string[];
  setChannels: (v: string[]) => void;
  sending: boolean;
  canSendInvites: boolean;
  sendInvites: (force?: boolean) => Promise<void>;
  sendAllQrs: () => Promise<void>;
  testSend: () => Promise<void>;
  sendResult: { channels?: Record<string, any>; total_sent?: number; total_guests?: number } | null;
  sendError: string | null;
  logs: any[];
  invalidPhoneGuests: Guest[];
  guestsWithMissingContact: Guest[];
  guestCountRange?: string | null;
  exporting?: boolean;
  exportStatus?: string;
  setExportStatus?: (v: string) => void;
  exportGuests?: () => Promise<void>;
  exportingMsg?: boolean;
  exportMsgStatus?: string;
  setExportMsgStatus?: (v: string) => void;
  exportMsgChannel?: string;
  setExportMsgChannel?: (v: string) => void;
  exportMessages?: () => Promise<void>;
};

function isValidPhone(value?: string | null) {
  if (!value) return false;
  const compact = value.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(compact);
}

export default function GuestsTabContent({
  eventId,
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
  triggerSearch,
  resetGuestFilter,
  editingGuest,
  setEditingGuest,
  editName,
  setEditName,
  editPhone,
  setEditPhone,
  editEmail,
  setEditEmail,
  editNotes,
  setEditNotes,
  saveEdit,
  savingGuest,
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
  exporting,
  exportStatus = "all",
  setExportStatus,
  exportGuests,
  channels,
  setChannels,
  sending,
  canSendInvites,
  sendInvites,
  sendAllQrs,
  testSend,
  sendResult,
  sendError,
  logs,
  invalidPhoneGuests,
  guestsWithMissingContact,
  guestCountRange,
  exportingMsg,
  exportMsgStatus = "all",
  setExportMsgStatus,
  exportMsgChannel = "all",
  setExportMsgChannel,
  exportMessages,
}: GuestsTabContentProps) {
  const localFileRef = useRef<HTMLInputElement | null>(null);
  const resolvedFileRef = fileInputRef ?? localFileRef;
  const [selectedGuests, setSelectedGuests] = useState<Set<number>>(new Set());
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [bulkChannels, setBulkChannels] = useState<string[]>(["email"]);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number; total: number; errors: string[] } | null>(null);
  const [sendReviewGuest, setSendReviewGuest] = useState<Guest | null>(null);
  const [sendReviewForce, setSendReviewForce] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (openMenuId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu-id]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const data = await apiClient<any>(`/events/${eventId}/custom-fields`);
        setCustomFields(data.custom_fields || []);
      } catch (_e) {
        // custom fields not available
      }
    };

    fetchCustomFields();
  }, [eventId]);

  const toggleGuestSelection = (guestId: number) => {
    const newSelected = new Set(selectedGuests);
    newSelected.has(guestId) ? newSelected.delete(guestId) : newSelected.add(guestId);
    setSelectedGuests(newSelected);
  };

  const toggleAllSelection = () => {
    selectedGuests.size === guests.length
      ? setSelectedGuests(new Set())
      : setSelectedGuests(new Set(guests.map(g => g.id)));
  };

  const acceptedCount = guests.filter(g => g.rsvp_status === "accepted").length;
  const declinedCount = guests.filter(g => g.rsvp_status === "declined").length;
  const pendingCount = guests.filter(g => g.rsvp_status === "pending").length;

  const renderCustomField = (field: CustomField, value: any, onChange: (val: any) => void) => {
    const baseClasses = "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

    switch (field.type) {
      case "select":
        return (
          <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={baseClasses}>
            <option value="">Select {field.label}</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">{field.label}</span>
          </label>
        );
      case "textarea":
        return (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${baseClasses} h-24`}
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        );
      case "email":
        return (
          <input
            type="email"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        );
      case "date":
        return (
          <input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        );
    }
  };

  // Populate customFieldValues when editing a guest
  useEffect(() => {
    if (editingGuest !== null) {
      const guest = guests.find((g) => g.id === editingGuest);
      if (guest?.custom_data) {
        setCustomFieldValues(guest.custom_data);
      } else {
        setCustomFieldValues({});
      }
    }
  }, [editingGuest]);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-600 mb-1">Total Guests</p>
          <p className="text-2xl font-bold text-slate-900">{totalGuests}</p>
          {guestLimit && <p className="text-xs text-slate-500 mt-1">of {guestLimit}</p>}
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 p-4">
          <p className="text-xs font-medium text-emerald-600 mb-1">Accepted</p>
          <p className="text-2xl font-bold text-emerald-900">{acceptedCount}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200 p-4">
          <p className="text-xs font-medium text-amber-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-900">{pendingCount}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 p-4">
          <p className="text-xs font-medium text-red-600 mb-1">Declined</p>
          <p className="text-2xl font-bold text-red-900">{declinedCount}</p>
        </div>
      </div>

      {/* Add Guest Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Guest
        </h2>
        <form onSubmit={(e) => addGuest(e, customFieldValues)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1.5">Full Name *</label>
              <input
                placeholder="Guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1.5">Phone</label>
              <input
                placeholder="Phone number"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1.5">Email</label>
              <input
                placeholder="Email address"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Event Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customFields.map((field) => (
                  <div key={field.name}>
                    {field.type !== "checkbox" && (
                      <label className="text-xs font-medium text-slate-700 block mb-1.5">
                        {field.label} {field.required && "*"}
                      </label>
                    )}
                    {renderCustomField(
                      field,
                      customFieldValues[field.name],
                      (val) => setCustomFieldValues({ ...customFieldValues, [field.name]: val })
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={guestLimit !== null && totalGuests >= guestLimit}
            className="bg-primary hover:bg-primary/90 text-white h-9 px-4 font-medium text-sm"
          >
            Add Guest
          </Button>
        </form>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Bulk Import
        </h2>
        <p className="text-sm text-slate-600 mb-4">Upload CSV with columns: name, phone, email</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={resolvedFileRef}
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="flex h-10 w-full sm:flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:text-white file:font-medium hover:file:bg-secondary/80"
          />
          <Button
            onClick={uploadCsv}
            disabled={!csvFile || csvUploading}
            className="h-9 px-3 text-sm font-medium bg-secondary hover:bg-secondary/80 text-white"
          >
            {csvUploading ? <Loader className="w-4 h-4 animate-spin" /> : "Upload"}
          </Button>
        </div>
        {csvResult && <p className="text-sm text-emerald-600 font-medium mt-2">{csvResult}</p>}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h2 className="text-base font-bold text-secondary mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Reports & Exports
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <select
              value={exportStatus}
              onChange={(e) => setExportStatus?.(e.target.value)}
              className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Guests</option>
              <option value="sent">Invite Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="not_sent">Not Sent</option>
            </select>
            <Button
              onClick={exportGuests}
              disabled={exporting}
              className="h-9 px-3 text-sm font-medium bg-secondary hover:bg-secondary/80 text-white"
            >
              {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Exporting..." : "CSV"}
            </Button>
          </div>
          <Link
            href={`/dashboard/events/${eventId}/report`}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Report
          </Link>
        </div>
      </div>

      {/* Guest Management */}
      <div className="space-y-4">
        {/* Send Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between mb-4 gap-2 flex-col sm:flex-row">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Invites
            </h2>
            {guestCountRange && (
              <span className="text-xs text-slate-400 flex-shrink-0">
                Price: NGN {channels.reduce((sum, ch) => {
                  const table: Record<string, Record<string, number>> = {
                    "1-100": { email: 100000, whatsapp: 200000, sms: 300000 },
                    "101-200": { email: 200000, whatsapp: 350000, sms: 500000 },
                    "201-400": { email: 350000, whatsapp: 500000, sms: 750000 },
                    "400+": { email: 500000, whatsapp: 750000, sms: 1000000 },
                  };
                  const prices = table[guestCountRange] || table["1-100"];
                  return sum + (prices[ch] || 0);
                }, 0).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2">
              {["email", "whatsapp", "sms"].map((ch) => (
                <label key={ch} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${channels.includes(ch) ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                  <input type="checkbox" checked={channels.includes(ch)} onChange={() => setChannels(channels.includes(ch) ? channels.filter(c => c !== ch) : [...channels, ch])} className="sr-only" />
                  <span className="capitalize">{ch}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {invalidPhoneGuests.length > 0 && channels.some(c => c === "whatsapp" || c === "sms") && (
                <span className="text-xs text-amber-600">{invalidPhoneGuests.length} invalid phone(s)</span>
              )}
              {guestsWithMissingContact.length > 0 && (
                <span className="text-xs text-amber-600">{guestsWithMissingContact.length} missing contact(s)</span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => sendInvites(false)} disabled={sending || !canSendInvites} className="bg-primary hover:bg-primary/90 text-white h-9 px-3 font-medium rounded-lg disabled:opacity-50 flex items-center gap-1.5 text-xs">
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending..." : <><span className="hidden sm:inline">Send </span>Invites</>}
              </Button>
              <Button onClick={() => sendInvites(true)} disabled={sending || !canSendInvites} variant="outline" className="h-9 px-3 font-medium rounded-lg text-xs">
                Resend
              </Button>
              <Button onClick={sendAllQrs} variant="outline" className="h-9 px-3 font-medium rounded-lg text-xs">
                Send QR
              </Button>
              <Button onClick={testSend} variant="outline" className="h-9 px-3 font-medium rounded-lg text-xs">
                Test
              </Button>
            </div>
          </div>

          {sendError && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{sendError}</div>
          )}

          {sendResult && (
            <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Sent {sendResult.total_sent || 0} / {sendResult.total_guests || 0}
            </div>
          )}
        </div>

        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Guest List ({totalGuests})
        </h2>

        {guests.length === 0 ? (
          <div className="bg-slate-50 rounded-lg border border-slate-200 border-dashed p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No guests yet. Add your first guest above.</p>
          </div>
        ) : (
          <>
            {/* Search & Filter */}
            <div className="sticky top-[116px] z-10 bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex gap-2 flex-col sm:flex-row">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={guestSearch}
                    onChange={(e) => {
                      setGuestSearch(e.target.value);
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      searchTimerRef.current = setTimeout(() => {
                        triggerSearch(e.target.value, guestRsvpFilter, 0);
                      }, 300);
                    }}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={guestRsvpFilter}
                  onChange={(e) => {
                    setGuestRsvpFilter(e.target.value);
                    triggerSearch(guestSearch, e.target.value, 0);
                  }}
                  className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Guests</option>
                  <option value="accepted">Accepted</option>
                  <option value="pending">Pending</option>
                  <option value="declined">Declined</option>
                </select>
                {(guestSearch || guestRsvpFilter) && (
                  <Button variant="ghost" size="sm" onClick={resetGuestFilter} className="text-xs h-10">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Batch Audit Summary */}
            {guests.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-slate-500 px-1 flex-wrap">
                <span className="font-medium text-slate-700">{guests.length} on this page</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  Sent: {guests.filter(g => g.invite_sent).length}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Viewed: {guests.filter(g => g.invite_viewed_at).length}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Issue: {guests.filter(g => g.rsvp_status === "" || g.rsvp_status === "pending").length}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                  No contact: {guests.filter(g => !g.email && !g.phone).length}
                </span>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedGuests.size > 0 && (
              <div className="bg-secondary text-white rounded-lg p-3 flex items-center justify-between">
                <p className="text-sm font-medium">{selectedGuests.size} guest{selectedGuests.size !== 1 ? 's' : ''} selected</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setSelectedGuests(new Set())}
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    Deselect
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowChannelModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                  >
                    <Mail className="w-4 h-4" />
                    Send Message
                  </Button>
                </div>
              </div>
            )}

            {/* Guest Table (desktop) */}
            <div className="hidden sm:block rounded-lg border border-slate-200 bg-white" style={{ overflowX: "auto", overflowY: "visible", WebkitOverflowScrolling: "touch" }}>
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedGuests.size === guests.length && guests.length > 0}
                        onChange={toggleAllSelection}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Guest</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Contact</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">RSVP Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">QR</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Message Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Added</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {guests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-slate-50 transition-colors">
                      {deleteConfirm === guest.id ? (
                        <td colSpan={8} className="px-4 py-4">
                          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm font-medium text-slate-900">Delete {guest.name}? This cannot be undone.</p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteGuest(guest.id)}>
                                Delete
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedGuests.has(guest.id)}
                              onChange={() => toggleGuestSelection(guest.id)}
                              className="rounded border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-slate-900">{guest.name}</p>
                            {guest.notes && <p className="text-xs text-slate-500 mt-1">{guest.notes}</p>}
                            {guest.tags && guest.tags.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {guest.tags.map((tag) => (
                                  <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                    <Tag className="w-2.5 h-2.5" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              {guest.email && <p className="text-xs text-slate-600">{guest.email}</p>}
                              {guest.phone && <p className="text-xs text-slate-600">{guest.phone}</p>}
                              {!guest.email && !guest.phone && <p className="text-xs text-slate-400">No contact</p>}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${
                              guest.rsvp_status === "accepted"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : guest.rsvp_status === "declined"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}>
                              {guest.rsvp_status === "accepted" && <><Check className="w-3 h-3 -mt-0.5" /> Accepted</>}
                              {guest.rsvp_status === "declined" && <><X className="w-3 h-3 -mt-0.5" /> Declined</>}
                              {guest.rsvp_status === "pending" && <><Circle className="w-3 h-3 -mt-0.5" /> Pending</>}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {guest.qr_token ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                <QrCode className="w-3 h-3" />
                                Generated
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap text-xs">
                              {guest.communication_status && Object.entries(guest.communication_status).map(([ch, info]: [string, any]) => {
                                const statusColor = info.status === "read" || info.status === "opened" ? "bg-emerald-50 text-emerald-700"
                                  : info.status === "delivered" || info.status === "sent" ? "bg-blue-50 text-blue-700"
                                  : info.status === "failed" ? "bg-red-50 text-red-700"
                                  : "bg-slate-50 text-slate-500";
                                const statusIcon = info.status === "read" || info.status === "opened" ? <Eye className="w-3 h-3" />
                                  : info.status === "delivered" ? <Check className="w-3 h-3" />
                                  : info.status === "sent" ? <Circle className="w-3 h-3" />
                                  : info.status === "failed" ? <X className="w-3 h-3" />
                                  : <Minus className="w-3 h-3" />;
                                const ts = info.delivered_at || info.opened_at || info.sent_at;
                                const timeStr = ts ? (() => { const d = new Date(ts); const now = new Date(); const diff = now.getTime() - d.getTime(); if (diff < 60000) return "now"; if (diff < 3600000) return `${Math.floor(diff / 60000)}m`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`; if (diff < 172800000) return "yesterday"; return d.toLocaleDateString(); })() : null;
                                return (
                                  <span key={ch} className={`px-2 py-1 rounded-full font-medium flex items-center gap-1 ${statusColor}`}>
                                    {statusIcon} <span className="capitalize">{ch}</span>
                                    {timeStr && <span className="text-[10px] opacity-70">{timeStr}</span>}
                                  </span>
                                );
                              })}
                              {(!guest.communication_status || Object.keys(guest.communication_status).length === 0) && guest.invite_sent && (
                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                                  Sent {guest.invite_attempts || 1}/3
                                </span>
                              )}
                              {guest.invite_viewed_at && (
                                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Viewed
                                  {(() => { const d = new Date(guest.invite_viewed_at); const diff = Date.now() - d.getTime(); const t = diff < 60000 ? "now" : diff < 3600000 ? `${Math.floor(diff / 60000)}m` : diff < 86400000 ? `${Math.floor(diff / 3600000)}h` : d.toLocaleDateString(); return <span className="text-[10px] opacity-70">{t}</span>; })()}
                                </span>
                              )}
                              {!guest.invite_sent && (!guest.communication_status || Object.keys(guest.communication_status).length === 0) && (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs text-slate-500">
                              {guest.created_at
                                ? new Date(guest.created_at).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
                                : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSendReviewGuest(guest)}
                                title="Send message"
                                className="h-8 w-8 p-0 hover:bg-blue-50"
                              >
                                <Mail className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(guest)}
                                title="Edit"
                                className="h-8 w-8 p-0 hover:bg-slate-100"
                              >
                                <Edit2 className="w-4 h-4 text-slate-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm(guest.id)}
                                title="Delete"
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Guest Cards (mobile) */}
            <div className="sm:hidden space-y-3">
              {/* Select All */}
              {guests.length > 0 && (
                <div className="flex items-center gap-2 px-1 py-1">
                  <input
                    type="checkbox"
                    checked={selectedGuests.size === guests.length}
                    onChange={toggleAllSelection}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-600">
                    {selectedGuests.size === 0
                      ? "Select all"
                      : `${selectedGuests.size} of ${guests.length} selected`}
                  </span>
                </div>
              )}
              {guests.map((guest) => (
                <div key={guest.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  {deleteConfirm === guest.id ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-900">Delete {guest.name}?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteGuest(guest.id)} className="h-8 text-xs">Delete</Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)} className="h-8 text-xs">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedGuests.has(guest.id)}
                            onChange={() => toggleGuestSelection(guest.id)}
                            className="rounded border-slate-300 mt-0.5 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{guest.name}</p>
                            {guest.notes && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{guest.notes}</p>}
                            <div className="text-xs text-slate-500 space-y-0.5 mt-0.5">
                              {guest.email && <p className="truncate">{guest.email}</p>}
                              {guest.phone && <p>{guest.phone}</p>}
                              {!guest.email && !guest.phone && <p className="text-slate-400">No contact</p>}
                            </div>
                            {guest.tags && guest.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {guest.tags.map((tag) => (
                                  <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                    <Tag className="w-2.5 h-2.5" />{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative shrink-0" data-menu-id={guest.id}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === guest.id ? null : guest.id); }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-slate-500" />
                          </button>
                          {openMenuId === guest.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                              <button
                                onClick={() => { setSendReviewGuest(guest); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Send className="w-3.5 h-3.5 text-blue-600" /> Send Invite
                              </button>
                              <button
                                onClick={() => { generateQR(guest.id); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <QrCode className="w-3.5 h-3.5 text-violet-600" /> Generate QR
                              </button>
                              <button
                                onClick={() => { startEdit(guest); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-600" /> Edit
                              </button>
                              <button
                                onClick={() => { setDeleteConfirm(guest.id); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          guest.rsvp_status === "accepted"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : guest.rsvp_status === "declined"
                              ? "bg-red-100 text-red-700 border-red-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                          {guest.rsvp_status === "accepted" && <><Check className="w-2.5 h-2.5" /> Accepted</>}
                          {guest.rsvp_status === "declined" && <><X className="w-2.5 h-2.5" /> Declined</>}
                          {guest.rsvp_status === "pending" && <><Circle className="w-2.5 h-2.5" /> Pending</>}
                        </span>
                        {guest.qr_token ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                            <QrCode className="w-2.5 h-2.5" /> QR Ready
                          </span>
                        ) : null}
                      </div>
                      {/* Message status */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {guest.communication_status && Object.entries(guest.communication_status).map(([ch, info]: [string, any]) => {
                          const statusColor = info.status === "read" || info.status === "opened" ? "bg-emerald-50 text-emerald-700"
                            : info.status === "delivered" || info.status === "sent" ? "bg-blue-50 text-blue-700"
                            : info.status === "failed" ? "bg-red-50 text-red-700"
                            : "bg-slate-50 text-slate-500";
                          const statusIcon = info.status === "read" || info.status === "opened" ? <Eye className="w-2.5 h-2.5" />
                            : info.status === "delivered" ? <Check className="w-2.5 h-2.5" />
                            : info.status === "sent" ? <Circle className="w-2.5 h-2.5" />
                            : info.status === "failed" ? <X className="w-2.5 h-2.5" />
                            : <Minus className="w-2.5 h-2.5" />;
                          const ts = info.delivered_at || info.opened_at || info.sent_at;
                          const timeStr = ts ? (() => { const d = new Date(ts); const now = new Date(); const diff = now.getTime() - d.getTime(); if (diff < 60000) return "now"; if (diff < 3600000) return `${Math.floor(diff / 60000)}m`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`; if (diff < 172800000) return "yesterday"; return d.toLocaleDateString(); })() : null;
                          return (
                            <span key={ch} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                              {statusIcon} <span className="capitalize">{ch}</span>
                              {timeStr && <span className="opacity-70">{timeStr}</span>}
                            </span>
                          );
                        })}
                        {(!guest.communication_status || Object.keys(guest.communication_status).length === 0) && guest.invite_sent && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                            Sent {guest.invite_attempts || 1}/3
                          </span>
                        )}
                        {guest.invite_viewed_at && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                            <Check className="w-2.5 h-2.5" /> Viewed
                            {(() => { const d = new Date(guest.invite_viewed_at); const diff = Date.now() - d.getTime(); const t = diff < 60000 ? "now" : diff < 3600000 ? `${Math.floor(diff / 60000)}m` : diff < 86400000 ? `${Math.floor(diff / 3600000)}h` : d.toLocaleDateString(); return <span className="opacity-70"> {t}</span>; })()}
                          </span>
                        )}
                        {!guest.invite_sent && (!guest.communication_status || Object.keys(guest.communication_status).length === 0) && (
                          <span className="text-[10px] text-slate-400">No message sent</span>
                        )}
                      </div>
                      {guest.created_at && (
                        <p className="text-[10px] text-slate-400 mt-2">
                          Added {new Date(guest.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">Page {currentPage + 1} of {pageCount}</p>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1.5 text-xs rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(0)} title="First page">«</button>
                  <button className="px-2 py-1.5 text-xs rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)} title="Previous page">‹</button>
                  {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => {
                    let pageNum: number;
                    if (pageCount <= 10) {
                      pageNum = i;
                    } else if (currentPage <= 4) {
                      pageNum = i;
                    } else if (currentPage >= pageCount - 5) {
                      pageNum = pageCount - 10 + i;
                    } else {
                      pageNum = currentPage - 5 + i;
                    }
                    if (pageNum < 0 || pageNum >= pageCount) return null;
                    return (
                      <button key={pageNum} onClick={() => goToPage(pageNum)} className={`px-3 py-1.5 text-xs rounded border ${pageNum === currentPage ? "bg-primary text-white border-primary font-bold" : "border-slate-200 hover:bg-slate-50"}`}>{pageNum + 1}</button>
                    );
                  })}
                  <button className="px-2 py-1.5 text-xs rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(currentPage + 1)} title="Next page">›</button>
                  <button className="px-2 py-1.5 text-xs rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30" disabled={currentPage >= pageCount - 1} onClick={() => goToPage(pageCount - 1)} title="Last page">»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delivery Log */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Delivery Log
            <span className="text-xs font-normal text-slate-400 ml-1">({logs.length})</span>
          </h2>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {logs.slice(0, 50).map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900">{log.guest_name || log.name || `Guest #${log.guest_id}`}</span>
                  <span className="text-xs text-slate-400 capitalize">{log.channel || "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${log.status === "delivered" || log.status === "sent" ? "text-emerald-600" : log.status === "failed" ? "text-red-600" : "text-slate-400"}`}>
                    {log.status || "pending"}
                  </span>
                  {log.sent_at && <span className="text-xs text-slate-400">{new Date(log.sent_at).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            {exportMessages && (
              <Button onClick={exportMessages} variant="outline" className="h-9 px-3 text-xs font-medium rounded-lg" disabled={exportingMsg}>
                {exportingMsg ? <Loader className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Export CSV
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Send Review Modal */}
      {sendReviewGuest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Send Invite</h2>
              <p className="text-sm text-slate-500 mt-1">Review before sending</p>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Guest</span>
                <span className="text-sm font-semibold text-slate-900">{sendReviewGuest.name}</span>
              </div>
              {sendReviewGuest.email && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Email</span>
                  <span className="text-sm text-slate-900">{sendReviewGuest.email}</span>
                </div>
              )}
              {sendReviewGuest.phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Phone</span>
                  <span className="text-sm text-slate-900">{sendReviewGuest.phone}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Invite Contents</p>
              <p className="text-sm text-slate-700">The invite will include event details, an RSVP link, and a QR code for check-in. Message is delivered via your selected channels.</p>
            </div>

            {sendReviewGuest.phone && !isValidPhone(sendReviewGuest.phone) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
                <span className="text-sm text-amber-800">Phone number appears invalid. WhatsApp/SMS delivery may fail.</span>
              </div>
            )}
            {sendReviewGuest.email && !sendReviewGuest.phone && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
                <span className="text-sm text-amber-800">No phone number on file. WhatsApp/SMS will be skipped.</span>
              </div>
            )}

            {sendReviewGuest.invite_sent && (
              <label className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendReviewForce}
                  onChange={(e) => setSendReviewForce(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-amber-900">Resend anyway</span>
                  <p className="text-xs text-amber-700">This guest has already been invited ({sendReviewGuest.invite_attempts || 1}/3 attempts)</p>
                </div>
              </label>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={async () => {
                  if (sendReviewGuest.invite_sent && !sendReviewForce) return;
                  sendReviewGuest.invite_sent ? sendGuestInvite(sendReviewGuest.id) : sendGuestInvite(sendReviewGuest.id);
                  setSendReviewGuest(null);
                  setSendReviewForce(false);
                }}
                disabled={sendReviewGuest.invite_sent && !sendReviewForce}
                className="flex-1 bg-primary hover:bg-primary/90 text-white h-9 font-medium rounded-lg text-sm disabled:opacity-50"
              >
                Send Invite
              </Button>
              <Button onClick={() => { setSendReviewGuest(null); setSendReviewForce(false); }} variant="outline" className="flex-1 h-9 text-sm font-medium rounded-lg">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Send Result Summary */}
      {bulkResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setBulkResult(null)}>
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Send Complete</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Successfully sent</span>
                <span className="font-semibold text-emerald-700">{bulkResult.sent}/{bulkResult.total}</span>
              </div>
              {bulkResult.failed > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Failed</span>
                  <span className="font-semibold text-red-600">{bulkResult.failed}</span>
                </div>
              )}
              {bulkResult.errors.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-700 max-h-24 overflow-y-auto">
                  {bulkResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
            <Button onClick={() => { setBulkResult(null); setShowChannelModal(false); setSelectedGuests(new Set()); }} className="w-full bg-primary hover:bg-primary/90 text-white h-9 text-sm font-medium rounded-lg">
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Channel Selection Modal for Bulk Send */}
      {showChannelModal && !bulkResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-sm p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Send Message</h2>
              <p className="text-sm text-slate-600 mt-1">Select channels for {selectedGuests.size} guest(s)</p>
            </div>
            <div className="space-y-2">
              {["email", "whatsapp", "sms"].map((ch) => (
                <label key={ch} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={bulkChannels.includes(ch)}
                    onChange={() => setBulkChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch])}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-900 capitalize">{ch}</span>
                </label>
              ))}
              {bulkChannels.length === 0 && (
                <p className="text-xs text-red-600">Select at least one channel</p>
              )}
              {bulkChannels.some(c => c === "whatsapp" || c === "sms") && selectedGuests.size > 0 && (
                (() => {
                  const selectedGuestList = guests.filter(g => selectedGuests.has(g.id));
                  const invalidPhones = selectedGuestList.filter(g => g.phone && !isValidPhone(g.phone));
                  const missingPhones = selectedGuestList.filter(g => !g.phone);
                  if (invalidPhones.length > 0 || missingPhones.length > 0) {
                    return (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        {invalidPhones.length > 0 && <p>{invalidPhones.length} guest(s) have invalid phone numbers.</p>}
                        {missingPhones.length > 0 && <p>{missingPhones.length} guest(s) have no phone number.</p>}
                        <p>WhatsApp/SMS will be skipped for these guests.</p>
                      </div>
                    );
                  }
                  return null;
                })()
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={async () => {
                  if (bulkChannels.length === 0) return;
                  const guestIds = Array.from(selectedGuests);
                  const total = guestIds.length;
                  let sent = 0;
                  let failed = 0;
                  const errors: string[] = [];
                  const token = localStorage.getItem("access_token");
                  const baseUrl = API_BASE;
                  setBulkSending(true);

                  for (let i = 0; i < total; i += 5) {
                    const chunk = guestIds.slice(i, i + 5);
                    setBulkProgress({ current: Math.min(i + 5, total), total });
                    try {
                      const res = await fetch(`${baseUrl}/events/${eventId}/send-invites-batch`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        body: JSON.stringify({ channels: bulkChannels, guest_ids: chunk }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        const msg = data?.detail?.message || data?.detail || "Request failed";
                        errors.push(`Batch ${Math.floor(i / 5) + 1}: ${msg}`);
                        failed += chunk.length;
                      } else if (data?.results) {
                        for (const chRes of Object.values(data.results) as any[]) {
                          const arr = Array.isArray(chRes) ? chRes : (chRes as any)?.results || [];
                          for (const r of arr) {
                            if (r.status === "delivered" || r.status === "sent") sent++;
                            else failed++;
                          }
                        }
                      } else {
                        sent += chunk.length;
                      }
                    } catch (e: any) {
                      errors.push(`Batch ${Math.floor(i / 5) + 1}: ${e.message || "Network error"}`);
                      failed += chunk.length;
                    }
                  }

                  setBulkSending(false);
                  setBulkProgress({ current: 0, total: 0 });
                  setBulkResult({ sent, failed, total, errors });
                }}
                disabled={bulkChannels.length === 0 || bulkSending}
                className="flex-1 bg-primary hover:bg-primary/90 text-white h-9 text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {bulkSending
                  ? <><Loader className="w-4 h-4 animate-spin" /> Sending {bulkProgress.current} of {bulkProgress.total}...</>
                  : `Send to ${selectedGuests.size} guest${selectedGuests.size !== 1 ? 's' : ''}`}
              </Button>
              <Button onClick={() => { setShowChannelModal(false); setBulkChannels(["email"]); }} variant="outline" className="flex-1 h-9 text-sm font-medium rounded-lg">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {editingGuest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Guest Management</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Edit guest</h2>
              </div>
              <button
                onClick={() => setEditingGuest(null)}
                disabled={savingGuest !== null}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-2">Full Name *</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter guest name"
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {!editName.trim() && (
                  <p className="text-xs text-red-600 mt-1.5">Name is required</p>
                )}
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-2">Phone</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder={guests.find(g => g.id === editingGuest)?.phone || "Enter phone"}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-2">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder={guests.find(g => g.id === editingGuest)?.email || "Enter email"}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-2">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Internal notes about this guest"
                  rows={2}
                  className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Event Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((field) => (
                      <div key={field.name}>
                        {field.type !== "checkbox" && (
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-2">
                            {field.label}
                          </label>
                        )}
                        {renderCustomField(
                          field,
                          customFieldValues[field.name],
                          (val) => setCustomFieldValues({ ...customFieldValues, [field.name]: val })
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t border-slate-200">
              <Button
                onClick={() => saveEdit(editingGuest, customFieldValues)}
                disabled={!editName.trim() || savingGuest !== null}
                className="flex-1 bg-primary hover:bg-primary/90 text-white h-9 text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingGuest !== null ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save changes
                  </>
                )}
              </Button>
              <Button
                onClick={() => setEditingGuest(null)}
                disabled={savingGuest !== null}
                variant="outline"
                className="flex-1 h-9 text-sm font-medium rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
