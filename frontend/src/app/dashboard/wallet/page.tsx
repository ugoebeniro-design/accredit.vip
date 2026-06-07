"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { BankAccountManager } from "@/components/wallet/bank-account-manager";
import { AddBankAccountForm } from "@/components/wallet/add-bank-account-form";
import { WithdrawalForm } from "@/components/wallet/withdrawal-form";
import { CurrencySelector } from "@/components/wallet/currency-selector";
import { ChevronLeft } from "lucide-react";

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (!res.ok) {
          router.push("/auth/login");
          return;
        }
        const data = await res.json();
        setUser(data);
      } catch {
        router.push("/auth/login");
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E91E8C]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#E91E8C] hover:underline mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-[#0D1B2A]">Wallet</h1>
          <p className="text-[#64748b] mt-2">Manage your funds and bank accounts</p>
        </div>

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
      </div>
    </div>
  );
}
