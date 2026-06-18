"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Stethoscope, User, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "≥8 characters", ok: password.length >= 8 },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special character", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  return (
    <div className="mt-1.5 flex items-center gap-3">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 w-8 rounded-full transition-colors ${
            i < score
              ? score === 1 ? "bg-red-400" : score === 2 ? "bg-yellow-400" : "bg-green-500"
              : "bg-slate-200"
          }`} />
        ))}
      </div>
      <div className="flex gap-2">
        {checks.map(c => (
          <span key={c.label} className={`text-xs flex items-center gap-0.5 ${c.ok ? "text-green-600" : "text-slate-400"}`}>
            <CheckCircle2 className="h-3 w-3" /> {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") || "doctor";
  const refCode = searchParams.get("ref") || "";

  const [userType, setUserType] = useState<"doctor" | "patient">(defaultType as "doctor" | "patient");
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", phone: "",
    specialty: "Medical Oncology", hospital_name: "", license_number: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(er => ({ ...er, [k]: "" }));
  };

  const validateName = (v: string) => {
    if (/[^A-Za-z\s.\-']/.test(v)) return "Name must contain letters only";
    return "";
  };
  const validatePhone = (v: string) => {
    const d = v.replace(/\D/g, "");
    if (v && d.length !== 10) return "Phone must be exactly 10 digits";
    return "";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const nameErr = validateName(form.full_name);
    if (nameErr) errs.full_name = nameErr;
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;
    if (!/[0-9]/.test(form.password)) errs.password = "Must include at least one number";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password)) errs.password = "Must include at least one special character";
    if (form.password.length < 8) errs.password = "Must be at least 8 characters";

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        user_type: userType,
        phone: form.phone.replace(/\D/g, ""),
      };
      const res = await authApi.register(payload);
      const { access_token, user_type: ut, user_id, full_name } = res.data;
      localStorage.setItem("tz_token", access_token);
      localStorage.setItem("tz_user", JSON.stringify({ user_id, user_type: ut, full_name, email: form.email }));
      if (refCode) {
        try {
          const { walletApi } = await import("@/lib/api");
          await walletApi.applyReferral(refCode);
          toast.success("Referral code applied! ₹500 added to your wallet.");
        } catch {}
      }
      toast.success(`Welcome to TestZoo, ${full_name.split(" ")[0]}!`);
      router.push(ut === "doctor" ? "/doctor/chat" : "/patient/orders");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | { msg: string }[] } } })?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail as string) || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Create account</h2>
      <p className="text-slate-500 text-sm mb-5">Join TestZoo's diagnostic marketplace</p>

      {/* Type toggle */}
      <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl">
        {(["doctor", "patient"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setUserType(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              userType === t ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "doctor" ? <Stethoscope className="h-4 w-4" /> : <User className="h-4 w-4" />}
            {t === "doctor" ? "I'm a Doctor" : "I'm a Patient"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name — letters only */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => {
              if (/[^A-Za-z\s.\-']/.test(e.target.value)) {
                setErrors(er => ({ ...er, full_name: "Letters and spaces only" }));
                return;
              }
              setForm(f => ({ ...f, full_name: e.target.value }));
              setErrors(er => ({ ...er, full_name: "" }));
            }}
            required
            pattern="[A-Za-z\s.\-']+"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-sm bg-slate-50 ${errors.full_name ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"}`}
            placeholder="Dr. Priya Mehta"
          />
          {errors.full_name && <p className="text-xs text-red-500 mt-1">⚠ {errors.full_name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
            placeholder="doctor@hospital.com"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              required
              minLength={8}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-sm bg-slate-50 pr-12 ${errors.password ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"}`}
              placeholder="Min 8 chars, 1 number, 1 special"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.password && <PasswordStrength password={form.password} />}
          {errors.password && <p className="text-xs text-red-500 mt-1">⚠ {errors.password}</p>}
        </div>

        {/* Phone — integers only */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone (10 digits)</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 10);
              setForm(f => ({ ...f, phone: d }));
              setErrors(er => ({ ...er, phone: d && d.length !== 10 ? "Must be exactly 10 digits" : "" }));
            }}
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-sm bg-slate-50 ${errors.phone ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"}`}
            placeholder="10-digit mobile number"
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">⚠ {errors.phone}</p>}
          <p className="text-xs text-slate-400 mt-1">Numbers only — no spaces or dashes</p>
        </div>

        {/* Doctor-only fields */}
        {userType === "doctor" && (
          <>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Specialty</label>
              <select value={form.specialty} onChange={set("specialty")} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50">
                {["Medical Oncology", "Surgical Oncology", "Pulmonology", "Pathology", "Hematology", "Radiology", "General Medicine"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hospital / Clinic</label>
              <input type="text" value={form.hospital_name} onChange={set("hospital_name")}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                placeholder="Apollo Hospitals, Mumbai" />
            </div>
          </>
        )}

        {refCode && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            Referral code <strong>{refCode}</strong> applied — you'll get ₹500 wallet credit!
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-5">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <FlaskConical className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TestZoo</h1>
          <p className="text-blue-200 text-sm mt-1">Diagnostic Test Marketplace</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl p-8">Loading…</div>}>
          <RegisterForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
