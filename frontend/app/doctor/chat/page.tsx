"use client";
import { useState, useRef, useEffect } from "react";
import {
  CopilotKit,
} from "@copilotkit/react-core";
import {
  useCopilotAction,
  useCopilotReadable,
} from "@copilotkit/react-core";
import {
  Send, Loader2, FlaskConical, Share2, ExternalLink,
  Clock, TestTube2, X, Filter, ChevronDown, ChevronUp,
  Phone, User, MessageSquare, CheckCircle2, Search,
} from "lucide-react";
import { chatApi } from "@/lib/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────
type TestCard = {
  test_id: string; name: string; lab_name: string; category: string;
  mrp: number; patient_price: number; discount_percent: number; savings: number;
  turnaround_days: number; sample_type: string; is_sponsored: boolean;
  biomarkers: string[]; description: string;
};

type Filters = {
  minPrice: number; maxPrice: number;
  cancerType: string; lab: string;
};

// ─── Biomarker pills ────────────────────────────────────────────────────────
function BiomarkerPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
      {label}
    </span>
  );
}

// ─── SkeletonCard ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/3 mb-4" />
      <div className="h-8 bg-slate-200 rounded w-1/2 mb-3" />
      <div className="flex gap-2 mb-3">
        <div className="h-5 bg-slate-100 rounded-full w-12" />
        <div className="h-5 bg-slate-100 rounded-full w-16" />
      </div>
      <div className="flex gap-1 mb-4">
        <div className="h-5 bg-violet-50 rounded-full w-20" />
        <div className="h-5 bg-violet-50 rounded-full w-16" />
        <div className="h-5 bg-violet-50 rounded-full w-14" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 bg-slate-200 rounded-xl flex-1" />
        <div className="h-9 bg-slate-100 rounded-xl w-20" />
      </div>
    </div>
  );
}

// ─── TestCard ───────────────────────────────────────────────────────────────
function TestCardComponent({ card, onShare }: { card: TestCard; onShare: (c: TestCard) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-slate-800 text-sm leading-snug">{card.name}</h3>
          <p className="text-xs text-blue-600 font-medium mt-0.5">{card.lab_name}</p>
        </div>
        <span className="flex-shrink-0 text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full border border-blue-100">
          {card.category}
        </span>
      </div>

      {/* Pricing */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-slate-900">₹{card.patient_price.toLocaleString()}</span>
        <span className="text-sm text-slate-400 line-through">₹{card.mrp.toLocaleString()}</span>
        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full ml-1">
          {card.discount_percent.toFixed(0)}% off
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-3">
        <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full">
          <Clock className="h-3 w-3" /> {card.turnaround_days}d TAT
        </span>
        <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full">
          <TestTube2 className="h-3 w-3" /> {card.sample_type}
        </span>
      </div>

      {/* Biomarkers */}
      {card.biomarkers?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(expanded ? card.biomarkers : card.biomarkers.slice(0, 5)).map(b => (
            <BiomarkerPill key={b} label={b} />
          ))}
          {!expanded && card.biomarkers.length > 5 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
            >
              +{card.biomarkers.length - 5} more
            </button>
          )}
        </div>
      )}

      {/* Description */}
      {expanded && (
        <p className="text-xs text-slate-500 mb-3 leading-relaxed border-t pt-2">{card.description}</p>
      )}

      {/* Savings callout */}
      <p className="text-xs text-emerald-600 font-medium mb-3">
        Patient saves ₹{card.savings.toLocaleString()} with TestZoo
      </p>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={() => onShare(card)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" /> Share via WhatsApp
        </button>
        <button
          onClick={() => setExpanded(e => !e)}
          className="inline-flex items-center justify-center gap-1 px-3 py-2.5 border border-slate-200 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Details
        </button>
      </div>
    </motion.div>
  );
}

// ─── TestCardGrid (rendered by CopilotKit action) ────────────────────────────
function TestCardGrid({
  cards, onShare, filters, status,
}: {
  cards?: TestCard[];
  onShare: (c: TestCard) => void;
  filters: Filters;
  status: "inProgress" | "complete" | "executing";
}) {
  if (status === "inProgress" || status === "executing") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!cards?.length) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center mt-2">
        <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No tests found</p>
        <p className="text-slate-400 text-sm mt-1">Try a different query or broader search terms</p>
      </div>
    );
  }

  const filtered = cards.filter(c => {
    const price = c.patient_price;
    if (filters.minPrice > 0 && price < filters.minPrice) return false;
    if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
    if (filters.cancerType && !c.category.toLowerCase().includes(filters.cancerType.toLowerCase()) && !c.name.toLowerCase().includes(filters.cancerType.toLowerCase())) return false;
    if (filters.lab && !c.lab_name.toLowerCase().includes(filters.lab.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mt-2">
      <p className="text-xs text-slate-400 mb-3">
        {filtered.length} test{filtered.length !== 1 ? "s" : ""} found
        {filtered.length !== cards.length && ` (filtered from ${cards.length})`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <TestCardComponent key={c.test_id} card={c} onShare={onShare} />
        ))}
      </div>
    </div>
  );
}

