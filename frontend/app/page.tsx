"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { FlaskConical, Stethoscope, CreditCard, MessageCircle, BarChart3, Shield, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  { icon: MessageCircle, title: "AI Conversational Search", desc: "Doctors describe patient cases in natural language. AI extracts clinical intent and surfaces the most relevant companion diagnostics." },
  { icon: FlaskConical, title: "500+ Diagnostic Tests", desc: "Curated catalog from top-tier NABL-accredited labs with B2B pricing, sponsored results, and real-time availability." },
  { icon: CreditCard, title: "Flexible Payments", desc: "Card, UPI, Net Banking, COD, in-app wallet, promo codes, and referral rewards — every payment method covered." },
  { icon: MessageCircle, title: "WhatsApp Sharing", desc: "One click sends a personalized test link to the patient's WhatsApp. Track delivery, views, and payment status." },
  { icon: BarChart3, title: "Doctor Analytics Dashboard", desc: "KPIs, conversion rates, monthly trends, top tests, commission tracking, and CSV export — all in one place." },
  { icon: Shield, title: "FastMCP Architecture", desc: "Backend exposed as 5 FastMCP servers for catalog, orders, payments, dashboard, and patient portal." },
];

const steps = [
  { num: "01", title: "Doctor searches", desc: "Enter patient case → AI finds the best diagnostic tests" },
  { num: "02", title: "Share on WhatsApp", desc: "Click 'Share' → Patient receives personalized link instantly" },
  { num: "03", title: "Patient pays", desc: "Patient opens link, selects payment method, pays online" },
  { num: "04", title: "Sample collection", desc: "Phlebotomist visits home → Report delivered digitally" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">TestZoo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Log in</Link>
            <Link href="/auth/register" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden tz-gradient text-white py-28 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block px-4 py-1.5 bg-white/20 text-sm font-medium rounded-full mb-6">AI-Powered Diagnostic Marketplace</span>
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
              The smartest way to<br />
              <span className="text-cyan-300">order diagnostic tests</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
              Doctors find the right companion diagnostic in seconds. Patients pay with a WhatsApp link. Labs get connected to more orders.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register?type=doctor" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
                <Stethoscope className="h-5 w-5" /> I'm a Doctor <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/register?type=patient" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-800/50 text-white font-semibold rounded-xl hover:bg-blue-800/70 transition-colors border border-white/20">
                I'm a Patient <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="w-14 h-14 rounded-2xl tz-gradient text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">{s.num}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Everything you need</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">A complete diagnostic marketplace built on FastMCP architecture with AI-powered search and generative UI.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 tz-card-hover">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-blue-100 mb-8">Join TestZoo and transform how diagnostic tests are prescribed and fulfilled.</p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-10 px-4 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FlaskConical className="h-5 w-5 text-blue-400" />
          <span className="text-white font-semibold">TestZoo</span>
        </div>
        <p>© 2025 TestZoo. AI-powered diagnostic test marketplace.</p>
      </footer>
    </div>
  );
}
