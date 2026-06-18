"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { access_token, user_type, user_id, full_name } = res.data;
      localStorage.setItem("tz_token", access_token);
      localStorage.setItem("tz_user", JSON.stringify({ user_id, user_type, full_name, email }));
      toast.success(`Welcome back, ${full_name.split(" ")[0]}!`);
      router.push(user_type === "doctor" ? "/doctor/chat" : "/patient/orders");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Invalid credentials";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <FlaskConical className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TestZoo</h1>
          <p className="text-blue-200 text-sm mt-1">Diagnostic Test Marketplace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Sign in</h2>
          <p className="text-slate-500 text-sm mb-6">Enter your credentials to access your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                placeholder="doctor@hospital.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
            </button>
          </form>

          <div className="mt-5 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Demo accounts</p>
            <button
              onClick={() => { setEmail("dr.mehta@testzoo.demo"); setPassword("Doctor@123"); }}
              className="w-full text-left text-xs text-slate-500 hover:text-blue-600 py-0.5 transition-colors"
            >
              🩺 Doctor: dr.mehta@testzoo.demo
            </button>
            <button
              onClick={() => { setEmail("patient.ravi@testzoo.demo"); setPassword("Patient@123"); }}
              className="w-full text-left text-xs text-slate-500 hover:text-blue-600 py-0.5 transition-colors"
            >
              👤 Patient: patient.ravi@testzoo.demo
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-5">
            No account?{" "}
            <Link href="/auth/register" className="text-blue-600 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
