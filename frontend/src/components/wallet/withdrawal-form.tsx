"use client";

import { useState } from "react";
import { AlertCircle, Send, Info } from "lucide-react";
import { SUPPORTED_CURRENCIES, formatCurrencyAmount } from "@/lib/currencies";
import { getCountryFlag } from "@/lib/country-flag";

interface WithdrawalFormProps {
  wallets: Array<{ currency: string; balance: number }>;
  bankAccounts: Array<{ id: number; bank_name: string; currency: string; country_code: string; masked_account: string }>;
  onSubmit: (accountId: number, amount: number) => Promise<void>;
  loading?: boolean;
}

export function WithdrawalForm({
  wallets,
  bankAccounts,
  onSubmit,
  loading = false,
}: WithdrawalFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId);
  const selectedWallet = selectedAccount
    ? wallets.find((w) => w.currency === selectedAccount.currency)
    : null;
  const selectedCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === selectedAccount?.currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedAccountId) {
      setError("Please select a bank account");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!selectedWallet || selectedWallet.balance < numAmount) {
      setError("Insufficient balance");
      return;
    }

    if (selectedCurrency && numAmount < selectedCurrency.min_fund) {
      setError(`Minimum withdrawal is ${selectedCurrency.symbol}${selectedCurrency.min_fund}`);
      return;
    }

    try {
      await onSubmit(selectedAccountId, numAmount);
      setSuccess("Withdrawal request submitted successfully!");
      setAmount("");
      setDescription("");
      setSelectedAccountId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process withdrawal");
    }
  };

  const dailyLimit = selectedCurrency?.daily_withdrawal_limit || 0;
  const verificationThreshold = selectedCurrency?.verification_threshold || 0;
  const willRequireVerification = parseFloat(amount) > verificationThreshold;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-[#fecdd3] bg-[#fef2f2] p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-[#dc2626] flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[#dcfce7] bg-[#f0fdf4] p-4">
          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-[#166534]">{success}</p>
          </div>
        </div>
      )}

      {/* Bank Account Selection */}
      <div>
        <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Withdraw To</label>
        <select
          value={selectedAccountId || ""}
          onChange={(e) => setSelectedAccountId(parseInt(e.target.value) || null)}
          disabled={loading || bankAccounts.length === 0}
          className="w-full h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc] disabled:opacity-50"
        >
          <option value="">Select a bank account...</option>
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {getCountryFlag(account.country_code)} {account.bank_name} • {account.masked_account} ({account.currency})
            </option>
          ))}
        </select>
        {bankAccounts.length === 0 && (
          <p className="text-xs text-[#e91e8c] mt-1">Add a bank account first</p>
        )}
      </div>

      {/* Amount */}
      {selectedWallet && (
        <div>
          <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Amount</label>
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0D1B2A]">
                {selectedCurrency?.symbol}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                min={selectedCurrency?.min_fund || 0}
                max={selectedWallet.balance}
                step={selectedCurrency?.symbol === "₦" ? "1" : "0.01"}
                placeholder="0"
                className="w-full h-11 rounded-xl border border-[#d9e2ec] px-3 pl-8 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc]"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#64748b]">
                Available: {formatCurrencyAmount(selectedWallet.balance, selectedWallet.currency)}
              </p>
              <button
                type="button"
                onClick={() => setAmount(selectedWallet.balance.toString())}
                className="text-xs font-semibold text-[#E91E8C] hover:underline"
              >
                Max
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Description (Optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          placeholder="e.g., For project fees"
          maxLength={100}
          className="w-full h-11 rounded-xl border border-[#d9e2ec] px-3 text-sm outline-none focus:border-[#E91E8C] disabled:bg-[#f8fafc]"
        />
      </div>

      {/* Warnings & Info */}
      {selectedCurrency && amount && (
        <div className="space-y-2">
          {willRequireVerification && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">High amount:</span> Withdrawals over {selectedCurrency.symbol}
                {selectedCurrency.verification_threshold.toLocaleString()} may require additional verification.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-[#e8edf2] bg-[#f8f9fc] p-3 flex gap-2">
            <Info className="h-4 w-4 text-[#0D1B2A] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#64748b]">
              <span className="font-semibold">Daily limit:</span> {selectedCurrency.symbol}
              {selectedCurrency.daily_withdrawal_limit.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !selectedAccountId || !selectedWallet || parseFloat(amount) <= 0}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#E91E8C] px-6 text-sm font-bold text-white hover:bg-[#C4166F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="h-4 w-4" />
        {loading ? "Processing..." : "Request Withdrawal"}
      </button>

      <p className="text-xs text-[#64748b] text-center">
        Withdrawals are processed within 1-3 business days
      </p>
    </form>
  );
}
