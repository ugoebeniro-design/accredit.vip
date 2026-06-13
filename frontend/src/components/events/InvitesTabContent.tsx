"use client";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

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
    <div className="space-y-6">
      <div className="rounded-xl border p-6 bg-gradient-to-br from-pink-50 to-transparent">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Send className="w-5 h-5" /> Send Invitations</h3>
        <div className="space-y-3">
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            💡 Sends only to guests who haven't been invited. Use individual buttons to re-send.
          </div>
          {invalidPhoneGuests.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 font-medium">
              ⚠️ Fix {invalidPhoneGuests.length} phone number{invalidPhoneGuests.length === 1 ? "" : "s"} before sending via {channel}.
            </div>
          )}
          {guestsWithoutSelectedContact.length > 0 && invalidPhoneGuests.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              ℹ️ {guestsWithoutSelectedContact.length} guest{guestsWithoutSelectedContact.length === 1 ? "" : "s"} missing {channel === "email" ? "email" : "phone"} will be skipped.
            </div>
          )}
          <div className="flex gap-2 flex-wrap pt-2">
            <Button onClick={() => sendInvites()} disabled={sending || !canSendInvites} className="bg-[#E91E8C] hover:bg-[#C4166F]">
              {sending ? "..." : "Send Invites"}
            </Button>
            <Button onClick={() => sendInvites(true)} disabled={sending || !canSendInvites} variant="outline">
              {sending ? "..." : "Resend All"}
            </Button>
            <Button onClick={sendAllQrs} disabled={sending || !canSendInvites} variant="outline">
              {sending ? "..." : "Send All QR"}
            </Button>
            <Button variant="outline" onClick={testSend}>Test Send</Button>
          </div>
          {sendResult && (
            <div className="rounded-lg border p-3 text-sm">
              Sent {sendResult.sent} of {sendResult.total} via {sendResult.channel}
            </div>
          )}
          {sendError && <div className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{sendError}</div>}
        </div>

        {logs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Delivery Logs</h2>
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="rounded-lg border p-3 text-sm">
                  <span className="font-medium">{log.channel}</span> &middot; {log.total_sent} sent &middot; {log.status}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
