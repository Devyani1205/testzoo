"use client";
import { useEffect, useState } from "react";
import { Wallet, Share2, Copy, TrendingUp, Users, MousePointer, Loader2, Info } from "lucide-react";
import { walletApi } from "@/lib/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function WalletPage() {
  const [wallet, setWallet] = useState<Record<string, unknown> | null>(null);
  const [referral, setReferral] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([walletApi.balance(), walletApi.referral()])
      .then(([wb, wr]) => { setWallet(wb.data); setReferral(wr.data); })
      .catch(() => toast.error("Failed to load wallet"))
      .finally(() => setLoading(false));
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(String(text));
    toast.success("Copied to clipboard!");
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const balance = Number(wallet?.balance || 0);
  const referralCode = String(referral?.referral_code || "");
  const totalEarned = Number(referral?.total_earned || 0);
  const conversions = Number(referral?.conversions || 0);
  const clicks = Number(referral?.clicks || 0);
  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/register?ref=${referralCode}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-blue-600" /> Wallet & Rewards
        </h1>
        <p className="text-slate-500 text-sm mt-1">Your TestZoo wallet balance and referral program</p>
      </div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white rounded-2xl p-6 shadow-lg"
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />

        <p className="text-blue-200 text-sm font-medium mb-1 relative z-10">Available Balance</p>
        <p className="text-4xl font-bold mb-4 relative z-10">₹{balance.toLocaleString()}</p>

        <div className="flex flex-wrap gap-4 text-sm text-blue-100 relative z-10">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Earn 5% cashback on every order
          </span>
          <span className="flex items-center gap-1.5">
            <Share2 className="h-4 w-4" />
            ₹500 per referral conversion
          </span>
        </div>
      </motion.div>

      {/* How to use wallet */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">How to use your wallet</p>
          <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
            <li>Wallet credits are applied automatically at patient checkout</li>
            <li>Patients can use up to 100% of order value from wallet</li>
            <li>Cashback credits within 24 hours of confirmed payment</li>
          </ul>
        </div>
      </div>

      {/* Referral section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-purple-600" /> Referral Program
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Share your code and <strong>both you and your friend earn ₹500</strong> wallet credit!
        </p>

        {/* Code */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-slate-500 mb-1 font-medium">Your referral code</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono text-slate-800 tracking-wide">{referralCode}</span>
            <button
              onClick={() => copy(referralCode)}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Copy referral code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Share link */}
        <div className="flex gap-2 mb-4">
          <input
            readOnly
            value={referralLink}
            className="flex-1 px-3 py-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl truncate"
          />
          <button
            onClick={() => copy(referralLink)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
          >
            Copy
          </button>
          <a
            href={`https://wa.me/?text=Join%20TestZoo%20with%20my%20referral%20code%20${referralCode}%3A%20${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Earned", value: `₹${totalEarned.toLocaleString()}`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
            { label: "Conversions", value: conversions, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Clicks", value: clicks, icon: MousePointer, color: "text-purple-600 bg-purple-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-2`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Commission info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">💡 Doctor Commission Structure</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 30% of lab commission on every paid order from your recommendations</li>
          <li>• Commission credited to wallet within 7 days of test completion</li>
          <li>• View detailed commission breakdown in the Dashboard</li>
        </ul>
      </div>
    </div>
  );
}
