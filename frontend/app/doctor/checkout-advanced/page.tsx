'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Wallet, Banknote, Check, Lock, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

interface CheckoutState {
  orderId: string;
  amount: number;
  breakdown: {
    mrp: number;
    discount: number;
    promo: number;
    wallet: number;
    final: number;
  };
  availableWalletBalance: number;
}

export default function AdvancedCheckoutPage() {
  const [state, setState] = useState<CheckoutState>({
    orderId: 'ORD-2024-001',
    amount: 14760,
    breakdown: {
      mrp: 25000,
      discount: 4500,
      promo: 3740,
      wallet: 0,
      final: 15960,
    },
    availableWalletBalance: 5000,
  });

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [walletAmount, setWalletAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);

  const suggestedPayment = () => {
    if (state.availableWalletBalance >= state.breakdown.final * 0.5) {
      return 'hybrid';
    }
    if (state.availableWalletBalance >= state.breakdown.final) {
      return 'wallet';
    }
    return 'card';
  };

  const suggested = suggestedPayment();

  const PAYMENT_METHODS = [
    {
      id: 'card',
      label: 'Credit/Debit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, Amex',
      badge: suggested === 'card' ? 'Recommended' : null,
      hint: 'Instant payment, 2% cashback',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'upi',
      label: 'UPI',
      icon: Smartphone,
      description: 'Google Pay, PhonePe, PayTM',
      badge: null,
      hint: 'Fast & secure',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'wallet',
      label: 'TestZoo Wallet',
      icon: Wallet,
      description: `Available: ₹${state.availableWalletBalance.toLocaleString('en-IN')}`,
      badge: state.availableWalletBalance >= state.breakdown.final ? 'Sufficient' : 'Partial',
      hint: suggested === 'wallet' ? 'Use full balance' : 'Partial payment',
      color: 'from-emerald-500 to-green-500',
    },
    {
      id: 'cod',
      label: 'Cash on Delivery',
      icon: Banknote,
      description: 'Pay during collection',
      badge: null,
      hint: 'No prepayment needed',
      color: 'from-orange-500 to-red-500',
    },
  ];

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    try {
      toast.loading('Applying promo code...');
      const response = await apiClient.applyPromoCode(promoCode, 'test-123');
      const discount = response.data.discount_amount;

      setState((prev) => ({
        ...prev,
        breakdown: {
          ...prev.breakdown,
          promo: discount,
          final: prev.breakdown.mrp - prev.breakdown.discount - discount,
        },
      }));

      toast.success(`Promo applied! Saved ₹${discount.toLocaleString('en-IN')}`);
      setShowPromoInput(false);
      setPromoCode('');
    } catch (error) {
      toast.error('Invalid promo code');
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      toast.loading('Processing payment...');
      // Simulated API call
      await new Promise((r) => setTimeout(r, 2000));
      toast.success('Payment successful! 🎉');
      // Redirect to order confirmation
    } catch (error) {
      toast.error('Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Secure Checkout</h1>
          <p className="text-slate-600 mt-1">Order #{state.orderId}</p>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 mb-6"
        >
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Price Breakdown
          </h2>
          <div className="space-y-3">
            {state.breakdown.mrp > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Test MRP</span>
                <span className="line-through text-slate-400 font-medium">
                  ₹{state.breakdown.mrp.toLocaleString('en-IN')}
                </span>
              </div>
            )}
            {state.breakdown.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Doctor Discount (18%)</span>
                <span className="font-semibold">-₹{state.breakdown.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {state.breakdown.promo > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Promo Discount</span>
                <span className="font-semibold">-₹{state.breakdown.promo.toLocaleString('en-IN')}</span>
              </div>
            )}
            {state.breakdown.wallet > 0 && (
              <div className="flex justify-between text-sm text-blue-700">
                <span>Wallet Credit</span>
                <span className="font-semibold">-₹{state.breakdown.wallet.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Amount to Pay</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
                ₹{state.breakdown.final.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Promo Code Section */}
          <div className="mt-4 pt-4 border-t">
            {showPromoInput ? (
              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  maxLength={20}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleApplyPromo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPromoInput(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <TrendingDown className="h-4 w-4" />
                Have a promo code? Add it
              </button>
            )}
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="font-bold text-slate-900 mb-4">Select Payment Method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((method) => (
              <motion.button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl text-left transition-all border-2 ${
                  selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 bg-gradient-to-r ${method.color} rounded-lg`}>
                      <method.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{method.label}</p>
                      <p className="text-xs text-slate-500">{method.description}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && <Check className="h-5 w-5 text-blue-600" />}
                </div>
                {method.badge && (
                  <span className="inline-block text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                    {method.badge}
                  </span>
                )}
                <p className="text-xs text-blue-600 mt-2 font-medium">💡 {method.hint}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Hybrid Payment */}
        {suggested === 'hybrid' && selectedMethod === 'card' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6"
          >
            <p className="text-sm font-semibold text-amber-900 mb-3">💡 Use Wallet + Card?</p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setWalletAmount(Math.min(state.availableWalletBalance, state.breakdown.final))
                }
                className="flex-1 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
              >
                Use ₹{Math.min(state.availableWalletBalance, state.breakdown.final).toLocaleString('en-IN')} from Wallet
              </button>
              <button
                onClick={() => setWalletAmount(0)}
                className="flex-1 py-2 border-2 border-amber-300 text-amber-900 text-sm font-semibold rounded-lg hover:bg-amber-100 transition-colors"
              >
                Skip
              </button>
            </div>
            {walletAmount > 0 && (
              <p className="text-xs text-amber-800 mt-3 font-medium">
                Final amount: ₹{(state.breakdown.final - walletAmount).toLocaleString('en-IN')} (Wallet: ₹{walletAmount.toLocaleString('en-IN')})
              </p>
            )}
          </motion.div>
        )}

        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePayment}
          disabled={processing || !selectedMethod}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
        >
          {processing ? '⏳ Processing Payment...' : `Pay ₹${(state.breakdown.final - walletAmount).toLocaleString('en-IN')}`}
        </motion.button>
      </div>
    </div>
  );
}
