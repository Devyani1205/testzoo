'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { ComponentMetadata } from '../ComponentRenderer';

interface ClinicalTipCardProps {
  title: string;
  tip: string;
  severity?: 'low' | 'medium' | 'high';
  metadata?: ComponentMetadata;
}

export const ClinicalTipCard: React.FC<ClinicalTipCardProps> = ({
  title,
  tip,
  severity = 'medium',
  metadata = {},
}) => {
  const severityColors = {
    low: 'from-blue-100 to-cyan-100 border-blue-300 text-blue-900',
    medium: 'from-yellow-100 to-orange-100 border-yellow-300 text-yellow-900',
    high: 'from-red-100 to-orange-100 border-red-300 text-red-900',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`rounded-xl border-2 bg-gradient-to-r p-4 ${severityColors[severity]}`}
    >
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-sm mb-1">{title}</h4>
          <p className="text-sm opacity-90">{tip}</p>
        </div>
      </div>
    </motion.div>
  );
};
