"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a number", ok: /[0-9]/.test(password) },
    { label: "Contains a special character", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    { label: "Contains a letter", ok: /[A-Za-z]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const bar = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-emerald-500"][score];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? bar : "bg-slate-200"}`} />
        ))}
      </div>
      <div className="space-y-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-green-600" : "text-slate-400"}`}>
            <CheckCircle2 className={`h-3 w-3 ${c.ok ? "text-green-600" : "text-slate-300"}`} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 8) { toast.error("Password too short"); return; }
    if (!/[0-9]/.test(password)) { toast.error("Add at least one number"); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) { toast.error("Add at least one special character"); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      toast.success("Password updated!");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Invalid or expired reset link";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-600 mb-4">Invalid reset link.</p>
        <Link href="/auth/forgot-password" className="text-blue-600 underline">Request a new one</Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      {done ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Password updated!</h2>
          <p className="text-slate-500 text-sm mb-6">You can now sign in with your new password.</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Go to Login
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Set new password</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6">
            Choose a strong password with at least one number and one special character.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 pr-12"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-sm bg-slate-50 ${
                  confirm && confirm !== password
                    ? "border-red-400 focus:ring-red-400"
                    : "border-slate-200 focus:ring-blue-500"
                }`}
                placeholder="Repeat new password"
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || password !== confirm || password.length < 8}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : "Update password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <FlaskConical className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TestZoo</h1>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl p-8 text-center">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