// ─── Share Modal ────────────────────────────────────────────────────────────
function ShareModal({
  card, onClose,
}: {
  card: TestCard;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [patientName, setPatientName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    if (raw && raw.length !== 10) setPhoneError("Must be exactly 10 digits");
    else setPhoneError("");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/[^A-Za-z\s.\-']/.test(val)) {
      setNameError("Only letters and spaces allowed");
      return;
    }
    setPatientName(val);
    setNameError("");
  };

  const handleShare = async () => {
    if (!phone || phone.length !== 10) { setPhoneError("Enter a valid 10-digit number"); return; }
    if (nameError) return;
    setLoading(true);
    try {
      await chatApi.share(card.test_id, `+91${phone}`, patientName, notes);
      setSent(true);
      toast.success("Shared via WhatsApp!");
    } catch {
      toast.error("Failed to share. Check phone number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-base">Share Test</h2>
              <p className="text-blue-100 text-xs mt-0.5 truncate max-w-xs">{card.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg mb-2">Sent Successfully!</h3>
            <p className="text-slate-500 text-sm mb-1">WhatsApp link sent to +91 {phone}</p>
            <p className="text-slate-400 text-xs">Patient will receive a personalised checkout link</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              Close
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Test mini summary */}
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{card.lab_name}</p>
                <p className="text-xs text-slate-500">{card.sample_type} · {card.turnaround_days}d TAT</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-slate-900">₹{card.patient_price.toLocaleString()}</p>
                <p className="text-xs text-emerald-600">Save ₹{card.savings.toLocaleString()}</p>
              </div>
            </div>

            {/* Phone — integers only, 10 digits */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Patient WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-sm text-slate-600 font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  className={`flex-1 px-3 py-2.5 border rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${phoneError ? "border-red-400 focus:ring-red-400" : "border-slate-200"}`}
                />
              </div>
              {phoneError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><span>⚠</span>{phoneError}</p>}
              <p className="text-xs text-slate-400 mt-1">Numbers only — no spaces or special chars</p>
            </div>

            {/* Patient name — letters only */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Patient Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={patientName}
                  onChange={handleNameChange}
                  placeholder="Letters only"
                  pattern="[A-Za-z\s.\-']+"
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameError ? "border-red-400 focus:ring-red-400" : "border-slate-200"}`}
                />
              </div>
              {nameError && <p className="text-xs text-red-500 mt-1">⚠ {nameError}</p>}
              <p className="text-xs text-slate-400 mt-1">No numbers or special characters allowed</p>
            </div>

            {/* Clinical notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Clinical Notes (optional)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Why you're recommending this test…"
                  rows={2}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={loading || phone.length !== 10}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              {loading ? "Sending…" : "Send WhatsApp Link"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── FilterPanel ────────────────────────────────────────────────────────────
function FilterPanel({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const [open, setOpen] = useState(false);
  const CANCER_TYPES = ["", "Lung", "Breast", "Colon", "Prostate", "Blood", "Liver", "Pancreatic", "Ovarian", "Lymphoma"];
  const LABS = ["", "MedGenomics India", "LabCorp Oncology", "Quest Diagnostics", "Geneprint Labs", "Molecular Path Lab"];

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
      >
        <Filter className="h-4 w-4" />
        Filters
        {(filters.minPrice || filters.maxPrice || filters.cancerType || filters.lab) ? (
          <span className="w-2 h-2 rounded-full bg-blue-600" />
        ) : null}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
              {/* Price Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Price Range (₹)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice || ""}
                    onChange={e => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-400 text-xs">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice || ""}
                    onChange={e => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cancer Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Cancer Type</label>
                <select
                  value={filters.cancerType}
                  onChange={e => setFilters({ ...filters, cancerType: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {CANCER_TYPES.map(t => <option key={t} value={t}>{t || "All Types"}</option>)}
                </select>
              </div>

              {/* Lab */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Lab</label>
                <select
                  value={filters.lab}
                  onChange={e => setFilters({ ...filters, lab: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {LABS.map(l => <option key={l} value={l}>{l || "All Labs"}</option>)}
                </select>
              </div>

              {/* Reset */}
              <div className="sm:col-span-3 flex justify-end">
                <button
                  onClick={() => setFilters({ minPrice: 0, maxPrice: 0, cancerType: "", lab: "" })}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CopilotKit inner component ─────────────────────────────────────────────
function DoctorChatInner() {
  const [messages, setMessages] = useState<{ id: string; role: "user" | "assistant"; text: string }[]>([
    { id: "0", role: "assistant", text: "Hello! Describe your patient's case and I'll find the most relevant diagnostic tests. Include symptoms, suspected diagnosis, and any relevant history." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareCard, setShareCard] = useState<TestCard | null>(null);
  const [filters, setFilters] = useState<Filters>({ minPrice: 0, maxPrice: 0, cancerType: "", lab: "" });
  const [generativeCards, setGenerativeCards] = useState<TestCard[] | null>(null);
  const [generativeStatus, setGenerativeStatus] = useState<"inProgress" | "complete" | "executing">("complete");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Give the AI context about available categories
  useCopilotReadable({
    description: "Available oncology test categories in TestZoo catalog",
    value: "EGFR, ALK/ROS1, BRCA1/2, HER2, NGS Panel, KRAS/NRAS, PDL1, ctDNA, CMA, Oncotype DX, BCR-ABL, MSI/MMR. Labs: MedGenomics India, LabCorp Oncology, Quest Diagnostics, Geneprint Labs, Molecular Path Lab.",
  });

  useCopilotReadable({
    description: "Doctor context — current filters",
    value: JSON.stringify(filters),
  });

  // CopilotKit action — search tests and render cards generatively
  useCopilotAction({
    name: "search_diagnostic_tests",
    description: "Search TestZoo catalog for diagnostic tests based on clinical description, symptoms, or cancer type. Returns matching tests as interactive cards.",
    parameters: [
      { name: "query", type: "string", description: "Clinical query describing patient symptoms, diagnosis, or test need" },
      { name: "cancer_type", type: "string", description: "Cancer type if known (e.g. lung, breast, colon)", required: false },
      { name: "max_results", type: "number", description: "Max results to return (default 6)", required: false },
    ],
    render: ({ args, result, status }) => (
      <div className="my-2">
        {status !== "complete" ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Searching TestZoo catalog for: <span className="font-medium text-slate-700">"{args.query}"</span>
          </div>
        ) : null}
        <TestCardGrid
          cards={(result as { cards?: TestCard[] })?.cards}
          onShare={setShareCard}
          filters={filters}
          status={status}
        />
      </div>
    ),
    handler: async ({ query }: { query: string; cancer_type?: string; max_results?: number }) => {
      try {
        const resp = await chatApi.query(query);
        return resp.data;
      } catch {
        return { cards: [], message: "Failed to search catalog." };
      }
    },
  });

  // CopilotKit action — summarise a test for a patient
  useCopilotAction({
    name: "explain_test",
    description: "Provide a patient-friendly explanation of why a specific test is recommended for this case.",
    parameters: [
      { name: "test_name", type: "string", description: "Name of the diagnostic test" },
      { name: "clinical_reason", type: "string", description: "Why this test is relevant to the patient" },
    ],
    render: ({ args, status }) => (
      <div className="my-2 bg-blue-50 border border-blue-100 rounded-xl p-4">
        {status === "inProgress" ? (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating explanation…
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-blue-700 mb-1">📋 Test Explanation Ready</p>
            <p className="text-sm text-blue-800 font-medium">{args.test_name}</p>
            <p className="text-xs text-blue-600 mt-1">{args.clinical_reason}</p>
          </>
        )}
      </div>
    ),
    handler: async ({ test_name, clinical_reason }: { test_name: string; clinical_reason: string }) => {
      return { test_name, clinical_reason, generated: true };
    },
  });

  // Regular send handler (non-CopilotKit fallback for quick queries)
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    const msgId = Date.now().toString();
    setMessages(m => [...m, { id: msgId, role: "user", text: q }]);
    setLoading(true);
    setGenerativeStatus("inProgress");
    setGenerativeCards(null);

    try {
      const resp = await chatApi.query(q);
      const d = resp.data;

      setMessages(m => [...m, {
        id: `ai-${msgId}`,
        role: "assistant",
        text: d.message || "Here are the most relevant tests:",
      }]);
      setGenerativeCards(d.cards || []);
    } catch {
      setMessages(m => [...m, { id: `err-${msgId}`, role: "assistant", text: "Failed to search. Please try again." }]);
    } finally {
      setLoading(false);
      setGenerativeStatus("complete");
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generativeCards]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-blue-600" /> AI Diagnostic Search
        </h1>
        <p className="text-slate-500 text-sm mt-1">Describe your patient's case — AI finds the best companion diagnostics</p>
      </div>

      {/* Filters */}
      <FilterPanel filters={filters} setFilters={setFilters} />

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4 mb-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-slate-100 text-slate-800 rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Generative test cards */}
        {(generativeCards !== null || generativeStatus === "inProgress") && (
          <div className="w-full">
            <TestCardGrid
              cards={generativeCards || undefined}
              onShare={setShareCard}
              filters={filters}
              status={generativeStatus}
            />
          </div>
        )}

        {loading && generativeStatus === "inProgress" && !generativeCards && (
          <div className="flex items-center gap-2 text-sm text-slate-500 pl-1">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Searching TestZoo catalog…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="e.g. Patient with NSCLC, suspected EGFR mutation, FFPE tissue available…"
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {shareCard && (
          <ShareModal card={shareCard} onClose={() => setShareCard(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main export — wrap with CopilotKit provider ────────────────────────────
export default function DoctorChatPage() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <DoctorChatInner />
    </CopilotKit>
  );
}
