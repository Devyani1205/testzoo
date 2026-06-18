'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ComponentMetadata } from '../ComponentRenderer';

interface AlertBoxProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  dismissible?: boolean;
  metadata?: ComponentMetadata;
}

export const AlertBox: React.FC<AlertBoxProps> = ({
  type,
  title,
  message,
  dismissible = true,
  metadata = {},
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const typeConfig = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-900',
      icon: Info,
      gradient: 'from-blue-500 to-cyan-500',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
      icon: AlertTriangle,
      gradient: 'from-yellow-500 to-orange-500',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: AlertCircle,
      gradient: 'from-red-500 to-rose-500',
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-900',
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-500',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} ${config.border} border-l-4 rounded-lg p-4 flex gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div className={`p-2 rounded-lg bg-gradient-to-r ${config.gradient} bg-opacity-20`}>
        <Icon className={`h-5 w-5 text-${type === 'info' ? 'blue' : type === 'warning' ? 'yellow' : type === 'error' ? 'red' : 'emerald'}-600`} />
      </div>
      <div className="flex-1">
        <h4 className={`font-bold ${config.text}`}>{title}</h4>
        <p className={`text-sm mt-1 ${config.text} opacity-90`}>{message}</p>
      </div>
      {dismissible && (
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-slate-600 transition-colors ml-2 flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
