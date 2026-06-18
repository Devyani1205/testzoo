"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ordersApi } from "@/lib/api";
import { FlaskConical, CreditCard, Smartphone, Building2, Wallet, Banknote, CheckCircle, Loader2, Tag, Clock, TestTube2 } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type CheckoutData = {
  test: { name: string; description: string; category: string; turnaround_days: number; sample_type: string; biomarkers: string[] };
  lab: { name: string; city: string; accreditation: string };
  pricing: { mrp: number; patient_price: number; discount_percent: number; savings: number };
  doctor: { name: string; clinical_reasoning: string };
  payment_methods: { id: string; label: string; icon: string; enabled: boolean }[];
  recommendation_id: string;
  share_token: string;
};

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  card: CreditCard, upi: Smartphone, netbanking: Building2, wallet: Wallet, cod: Banknote,
};

export default function PatientCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState("card");
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ discount: number; message: string } | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    ordersApi.getCheckout(params.token as string)
      .then(r => setData(r.data))
      .catch(() => toast.error("Invalid or expired link"))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleApplyPromo() {
    if (!promo || !data) return;
    try {
      const res = await ordersApi.createOrder({ share_token: data.share_token, payment_method: payMethod, promo_code: promo, dry_run: true });
      if (res.data.promo_discount > 0) {
        setPromoApplied({ discount: res.data.promo_discount, message: `Saved ₹${res.data.promo_discount}!` });
        toast.success(`Promo applied! Saved ₹${res.data.promo_discount}`);
      }
    } catch { toast.error("Invalid promo code"); }
  }

  async function handlePayNow() {
    if (!data) return;
    setOrdering(true);
    try {
      const res = await ordersApi.createOrder({
        share_token: data.share_token, payment_method: payMethod,
        promo_code: promo || undefined,
      });
      const { order_id } = res.data;
      if (payMethod === "cod") {
        await ordersApi.confirmPayment(order_id);
        setOrderId(order_id);
        toast.success("Order confirmed! Pay on collection.");
      } else {
        await ordersApi.confirmPayment(order_id);
        setOrderId(order_id);
        toast.success("Payment successful!");
      }
    } catch { toast.error("Order creation failed. Please try again."); }
    finally { setOrdering(false); }
  }

  if (loading) return (
    <div className="min-h-screen tz-gradient flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-gray-600 text-sm">Loading your test details...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen tz-gradient flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center">
        <p className="text-gray-900 font-semibold text-lg mb-2">Link Expired or Invalid</p>
        <p className="text-gray-500 text-sm">Please ask your doctor to send a fresh link.</p>
      </div>
    </div>
  );

  if (orderId) return (
    <div className="min-h-screen tz-gradient flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-gray-600 mb-4 text-sm">
          {payMethod === "cod" ? "A phlebotomist will contact you to schedule sample collection. Pay on arrival." : "Your payment was successful. Sample collection will be scheduled soon."}
        </p>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3 font-mono mb-5">Order ID: {orderId}</p>
        <button onClick={() => router.push(`/patient/track/${orderId}`)}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Track My Order
        </button>
      </motion.div>
    </div>
  );

  const finalPrice = data.pricing.patient_price - (promoApplied?.discount || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="tz-gradient text-white py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <FlaskConical className="h-6 w-6" />
          <span className="text-lg font-bold">TestZoo</span>
        </div>
        <p className="text-blue-200 text-xs">Recommended by {data.doctor.name}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">{data.test.name}</h2>
          <div className="flex gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {data.test.turnaround_days} days</span>
            <span className="flex items-center gap-1"><TestTube2 className="h-3 w-3" /> {data.test.sample_type}</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{data.test.category}</span>
          </div>
          {data.test.biomarkers?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {data.test.biomarkers.slice(0, 5).map((b: string) => (
                <span key={b} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{b}</span>
              ))}
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="text-gray-500 text-xs mb-1">Lab: <span className="font-medium text-gray-700">{data.lab.name}, {data.lab.city}</span></p>
            <p className="text-gray-500 text-xs">Accreditation: {data.lab.accreditation}</p>
          </div>
          {data.doctor.clinical_reasoning && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs font-medium text-blue-800 mb-1">Doctor's Note</p>
              <p className="text-xs text-blue-700">{data.doctor.clinical_reasoning}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>MRP</span><span className="line-through">₹{data.pricing.mrp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium">
              <span>Discount ({data.pricing.discount_percent}%)</span><span>- ₹{data.pricing.savings.toLocaleString()}</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-purple-600 font-medium">
                <span>Promo Code</span><span>- ₹{promoApplied.discount}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base">
              <span>You Pay</span><span>₹{finalPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-purple-600" /> Promo Code</h3>
          <div className="flex gap-2">
            <input value={promo} onChange={e => setPromo(e.target.value.toUpperCase())} placeholder="SAVE20"
              className="flex-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono" />
            <button onClick={handleApplyPromo} className="px-4 py-2.5 bg-purple-50 text-purple-700 text-sm font-semibold rounded-xl hover:bg-purple-100 transition-colors">
              Apply
            </button>
          </div>
          {promoApplied && <p className="text-xs text-green-600 mt-2">✓ {promoApplied.message}</p>}
          <p className="text-xs text-gray-400 mt-2">Try: SAVE20, FLAT500, NEWUSER, TESTZOO10</p>
        </div>

        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
          <div className="space-y-2">
            {data.payment_methods.filter((m: { enabled: boolean }) => m.enabled).map((m: { id: string; label: string; enabled: boolean }) => {
              const Icon = PAYMENT_ICONS[m.id] || CreditCard;
              return (
                <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${payMethod === m.id ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}>
                  <input type="radio" name="payment" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} className="hidden" />
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${payMethod === m.id ? "bg-blue-600" : "bg-gray-100"}`}>
                    <Icon className={`h-4 w-4 ${payMethod === m.id ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{m.label}</span>
                  {payMethod === m.id && <CheckCircle className="h-4 w-4 text-blue-600 ml-auto" />}
                </label>
              );
            })}
          </div>
        </div>

        <button onClick={handlePayNow} disabled={ordering}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-lg flex items-center justify-center gap-3 shadow-lg">
          {ordering ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
          {ordering ? "Processing..." : `Pay ₹${finalPrice.toLocaleString()}`}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          🔒 Secured by TestZoo · {payMethod === "cod" ? "Pay at sample collection" : "256-bit SSL encrypted"}
        </p>
      </div>
    </div>
  );
}
