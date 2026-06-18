"use client";
import { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, Users, IndianRupee, Percent,
  Bell, Download, Loader2, CheckCircle, Clock, AlertCircle,
} from "lucide-react";
import { dashboardApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  recommended:    { bg: "bg-slate-100",   text: "text-slate-700",  label: "Recommended" },
  sent:           { bg: "bg-amber-100",   text: "text-amber-800",  label: "Sent" },
  patient_viewed: { bg: "bg-blue-100",    text: "text-blue-800",   label: "Viewed" },
  paid:           { bg: "bg-green-100",   text: "text-green-800",  label: "Paid" },
  completed:      { bg: "bg-emerald-100", text: "text-emerald-800",label: "Completed" },
  cancelled:      { bg: "bg-red-100",     text: "text-red-700",    label: "Cancelled" },
};

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DoctorDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setData(r.data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemind(recId: string) {
    setReminding(recId);
    try {
      await dashboardApi.remind(recId);
      toast.success("WhatsApp reminder sent!");
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setReminding(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await dashboardApi.exportCsv();
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `testzoo_recommendations_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const kpis = data.kpis as Record<string, number>;
  const monthlyTrend = (data.monthly_trend as Record<string, unknown>[]) || [];
  const topTests = ((data.top_tests as Record<string, unknown>[]) || []).map((t) => ({
    ...t,
    short_name: String(t.test_name || "").length > 14
      ? String(t.test_name || "").slice(0, 12) + "…"
      : t.test_name,
  }));
  const allRecs = (data.recent_recommendations as Record<string, unknown>[]) || [];

  // Deduplicate by unique rec id only
  const seenIds = new Set<string>();
  const recs = allRecs.filter((r) => {
    const id = r.id as string;
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  const kpiCards = [
    {
      label: "Recommendations",
      value: kpis.total_recommendations ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Conversions",
      value: kpis.paid_conversions ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      label: "Conversion Rate",
      value: `${Number(kpis.conversion_rate ?? 0).toFixed(1)}%`,
      icon: Percent,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "Commission Earned",
      value: `₹${Number(kpis.total_commission_earned ?? 0).toLocaleString()}`,
      icon: IndianRupee,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" /> Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Recommendation analytics and performance metrics</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-white rounded-2xl p-5 border ${k.border} shadow-sm`}
          >
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" /> Monthly Trends
          </h3>
          {monthlyTrend.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No trend data available yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="recommendations" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="Recommendations" />
                <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Tests */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Top Tests</h3>
          {topTests.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No test data available yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topTests} margin={{ top: 5, right: 5, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="short_name"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} name="Recommendations" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recommendations table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Recent Recommendations</h3>
          <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
            {recs.length} records
          </span>
        </div>

        {recs.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No recommendations yet</p>
            <p className="text-slate-400 text-xs mt-1">Use AI Search to recommend tests to your patients</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Test</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recs.map((r) => {
                  const sc = STATUS_COLORS[r.status as string] || { bg: "bg-slate-100", text: "text-slate-700", label: String(r.status) };
                  const phone = String(r.patient_phone || "");
                  const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
                  return (
                    <tr key={r.id as string} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{r.patient_name as string || "Anonymous"}</p>
                        <p className="text-xs text-slate-400">{normalizedPhone ? `+91 ${normalizedPhone}` : "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700 max-w-52 truncate text-xs font-medium">{r.test_name as string}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {new Date(r.created_at as string).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        {["sent", "patient_viewed", "recommended"].includes(r.status as string) && (
                          <button
                            onClick={() => handleRemind(r.id as string)}
                            disabled={reminding === (r.id as string)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {reminding === (r.id as string)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Bell className="h-3 w-3" />}
                            Remind
                          </button>
                        )}
                        {r.status === "paid" && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3" /> Converted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
