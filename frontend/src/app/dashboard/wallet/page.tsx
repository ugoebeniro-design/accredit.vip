"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { BankAccountManager } from "@/components/wallet/bank-account-manager";
import { AddBankAccountForm } from "@/components/wallet/add-bank-account-form";
import { WithdrawalForm } from "@/components/wallet/withdrawal-form";
import { CurrencySelector } from "@/components/wallet/currency-selector";
import { Menu, X } from "lucide-react";

interface Wallet {
  id: number;
  currency: string;
  balance: number;
  is_primary: boolean;
}

interface BankAccount {
  id: number;
  bank_name: string;
  country_code: string;
  currency: string;
  masked_account: string;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "withdraw" | "accounts">("overview");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data);
      } catch {
        router.push("/login");
      }
    };

    checkAuth();
    fetchWallets();
    fetchBankAccounts();
  }, [router]);

  const fetchWallets = async () => {
    try {
      const res = await fetch("/api/v1/wallets");
      if (res.ok) {
        const data = await res.json();
        setWallets(Array.isArray(data) ? data : data.wallets || []);
      }
    } catch (err) {
      console.error("Failed to fetch wallets:", err);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch("/api/v1/bank-accounts");
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(Array.isArray(data) ? data : data.accounts || []);
      }
    } catch (err) {
      console.error("Failed to fetch bank accounts:", err);
    }
  };

  const handleAddBankAccount = async (accountData: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/bank-accounts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to add bank account");
      }

      await fetchBankAccounts();
      setActiveTab("overview");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBankAccount = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/bank-accounts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete bank account");
      }

      await fetchBankAccounts();
    } finally {
      setLoading(false);
    }
  };

  const handleDepositCurrency = async (currency: string) => {
    if (!currency) {
      setActiveTab("deposit");
      setSelectedCurrency("");
    } else {
      setSelectedCurrency(currency);
      setActiveTab("deposit");
    }
  };

  const handleWithdrawCurrency = async (currency: string) => {
    setSelectedCurrency(currency);
    setActiveTab("withdraw");
  };

  const handleCurrencySelect = async (currency: string) => {
    setSelectedCurrency(currency);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/wallets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });

      if (res.ok) {
        await fetchWallets();
        setActiveTab("overview");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalSubmit = async (accountId: number, amount: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/withdrawals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: accountId,
          amount,
          currency: selectedCurrency,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to process withdrawal");
      }

      await fetchWallets();
      setActiveTab("overview");
      setSelectedCurrency("");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col flex-shrink-0 transition-transform duration-300 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`} style={{ background: "#0D1B2A" }}>
        <div className="flex items-center h-16 px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" onClick={() => setMobileNavOpen(false)}>
            <Image src="/logo-dark-trim.png" alt="accredit.vip" width={4071} height={761} className="h-8 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Main Menu</p>
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/dashboard/events", label: "Events" },
            { href: "/dashboard/create", label: "Create Event" },
            { href: "/dashboard/wallet", label: "Wallet", active: true },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              onClick={() => setMobileNavOpen(false)}
              style={{
                background: item.active ? "rgba(233,30,140,0.15)" : "transparent",
                color: item.active ? "#E91E8C" : "rgba(255,255,255,0.6)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "white", borderBottom: "1px solid #e8edf2" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-[#0D1B2A]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#0D1B2A]">Wallet</h1>
              <p className="text-xs text-gray-400">Manage your funds and bank accounts</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-[#e8edf2]">
            {["overview", "deposit", "withdraw", "accounts"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab as any);
                  setSelectedCurrency("");
                }}
                className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-[#E91E8C] text-[#E91E8C]"
                    : "border-transparent text-[#64748b] hover:text-[#0D1B2A]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                <WalletDashboard
                  wallets={wallets}
                  onDeposit={handleDepositCurrency}
                  onWithdraw={handleWithdrawCurrency}
                  loading={loading}
                />
                <BankAccountManager
                  accounts={bankAccounts}
                  onAdd={() => setActiveTab("accounts")}
                  onDelete={handleDeleteBankAccount}
                  loading={loading}
                />
              </>
            )}

            {/* Deposit Tab */}
            {activeTab === "deposit" && (
              <div className="bg-white rounded-xl border border-[#e8edf2] p-6">
                <h2 className="text-xl font-bold text-[#0D1B2A] mb-4">Add Funds</h2>
                <CurrencySelector
                  onSelect={handleCurrencySelect}
                  selectedCurrency={selectedCurrency}
                />
              </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === "withdraw" && (
              <div className="bg-white rounded-xl border border-[#e8edf2] p-6">
                <h2 className="text-xl font-bold text-[#0D1B2A] mb-6">Request Withdrawal</h2>
                {bankAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#64748b] mb-4">Add a bank account first to withdraw funds</p>
                    <button
                      onClick={() => setActiveTab("accounts")}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#E91E8C] px-4 py-2 text-sm font-bold text-white hover:bg-[#C4166F] transition-colors"
                    >
                      Add Bank Account
                    </button>
                  </div>
                ) : (
                  <WithdrawalForm
                    wallets={wallets}
                    bankAccounts={bankAccounts}
                    onSubmit={handleWithdrawalSubmit}
                    loading={loading}
                  />
                )}
              </div>
            )}

            {/* Bank Accounts Tab */}
            {activeTab === "accounts" && (
              <div className="bg-white rounded-xl border border-[#e8edf2] p-6">
                <h2 className="text-xl font-bold text-[#0D1B2A] mb-6">Add Bank Account</h2>
                {user && (
                  <AddBankAccountForm
                    userFullName={user.full_name}
                    onSubmit={handleAddBankAccount}
                    loading={loading}
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
