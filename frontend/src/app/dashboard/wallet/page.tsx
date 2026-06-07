"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

type CurrencyInfo = {
  name: string;
  symbol: string;
  flag: string;
  country: string;
  min_fund: number;
};

type WalletData = {
  id: number;
  balance: number;
  currency: string;
  balances: Record<string, number>;
  transactions: {
    id: number;
    amount: number;
    currency: string;
    type: string;
    reference: string;
    description: string | null;
    status: string;
    created_at: string;
  }[];
};

const QUICK_AMOUNTS: Record<string, number[]> = {
  NGN: [1000, 5000, 10000, 25000],
  USD: [10, 25, 50, 100],
  GBP: [10, 25, 50, 100],
  EUR: [10, 25, 50, 100],
  KES: [500, 1000, 5000, 10000],
  GHS: [20, 50, 100, 500],
  ZAR: [50, 100, 500, 1000],
  RWF: [2000, 5000, 10000, 50000],
  UGX: [5000, 10000, 50000, 100000],
  TZS: [5000, 10000, 50000, 100000],
};

function WalletContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [currencies, setCurrencies] = useState<Record<string, CurrencyInfo>>({});
  const [selectedCurrency, setSelectedCurrency] = useState("NGN");
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);

  const loadCurrencies = useCallback(async () => {
    try {
      const data = await apiClient<Record<string, CurrencyInfo>>("/wallet/currencies");
      setCurrencies(data);
    } catch {}
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      const data = await apiClient<WalletData>("/wallet");
      setWallet(data);
    } catch {}
  }, []);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);

  useEffect(() => {
    loadCurrencies();
    if (user) loadWallet();
  }, [user, loadWallet, loadCurrencies]);

  useEffect(() => {
    const ref = searchParams.get("reference");
    if (ref) loadWallet();
  }, [searchParams, loadWallet]);

  const currencyInfo = currencies[selectedCurrency] || { symbol: "$", name: selectedCurrency, flag: "", min_fund: 1 };

  const handleFund = async () => {
    const amount = Number(fundAmount);
    if (!amount || amount < currencyInfo.min_fund) {
      alert(`Minimum top-up is ${currencyInfo.symbol}${currencyInfo.min_fund}`);
      return;
    }
    setFunding(true);
    try {
      const res = await apiClient<{ authorization_url: string | null }>("/wallet/fund", {
        method: "POST",
        body: { amount, currency: selectedCurrency },
      });
      if (res.authorization_url) window.location.href = res.authorization_url;
      else alert("Payment gateway unavailable for this currency");
    } catch (err: any) { alert(err.message); }
    setFunding(false);
  };

  if (loading || !user) return null;

  const balances = wallet?.balances ?? {};

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-[#e8edf2]">
          <h1 className="text-lg font-bold text-[#0D1B2A]">Wallet</h1>
          <button onClick={() => router.push("/dashboard")} className="text-sm text-pink-600 hover:underline">&larr; Dashboard</button>
        </header>
        <main className="flex-1 p-6 overflow-auto max-w-2xl mx-auto w-full">
          {/* Currency Cards */}
          <h2 className="font-bold text-sm text-[#0D1B2A] mb-3">Currency Balances</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {Object.entries(currencies).map(([code, info]) => {
              const bal = balances[code] ?? 0;
              const isSelected = selectedCurrency === code;
              return (
                <button
                  key={code}
                  onClick={() => { setSelectedCurrency(code); setFundAmount(""); }}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-pink-500 bg-pink-50 shadow-sm"
                      : "border-[#e8edf2] bg-white hover:border-pink-200"
                  }`}
                >
                  <span className="text-2xl block mb-1">{info.flag}</span>
                  <p className="text-sm font-bold text-[#0D1B2A]">{code}</p>
                  <p className="text-xs text-gray-500">{info.symbol}{bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </button>
              );
            })}
          </div>

          {/* Fund Card */}
          <div className="rounded-2xl bg-white border border-[#e8edf2] p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{currencyInfo.flag}</span>
              <div>
                <h2 className="font-bold text-sm">Top Up {selectedCurrency} Wallet</h2>
                <p className="text-xs text-gray-400">{currencyInfo.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={`Amount (${currencyInfo.symbol})`}
                min={currencyInfo.min_fund}
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="flex-1 rounded-xl border border-[#e8edf2] px-4 py-3 text-sm"
              />
              <button
                onClick={handleFund}
                disabled={funding}
                className="rounded-xl bg-pink-600 text-white px-6 py-3 font-bold text-sm hover:bg-pink-700 disabled:opacity-50"
              >
                {funding ? "..." : "Fund"}
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {(QUICK_AMOUNTS[selectedCurrency] || [100, 500, 1000]).map((n) => (
                <button
                  key={n}
                  onClick={() => setFundAmount(String(n))}
                  className="rounded-lg border border-[#e8edf2] px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-pink-300 hover:text-pink-600 transition"
                >
                  {currencyInfo.symbol}{n.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <h2 className="font-bold text-sm mb-3">Transaction History</h2>
          {(wallet?.transactions ?? []).length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#e8edf2] p-8 text-center">
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(wallet?.transactions ?? []).map((tx) => {
                const txCur = currencies[tx.currency] || { symbol: tx.currency, flag: "" };
                return (
                  <div key={tx.id} className="rounded-xl bg-white border border-[#e8edf2] p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{tx.description || tx.type}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()} · {tx.reference} · {tx.currency}</p>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ml-3 ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                      {tx.amount > 0 ? "+" : ""}{txCur.symbol}{Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center text-sm text-gray-400">Loading wallet...</div>}>
      <WalletContent />
    </Suspense>
  );
}
