"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ordersApi } from "@/lib/api";
import {
  FlaskConical, CheckCircle, Clock, ArrowLeft, Loader2,
  CreditCard, TestTube2, FileText, Package,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Step = { step: string; done: boolean; icon: string };

export default function OrderTrackPage() {
  const params = useParams();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    ordersApi.track(params.orderId as string)
      .then(r => setOrder(r.data))
      .catch(() => toast.error("Order not found"))
      .finally(() => setLoading(false));
  }, [params.orderId]);

  async function handlePay() {
    setPaying(true);
    try {
      await ordersApi.confirmPayment(params.orderId as string);
      toast.success("Payment confirmed!");
      const r = await ordersApi.track(params.orderId as string);
      setOrder(r.data);
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-cyan-700 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">Order not found</p>
          <Link href="/patient/orders" className="mt-3 text-blue-600 text-sm hover:underline">Back to orders</Link>
        </div>
      </div>
    );
  }

  const steps = (order.steps as Step[]) || [];
  const paymentPending = order.payment_status === "pending";

  const STEP_ICONS: Record<string, typeof CheckCircle> = {
    "📋": Package, "💳": CreditCard, "🧪": TestTube2,
    "🔬": FlaskConical, "📄": FileText,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-cyan-700 text-white py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href="/patient/orders"
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              <span className="font-bold">TestZoo</span>
            </div>
            <p className="text-blue-200 text-xs mt-0.5">Order Tracking</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Order summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
        >
          <h2 className="font-semibold text-slate-800 mb-1">{order.test_name as string}</h2>
          <p className="text-xs text-blue-600 font-medium mb-3">{order.lab_name as string}</p>
          <p className="text-xs text-slate-400 mb-3">
            Order #{(order.order_id as string).slice(0, 8).toUpperCase()}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Amount</p>
              <p className="font-bold text-slate-900">₹{Number(order.final_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Payment</p>
              <p className="font-medium text-slate-700 capitalize">{String(order.payment_method || "").toUpperCase()}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Order Status</p>
              <p className="font-medium text-slate-700 capitalize">{String(order.order_status || "").replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Payment Status</p>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                order.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}>
                {String(order.payment_status || "pending")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Pay now (if pending) */}
        {paymentPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
          >
            <p className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment Required
            </p>
            <p className="text-xs text-amber-700 mb-3">
              Complete your payment of <strong>₹{Number(order.final_amount).toLocaleString()}</strong> to proceed with sample collection.
            </p>
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {paying ? "Processing…" : `Pay ₹${Number(order.final_amount).toLocaleString()} Now`}
            </button>
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
        >
          <h3 className="font-semibold text-slate-800 mb-6">Order Timeline</h3>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100" />
            <div className="space-y-5">
              {steps.map((step, i) => {
                const StepIcon = STEP_ICONS[step.icon] || CheckCircle;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-4 relative"
                  >
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                      step.done
                        ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-200"
                        : "bg-white border-slate-200"
                    }`}>
                      {step.done
                        ? <CheckCircle className="h-5 w-5 text-white" />
                        : <Clock className="h-4 w-4 text-slate-300" />}
                    </div>
                    <div className="flex-1 pt-2">
                      <p className={`text-sm font-medium ${step.done ? "text-slate-800" : "text-slate-400"}`}>
                        {step.step}
                      </p>
                      {step.done && (
                        <p className="text-xs text-blue-600 mt-0.5">✓ Completed</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Turnaround info */}
        {order.turnaround_days && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
            <span className="font-semibold">Estimated turnaround:</span> {String(order.turnaround_days)} business days from sample collection
          </div>
        )}
      </div>
    </div>
  );
}
