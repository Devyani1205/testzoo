"use client";
import { useEffect, useState } from "react";
import { Package, CheckCircle, Clock, FileText, Loader2, ArrowRight, CreditCard, AlertCircle, TestTube2 } from "lucide-react";
import { ordersApi } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle; label: string }> = {
  pending:          { color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: Clock,       label: "Pending" },
  paid:             { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    icon: CheckCircle, label: "Paid" },
  sample_collected: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200",icon: TestTube2,   label: "Sample Collected" },
  processing:       { color: "text-orange-700", bg: "bg-orange-50 border-orange-200",icon: Clock,       label: "Processing" },
  report_ready:     { color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: FileText,    label: "Report Ready" },
  completed:        { color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",icon: CheckCircle,label: "Completed" },
};

const PAYMENT_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: "text-amber-700 bg-amber-50", label: "Payment Pending" },
  paid:    { color: "text-green-700 bg-green-50",  label: "Paid" },
  failed:  { color: "text-red-700 bg-red-50",      label: "Failed" },
};

type Order = {
  order_id: string;
  test_name: string;
  lab_name: string;
  final_amount: number;
  patient_price: number;
  payment_status: string;
  order_status: string;
  payment_method: string;
  created_at: string;
  turnaround_days?: number;
  sample_type?: string;
  clinical_reasoning?: string;
};

export default function PatientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.myOrders()
      .then(r => setOrders(r.data.orders || []))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" /> My Orders
        </h1>
        <p className="text-slate-500 text-sm mt-1">All diagnostic tests ordered via your doctor's WhatsApp links</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Package className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-slate-700 font-semibold text-lg mb-1">No orders yet</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            When your doctor shares a diagnostic test link via WhatsApp and you complete checkout, orders will appear here.
          </p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-left max-w-sm mx-auto">
            <p className="text-xs font-semibold text-blue-700 mb-1">💡 How it works</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>Your doctor finds the right test on TestZoo AI</li>
              <li>Doctor shares a personalised link via WhatsApp</li>
              <li>You click the link and complete secure checkout</li>
              <li>Your order appears here with tracking</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => {
            const statusCfg = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
            const paymentCfg = PAYMENT_CONFIG[order.payment_status] || PAYMENT_CONFIG.pending;
            const StatusIcon = statusCfg.icon;

            return (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 leading-snug">{order.test_name}</h3>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">{order.lab_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${paymentCfg.color}`}>
                        {paymentCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                    <span>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {order.sample_type && <span>· {order.sample_type}</span>}
                    {order.turnaround_days && <span>· {order.turnaround_days}d turnaround</span>}
                    <span>· {order.payment_method?.toUpperCase()}</span>
                  </div>

                  {/* Clinical reasoning */}
                  {order.clinical_reasoning && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-3">
                      <p className="text-xs text-slate-600 italic">"{order.clinical_reasoning}"</p>
                    </div>
                  )}

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-slate-900">₹{order.final_amount.toLocaleString()}</span>
                      {order.final_amount < order.patient_price && (
                        <span className="text-xs text-slate-400 ml-2 line-through">₹{order.patient_price.toLocaleString()}</span>
                      )}
                    </div>
                    {order.payment_status === "pending" && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <AlertCircle className="h-3 w-3" /> Payment pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-slate-100">
                  <Link
                    href={`/patient/track/${order.order_id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
                  >
                    <Package className="h-3.5 w-3.5" /> Track Order
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  {order.payment_status === "pending" && (
                    <Link
                      href={`/patient/track/${order.order_id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Pay Now
                    </Link>
                  )}
                  {order.order_status === "completed" && (
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors">
                      <FileText className="h-3.5 w-3.5" /> Download Report
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
