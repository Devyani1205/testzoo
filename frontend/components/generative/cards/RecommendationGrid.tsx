'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TestCard } from './TestCard';
import { ComponentMetadata } from '../ComponentRenderer';

interface RecommendationGridProps {
  title?: string;
  subtitle?: string;
  tests: any[];
  isLoading?: boolean;
  metadata?: ComponentMetadata;
  onAction?: (action: string, payload: any) => void;
}

export const RecommendationGrid: React.FC<RecommendationGridProps> = ({
  title,
  subtitle,
  tests,
  isLoading = false,
  metadata = {},
  onAction,
}) => {
  return (
    <div className="space-y-4">
      {title && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {title}
          </h2>
          {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl h-64 animate-pulse"
            />
          ))}
        </div>
      ) : tests && tests.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {tests.map((test, idx) => (
            <motion.div
              key={test.test_id || idx}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <TestCard {...test} onAction={onAction} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">No tests found. Try a different query.</p>
        </div>
      )}
    </div>
  );
};
