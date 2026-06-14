"use client";

import { Button } from "@/components/ui/button";
import { Send, AlertCircle, Lightbulb, CheckCircle, AlertTriangle, Loader } from "lucide-react";

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
  batch_id: number;
  channel: string;
  sent: number;
  total: number;
};

type InvitesTabContentProps = {
  channel: string;
  setChannel: (v: string) => void;
  sending: boolean;
  canSendInvites: boolean;
  sendInvites: (force?: boolean) => Promise<void>;
  sendAllQrs: () => Promise<void>;
  testSend: () => Promise<void>;
  sendResult: SendResult | null;
  sendError: string | null;
  logs: any[];
  invalidPhoneGuests: Guest[];
  guestsWithoutSelectedContact: Guest[];
};

export default function InvitesTabContent({
  channel,
  setChannel,
  sending,
  canSendInvites,
  sendInvites,
  sendAllQrs,
  testSend,
  sendResult,
  sendError,
  logs,
  invalidPhoneGuests,
  guestsWithoutSelectedContact,
}: InvitesTabContentProps) {
  return (
    <div className="space-y-8">
      {/* Send Invitations Section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send Invitations
        </h2>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
          {/* Channel Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Delivery Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          {/* Info Alert */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              Sends only to guests who haven't been invited. Use individual buttons on the Guests tab to re-send to specific guests.
            </p>
          </div>

          {/* Warning: Invalid Phone Numbers */}
          {invalidPhoneGuests.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{invalidPhoneGuests.length} guest{invalidPhoneGuests.length === 1 ? "" : "s"} have invalid phone numbers</span> and cannot receive {channel} invites. Fix these on the Guests tab before sending.
              </p>
            </div>
          )}

          {/* Info: Missing Contact */}
          {guestsWithoutSelectedContact.length > 0 && invalidPhoneGuests.length === 0 && (
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{guestsWithoutSelectedContact.length} guest{guestsWithoutSelectedContact.length === 1 ? "" : "s"}</span> missing {channel === "email" ? "email address" : "phone number"} will be skipped during sending.
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
            >
              {sending ? "Sending..." : "Send All QR Codes"}
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
              <p className="text-sm text-emerald-900">
                <span className="font-semibold">Success!</span> Sent {sendResult.sent} of {sendResult.total} invitations via {sendResult.channel}.
              </p>
            </div>
          )}

          {/* Error Message */}
          {sendError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{sendError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Logs Section */}
      {logs.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
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
                    {log.status === "sent" ? (
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
