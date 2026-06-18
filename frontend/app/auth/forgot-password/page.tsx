"use client";
import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <FlaskConical className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TestZoo</h1>
          <p className="text-blue-200 text-sm mt-1">Diagnostic Test Marketplace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm mb-2">
                If <strong>{email}</strong> is registered, we've sent a password reset link.
              </p>
              <p className="text-slate-400 text-xs mb-6">
                Didn't get it? Check your spam folder or try again in a few minutes.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/auth/login" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h2 className="text-xl font-bold text-slate-800">Forgot password?</h2>
              </div>
              <p className="text-slate-500 text-sm mb-6 ml-8">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send reset link"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-5">
                Remembered it?{" "}
                <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
