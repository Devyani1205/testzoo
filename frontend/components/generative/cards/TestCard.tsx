'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, Zap } from 'lucide-react';
import { ComponentMetadata } from '../ComponentRenderer';

interface TestCardProps {
  test_id: string;
  name: string;
  category: string;
  biomarkers: string[];
  turnaround_days: number;
  description: string;
  price: number;
  sponsored?: boolean;
  rating?: number;
  metadata?: ComponentMetadata;
  onAction?: (action: string, payload: any) => void;
}

export const TestCard: React.FC<TestCardProps> = ({
  test_id,
  name,
  category,
  biomarkers,
  turnaround_days,
  description,
  price,
  sponsored = false,
  rating = 4.5,
  metadata = {},
  onAction,
}) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-xl border-2 p-4 transition-all duration-300 ${
        sponsored
          ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 shadow-purple-100'
          : 'border-slate-200 bg-white hover:shadow-lg'
      }`}
    >
      {sponsored && (
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Featured</span>
        </div>
      )}

      <h3 className="text-base font-bold text-slate-900 mb-1">{name}</h3>
      <p className="text-xs text-slate-500 mb-3">{category}</p>

      {description && (
        <p className="text-sm text-slate-700 line-clamp-2 mb-3 bg-white bg-opacity-50 p-2 rounded">
          {description}
        </p>
      )}

      {biomarkers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {biomarkers.slice(0, 3).map((marker) => (
            <span
              key={marker}
              className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-semibold"
            >
              {marker}
            </span>
          ))}
          {biomarkers.length > 3 && (
            <span className="text-xs text-slate-500 self-center">+{biomarkers.length - 3} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-3 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < Math.floor(rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300'
              }`}
            />
          ))}
          <span className="text-xs text-slate-500 ml-1">({rating})</span>
        </div>
        <div className="flex items-center gap-1 text-blue-600">
          <Clock className="h-3 w-3" />
          <span className="text-xs font-semibold">{turnaround_days}d</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-blue-600">₹{price.toLocaleString('en-IN')}</div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction?.('select-test', { test_id, name, price })}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          Select
        </motion.button>
      </div>
    </motion.div>
  );
};
