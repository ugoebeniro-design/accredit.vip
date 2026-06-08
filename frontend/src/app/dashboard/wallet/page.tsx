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
import { Menu, X, LayoutGrid, Calendar, Plus, Wallet as WalletIcon, Compass, LogOut, Lock } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

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
  const { user, logout } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "withdraw" | "accounts">("overview");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchWallets();
    fetchBankAccounts();
  }, [user, router]);

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
    if (selectedCurrency === currency) {
      setSelectedCurrency("");
      return;
    }
    setSelectedCurrency(currency);
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

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <h2 className="text-lg font-bold text-[#0D1B2A] mb-2">Sign Out?</h2>
            <p className="text-[#64748b] mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#e8edf2] text-[#0D1B2A] font-semibold hover:bg-[#f8f9fc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex-col flex-shrink-0 transition-all duration-300 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
        style={{
          background: "#0D1B2A",
          width: sidebarOpen ? "256px" : "80px",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center flex-1 min-w-0">
            <Image src="/logo-white.png" alt="accredit.vip" width={180} height={180} className="h-8 w-auto object-contain" />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 hidden lg:block ml-2"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {sidebarOpen && <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">
            Main Menu
          </p>}
          {[
            { href: "/dashboard", label: "Dashboard", icon: <LayoutGrid className="w-4 h-4" /> },
            { href: "/dashboard/events", label: "Events", icon: <Calendar className="w-4 h-4" /> },
            { href: "/dashboard/create", label: "Create Event", icon: <Plus className="w-4 h-4" /> },
            { href: "/dashboard/wallet", label: "Wallet", icon: <WalletIcon className="w-4 h-4" />, active: true },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
              style={{
                background: item.active ? "rgba(233,30,140,0.15)" : "transparent",
                color: item.active ? "#E91E8C" : "rgba(255,255,255,0.6)",
              }}
              title={!sidebarOpen ? item.label : ""}
            >
              <span className={item.active ? "text-[#E91E8C]" : "text-white/40"}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}

          {/* Discover Section */}
          {sidebarOpen && (
            <div className="pt-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Discover</p>
              <Link
                href="/attend"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all"
              >
                <Compass className="w-4 h-4" />
                Browse Events
              </Link>
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 flex-shrink-0 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
              {user.full_name?.charAt(0) || "U"}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
                <p className="text-white/40 text-xs truncate">{user.email}</p>
              </div>
            )}
          </div>

          {/* Change Password & Logout */}
          {sidebarOpen && (
            <>
              <Link
                href="/dashboard/change-password"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-400 font-bold text-sm transition-all hover:shadow-lg active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "white", borderBottom: "1px solid #e8edf2" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu className="w-5 h-5 text-[#0D1B2A]" />
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
