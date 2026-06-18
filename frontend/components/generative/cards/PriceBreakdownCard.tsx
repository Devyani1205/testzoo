'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Share2, TrendingDown, AlertCircle, Check } from 'lucide-react';
import { ComponentMetadata } from '../ComponentRenderer';

interface PriceBreakdownCardProps {
  test_id: string;
  name: string;
  mrp: number;
  b2b_price: number;
  patient_price: number;
  discount_percent: number;
  savings: number;
  urgency_highlight?: boolean;
  lab_name: string;
  biomarkers?: string[];
  metadata?: ComponentMetadata;
  onShare?: (testId: string) => void;
  onAction?: (action: string, payload: any) => void;
}

export const PriceBreakdownCard: React.FC<PriceBreakdownCardProps> = ({
  test_id,
  name,
  mrp,
  b2b_price,
  patient_price,
  discount_percent,
  savings,
  urgency_highlight,
  lab_name,
  biomarkers = [],
  metadata = {},
  onShare,
  onAction,
}) => {
  const { emphasis_color = 'blue', cta, reason } = metadata;

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-300 hover:shadow-blue-100',
    red: 'bg-red-50 border-red-300 hover:shadow-red-100',
    green: 'bg-emerald-50 border-emerald-300 hover:shadow-emerald-100',
    purple: 'bg-purple-50 border-purple-300 hover:shadow-purple-100',
  };

  const colorClass = colorClasses[emphasis_color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
      className={`rounded-2xl border-2 p-6 bg-white shadow-lg transition-all duration-300 ${colorClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 leading-tight">{name}</h3>
          <p className="text-sm text-slate-600 mt-2">{lab_name}</p>
        </div>
        {urgency_highlight && (
          <motion.span
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full font-semibold whitespace-nowrap ml-2"
          >
            🔥 High Match
          </motion.span>
        )}
      </div>

      {/* Biomarkers */}
      {biomarkers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {biomarkers.map((marker) => (
            <span
              key={marker}
              className="text-xs bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-900 px-2 py-1 rounded-full font-medium"
            >
              {marker}
            </span>
          ))}
        </div>
      )}

      {/* Price Breakdown */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4 space-y-3 border border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">MRP</span>
          <span className="text-slate-400 line-through font-medium">₹{mrp.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">B2B Rate</span>
          <span className="text-slate-800 font-semibold">₹{b2b_price.toLocaleString('en-IN')}</span>
        </div>
        <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-900">Patient Pays</span>
          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
            ₹{patient_price.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Savings Highlight */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gradient-to-r from-emerald-100 to-green-100 border-2 border-emerald-300 rounded-lg p-3 mb-4 flex items-center gap-3"
      >
        <TrendingDown className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <span className="text-sm font-bold text-emerald-900">
          Save ₹{savings.toLocaleString('en-IN')} ({discount_percent.toFixed(0)}% off)
        </span>
      </motion.div>

      {/* AI Reasoning */}
      {reason && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3 mb-4 flex gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 font-medium">{reason}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onShare?.(test_id)}
          className={`flex-1 py-3 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-${emphasis_color}-600 to-${emphasis_color}-700 text-white hover:shadow-lg hover:from-${emphasis_color}-700 hover:to-${emphasis_color}-800`}
        >
          <Share2 className="h-4 w-4" />
          {cta || 'Share via WhatsApp'}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAction?.('view-details', { test_id, name })}
          className="px-4 py-3 border-2 border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          Details
        </motion.button>
      </div>
    </motion.div>
  );
};
