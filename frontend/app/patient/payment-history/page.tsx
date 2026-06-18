"use client";
import { useEffect, useState } from "react";
import { CreditCard, TrendingUp, ArrowUpRight, ArrowDownLeft, Wallet, Loader2, Info } from "lucide-react";
import { ordersApi } from "@/lib/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
};

const TXN_CONFIG: Record<string, { icon: typeof ArrowUpRight; color: string; bg: string; prefix: string }> = {
  cashback:   { icon: TrendingUp,   color: "text-green-600",  bg: "bg-green-50",  prefix: "+" },
  referral:   { icon: ArrowUpRight, color: "text-blue-600",   bg: "bg-blue-50",   prefix: "+" },
  credit:     { icon: ArrowUpRight, color: "text-emerald-600",bg: "bg-emerald-50",prefix: "+" },
  debit:      { icon: ArrowDownLeft,color: "text-red-600",    bg: "bg-red-50",    prefix: "-" },
  payment:    { icon: CreditCard,   color: "text-slate-600",  bg: "bg-slate-100", prefix: "-" },
  promo:      { icon: TrendingUp,   color: "text-purple-600", bg: "bg-purple-50", prefix: "+" },
};

export default function PaymentHistoryPage() {
  const [data, setData] = useState<{ wallet_balance: number; transactions: Transaction[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.paymentHistory()
      .then(r => setData(r.data))
      .catch(() => toast.error("Failed to load payment history"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const balance = data?.wallet_balance || 0;
  const transactions = data?.transactions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600" /> Payment History
        </h1>
        <p className="text-slate-500 text-sm mt-1">Wallet balance, cashback, and all transactions</p>
      </div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white rounded-2xl p-6 shadow-lg"
      >
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-blue-200" />
            <p className="text-blue-200 text-sm font-medium">Wallet Balance</p>
          </div>
          <p className="text-4xl font-bold mb-3">₹{balance.toLocaleString()}</p>
          <p className="text-blue-200 text-xs">
            Earn 5% cashback automatically on every test order
          </p>
        </div>
      </motion.div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <strong>How wallet credits work:</strong> 5% cashback is credited within 24 hours of payment confirmation.
          Credits are applied automatically at next checkout. No expiry.
        </div>
      </div>

      {/* Transaction list */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          Transaction History
          <span className="text-xs font-normal text-slate-400">({transactions.length} records)</span>
        </h2>

        {transactions.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <Wallet className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No transactions yet</p>
            <p className="text-slate-400 text-sm mt-1">Your cashback and wallet activity will appear here</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm divide-y divide-slate-50">
            {transactions.map((txn, i) => {
              const key = txn.type?.toLowerCase() || "credit";
              const cfg = TXN_CONFIG[key] || TXN_CONFIG.credit;
              const Icon = cfg.icon;
              const isCredit = cfg.prefix === "+";

              return (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{txn.description || "Transaction"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(txn.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-bold ${isCredit ? "text-green-600" : "text-slate-800"}`}>
                      {cfg.prefix}₹{Math.abs(txn.amount).toLocaleString()}
                    </p>
                    <p className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} capitalize`}>
                      {txn.type}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
