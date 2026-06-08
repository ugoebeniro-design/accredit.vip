"use client";

import { ArrowDownLeft, ArrowUpRight, Search, Filter, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { useState, useMemo } from "react";
import { formatCurrencyAmount } from "@/lib/currencies";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "transfer";
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed";
  date: string;
  description: string;
  reference: string;
  fee?: number;
  method?: string;
}

interface TransactionHistoryProps {
  transactions?: Transaction[];
  loading?: boolean;
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
};

const typeConfig = {
  deposit: { label: "Deposit", icon: ArrowDownLeft, color: "text-blue-600" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, color: "text-purple-600" },
  transfer: { label: "Transfer", icon: ChevronRight, color: "text-gray-600" },
};

export function TransactionHistory({ transactions = [], loading = false }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "deposit" | "withdrawal" | "transfer">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateRange, setDateRange] = useState<"all" | "7days" | "30days" | "90days">("all");

  // Mock transactions if none provided
  const mockTransactions: Transaction[] = [
    {
      id: "TXN001",
      type: "deposit",
      amount: 50000,
      currency: "NGN",
      status: "completed",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Deposit via Paystack",
      reference: "PAY-123456789",
      method: "Card",
    },
    {
      id: "TXN002",
      type: "withdrawal",
      amount: 25000,
      currency: "NGN",
      status: "completed",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Withdrawal to Access Bank",
      reference: "WTH-987654321",
      fee: 100,
    },
    {
      id: "TXN003",
      type: "deposit",
      amount: 100,
      currency: "USD",
      status: "pending",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Deposit via Stripe",
      reference: "STR-456789123",
      method: "Card",
    },
    {
      id: "TXN004",
      type: "withdrawal",
      amount: 50,
      currency: "USD",
      status: "failed",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Withdrawal attempt",
      reference: "WTH-111222333",
    },
    {
      id: "TXN005",
      type: "transfer",
      amount: 10000,
      currency: "NGN",
      status: "completed",
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Transfer to event wallet",
      reference: "TRF-555666777",
    },
  ];

  const displayTransactions = transactions.length > 0 ? transactions : mockTransactions;

  const getDateRangeFilter = (date: string) => {
    const txDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (dateRange) {
      case "7days":
        return diffDays <= 7;
      case "30days":
        return diffDays <= 30;
      case "90days":
        return diffDays <= 90;
      default:
        return true;
    }
  };

  const filteredTransactions = useMemo(() => {
    return displayTransactions.filter((tx) => {
      const matchesSearch =
        tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.currency.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === "all" || tx.type === filterType;
      const matchesStatus = filterStatus === "all" || tx.status === filterStatus;
      const matchesDateRange = getDateRangeFilter(tx.date);

      return matchesSearch && matchesType && matchesStatus && matchesDateRange;
    });
  }, [displayTransactions, searchQuery, filterType, filterStatus, dateRange]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search by reference, description, or currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#e8edf2] focus:outline-none focus:border-[#E91E8C] text-[#0D1B2A]"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange("all")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                dateRange === "all"
                  ? "bg-[#E91E8C] text-white"
                  : "bg-[#f0f1f7] text-[#64748b] hover:bg-[#e8edf2]"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateRange("7days")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                dateRange === "7days"
                  ? "bg-[#E91E8C] text-white"
                  : "bg-[#f0f1f7] text-[#64748b] hover:bg-[#e8edf2]"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange("30days")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                dateRange === "30days"
                  ? "bg-[#E91E8C] text-white"
                  : "bg-[#f0f1f7] text-[#64748b] hover:bg-[#e8edf2]"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange("90days")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                dateRange === "90days"
                  ? "bg-[#E91E8C] text-white"
                  : "bg-[#f0f1f7] text-[#64748b] hover:bg-[#e8edf2]"
              }`}
            >
              Last 90 Days
            </button>
          </div>
        </div>

        {/* Type and Status Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-[#e8edf2] focus:outline-none focus:border-[#E91E8C] text-[#0D1B2A] bg-white"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-[#e8edf2] focus:outline-none focus:border-[#E91E8C] text-[#0D1B2A] bg-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-xl border border-[#e8edf2] bg-[#f8f9fc] p-12 text-center">
          <Filter className="mx-auto h-12 w-12 text-[#94a3b8] mb-3" />
          <p className="text-sm font-semibold text-[#0D1B2A]">No transactions found</p>
          <p className="text-xs text-[#64748b] mt-1">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const TypeIcon = typeConfig[tx.type].icon;
            const StatusIcon = statusConfig[tx.status].icon;

            return (
              <button
                key={tx.id}
                onClick={() => setSelectedTransaction(tx)}
                className="w-full rounded-xl border border-[#e8edf2] bg-white p-4 hover:border-[#E91E8C] hover:bg-[#fff1f8] transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${typeConfig[tx.type].color.replace("text-", "bg-").replace("600", "50")}`}>
                      <TypeIcon className={`w-5 h-5 ${typeConfig[tx.type].color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0D1B2A]">{typeConfig[tx.type].label}</p>
                      <p className="text-sm text-[#64748b] truncate">{tx.description}</p>
                      <p className="text-xs text-[#94a3b8] mt-1">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === "withdrawal" ? "text-red-600" : "text-green-600"}`}>
                        {tx.type === "withdrawal" ? "-" : "+"}{formatCurrencyAmount(tx.amount, tx.currency)}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <StatusIcon className={`w-4 h-4 ${statusConfig[tx.status].color}`} />
                        <p className={`text-xs font-semibold ${statusConfig[tx.status].color}`}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#94a3b8] group-hover:text-[#E91E8C] transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedTransaction(null)}>
          <div
            className="bg-white rounded-xl p-6 max-w-md mx-4 max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-lg ${typeConfig[selectedTransaction.type].color.replace("text-", "bg-").replace("600", "50")}`}>
                {(() => {
                  const Icon = typeConfig[selectedTransaction.type].icon;
                  return <Icon className={`w-6 h-6 ${typeConfig[selectedTransaction.type].color}`} />;
                })()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0D1B2A]">{typeConfig[selectedTransaction.type].label}</h2>
                <p className="text-sm text-[#64748b]">{selectedTransaction.description}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center pb-4 border-b border-[#e8edf2]">
                <p className="text-[#64748b]">Amount</p>
                <p className={`font-bold text-lg ${selectedTransaction.type === "withdrawal" ? "text-red-600" : "text-green-600"}`}>
                  {selectedTransaction.type === "withdrawal" ? "-" : "+"}{formatCurrencyAmount(selectedTransaction.amount, selectedTransaction.currency)}
                </p>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-[#e8edf2]">
                <p className="text-[#64748b]">Status</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = statusConfig[selectedTransaction.status].icon;
                    return <Icon className={`w-5 h-5 ${statusConfig[selectedTransaction.status].color}`} />;
                  })()}
                  <p className={`font-semibold ${statusConfig[selectedTransaction.status].color}`}>
                    {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-[#e8edf2]">
                <p className="text-[#64748b]">Date</p>
                <p className="font-semibold text-[#0D1B2A]">{new Date(selectedTransaction.date).toLocaleString()}</p>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-[#e8edf2]">
                <p className="text-[#64748b]">Reference</p>
                <p className="font-mono text-sm font-semibold text-[#0D1B2A]">{selectedTransaction.reference}</p>
              </div>

              {selectedTransaction.method && (
                <div className="flex justify-between items-center pb-4 border-b border-[#e8edf2]">
                  <p className="text-[#64748b]">Method</p>
                  <p className="font-semibold text-[#0D1B2A]">{selectedTransaction.method}</p>
                </div>
              )}

              {selectedTransaction.fee && (
                <div className="flex justify-between items-center pb-4 border-b border-[#e8edf2]">
                  <p className="text-[#64748b]">Fee</p>
                  <p className="font-semibold text-[#0D1B2A]">{formatCurrencyAmount(selectedTransaction.fee, selectedTransaction.currency)}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              className="w-full py-3 bg-[#E91E8C] text-white font-bold rounded-lg hover:bg-[#C4166F] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
