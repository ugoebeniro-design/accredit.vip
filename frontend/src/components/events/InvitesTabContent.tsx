"use client";

import { Button } from "@/components/ui/button";
import { Send, AlertCircle, Lightbulb, CheckCircle, AlertTriangle, Loader, Mail, MessageSquare, Smartphone } from "lucide-react";

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

type SendResult = {
  channels?: Record<string, any>;
  total_sent?: number;
  total_guests?: number;
};

type InvitesTabContentProps = {
  channels: string[];
  setChannels: (v: string[]) => void;
  sending: boolean;
  canSendInvites: boolean;
  sendInvites: (force?: boolean) => Promise<void>;
  sendAllQrs: () => Promise<void>;
  testSend: () => Promise<void>;
  sendResult: SendResult | null;
  sendError: string | null;
  logs: any[];
  invalidPhoneGuests: Guest[];
  guestsWithMissingContact: Guest[];
  guestCountRange?: string | null;
};

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
];

function toggleChannel(ch: string, current: string[]): string[] {
  if (current.includes(ch)) {
    const next = current.filter((c) => c !== ch);
    return next.length > 0 ? next : current;
  }
  return [...current, ch];
}

const PRICE_TABLE: Record<string, Record<string, number>> = {
  "1-100": { email: 100000, whatsapp: 200000, sms: 300000 },
  "101-200": { email: 200000, whatsapp: 350000, sms: 500000 },
  "201-400": { email: 350000, whatsapp: 500000, sms: 750000 },
  "400+": { email: 500000, whatsapp: 750000, sms: 1000000 },
};

function calculateTotalPrice(guestRange: string, chs: string[]): number {
  const prices = PRICE_TABLE[guestRange] || PRICE_TABLE["1-100"];
  return chs.reduce((sum, ch) => sum + (prices[ch] || 0), 0);
}

export default function InvitesTabContent({
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
}: InvitesTabContentProps) {
  const phoneSelected = channels.some((c) => c === "whatsapp" || c === "sms");
  const emailSelected = channels.includes("email");
  const totalPrice = guestCountRange ? calculateTotalPrice(guestCountRange, channels) : 0;

  return (
    <div className="space-y-6">
      {/* Messaging Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 mb-1">Sent</p>
              <p className="text-2xl font-bold text-blue-900">
                {sendResult?.total_sent || 0}
              </p>
            </div>
            <Mail className="w-8 h-8 text-blue-300" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 mb-1">Delivered</p>
              <p className="text-2xl font-bold text-emerald-900">
                {sendResult?.channels ? Object.values(sendResult.channels).reduce((sum: number, ch: any) => sum + (ch.sent || 0), 0) : 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-300" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-900">
                {(sendResult?.total_guests || 0) - (sendResult?.total_sent || 0)}
              </p>
            </div>
            <Loader className="w-8 h-8 text-amber-300" />
          </div>
        </div>
      </div>

      {/* Send Invitations Section */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Messaging & Communication
        </h2>
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          {/* Channel Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Select Delivery Channels</label>
            <div className="flex flex-wrap gap-3">
              {CHANNEL_OPTIONS.map((opt) => {
                const active = channels.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setChannels(toggleChannel(opt.value, channels))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      active ? "border-white bg-white" : "border-slate-400"
                    }`}>
                      {active && <div className="w-2 h-2 rounded-sm bg-slate-900" />}
                    </div>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing Estimate */}
          {guestCountRange && channels.length > 0 && totalPrice > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Cost Estimate</h3>
              <div className="space-y-2 text-sm">
                {channels.map((ch) => {
                  const price = PRICE_TABLE[guestCountRange]?.[ch] || 0;
                  return (
                    <div key={ch} className="flex items-center justify-between text-slate-700">
                      <span className="capitalize">{ch}</span>
                      <span>NGN {price.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between font-semibold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total ({guestCountRange} guests)</span>
                  <span>NGN {totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info Alert */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              Sends to eligible guests through all selected channels. Guests must have the required contact info (email for email, phone for WhatsApp/SMS).
            </p>
          </div>

          {/* Warning: Invalid Phone Numbers */}
          {invalidPhoneGuests.length > 0 && phoneSelected && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{invalidPhoneGuests.length} guest{invalidPhoneGuests.length === 1 ? "" : "s"} have invalid phone numbers</span> and cannot receive WhatsApp/SMS invites. Fix these on the Guests tab before sending.
              </p>
            </div>
          )}

          {/* Info: Missing Contact */}
          {guestsWithMissingContact.length > 0 && invalidPhoneGuests.length === 0 && (
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{guestsWithMissingContact.length} guest{guestsWithMissingContact.length === 1 ? "" : "s"}</span> missing required contact info will be skipped.
                {!emailSelected && " Email deselected."}
                {!phoneSelected && " Phone channels deselected."}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap pt-2">
            <Button
              onClick={() => sendInvites()}
              disabled={sending || !canSendInvites}
              className="bg-slate-900 hover:bg-slate-800 text-white h-10 font-medium gap-2"
            >
              {sending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Invites
                </>
              )}
            </Button>
            <Button
              onClick={() => sendInvites(true)}
              disabled={sending || !canSendInvites}
              variant="outline"
              className="h-10 font-medium"
            >
              {sending ? "Resending..." : "Resend All"}
            </Button>
            <Button
              onClick={sendAllQrs}
              disabled={sending || !canSendInvites}
              variant="outline"
              className="h-10 font-medium"
              title="Send QR codes to all guests"
            >
              {sending ? "Sending..." : "Send QR"}
            </Button>
            <Button
              variant="outline"
              onClick={testSend}
              className="h-10 font-medium"
            >
              Test Send
            </Button>
          </div>

          {/* Success Message */}
          {sendResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-900">
                <p className="font-semibold">Success!</p>
                {sendResult.channels ? (
                  <ul className="mt-1 space-y-1">
                    {Object.entries(sendResult.channels).map(([ch, info]: [string, any]) => (
                      <li key={ch}>
                        {ch}: {info.sent}/{info.total} sent{info.skipped_max_attempts > 0 ? ` (${info.skipped_max_attempts} skipped)` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Sent {sendResult.total_sent ?? 0} of {sendResult.total_guests ?? 0}</p>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {sendError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 whitespace-pre-line">{sendError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Logs Section */}
      {logs.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Delivery History
          </h2>
          <div className="space-y-3">
            {logs.map((log: any) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 capitalize">{log.channel}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {log.total_sent} sent • Status: {log.status}
                    </p>
                  </div>
                  <div className="text-right">
                    {log.status === "sent" || log.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Complete
                      </span>
                    ) : log.status === "pending" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        <Loader className="w-3 h-3 animate-spin" />
                        In Progress
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
