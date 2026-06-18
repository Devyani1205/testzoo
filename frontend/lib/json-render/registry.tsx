'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { ComponentSpec } from './catalog';

// ============================================================================
// REGISTRY: Map component specs to actual React components
// ============================================================================

interface RegistryComponentProps {
  [key: string]: any;
}

// ─── PriceBreakdownCard Component ──────────────────────────────────────

const PriceBreakdownCard: React.FC<any> = ({
  test_id,
  name,
  mrp,
  patient_price,
  savings,
  discount_percent,
  lab_name,
  clinical_note,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          {lab_name && <p className="text-sm text-gray-600 mt-1">{lab_name}</p>}
        </div>
        {discount_percent > 0 && (
          <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {discount_percent}% OFF
          </div>
        )}
      </div>

      {clinical_note && (
        <p className="text-sm text-gray-700 bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded">
          {clinical_note}
        </p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">MRP:</span>
          <span className="line-through text-gray-500">₹{mrp.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Savings:</span>
          <span className="text-green-600 font-medium">₹{savings.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Patient Price:</span>
          <span className="text-blue-600">₹{patient_price.toLocaleString()}</span>
        </div>
      </div>

      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
        View Details
      </button>
    </div>
  );
};

// ─── AlertBox Component ────────────────────────────────────────────────

const AlertBox: React.FC<any> = ({ type, title, message, dismissible }) => {
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (isDismissed) return null;

  const typeConfig = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: AlertTriangle },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: AlertCircle },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: CheckCircle },
  };

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} ${config.text} border rounded-lg p-4 flex gap-3`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm mt-1 opacity-90">{message}</p>
      </div>
      {dismissible && (
        <button
          onClick={() => setIsDismissed(true)}
          className="text-lg opacity-50 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
};

// ─── TestCard Component ────────────────────────────────────────────────

const TestCard: React.FC<any> = ({
  test_id,
  name,
  category,
  biomarkers,
  turnaround_days,
  description,
  price,
  sponsored,
}) => {
  return (
    <div className={`rounded-lg border ${sponsored ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'} p-4 hover:shadow-lg transition-shadow`}>
      {sponsored && (
        <div className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wider">Sponsored</div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{name}</h3>
      {category && <p className="text-xs text-gray-500 mt-1">{category}</p>}

      {description && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{description}</p>
      )}

      {biomarkers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {biomarkers.map((biomarker) => (
            <span key={biomarker} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
              {biomarker}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <div>
          <p className="text-2xl font-bold text-blue-600">₹{price.toLocaleString()}</p>
          {turnaround_days && (
            <p className="text-xs text-gray-500 mt-1">{turnaround_days} day turnaround</p>
          )}
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Select
        </button>
      </div>
    </div>
  );
};

// ─── RecommendationGrid Component ──────────────────────────────────────

const RecommendationGrid: React.FC<any> = ({ title, subtitle, tests, isLoading }) => {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
      {subtitle && <p className="text-gray-600">{subtitle}</p>}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-48 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && tests && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <TestCard key={test.test_id} {...test} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Button Component ──────────────────────────────────────────────────

const Button: React.FC<any> = ({ label, variant = 'primary', size = 'md', disabled = false, onClick }) => {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${variantClasses[variant]} ${sizeClasses[size]} rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

// ─── Registry Mapping ────────────────────────────────────────────────────

const componentRegistry: Record<string, React.ComponentType<any>> = {
  PriceBreakdownCard,
  AlertBox,
  TestCard,
  RecommendationGrid,
  Button,
};

/**
 * Get a component from the registry
 * @param componentType The component type name
 * @returns The React component, or null if not found
 */
export function getComponent(componentType: string): React.ComponentType<any> | null {
  return componentRegistry[componentType] || null;
}

/**
 * Check if a component is registered
 */
export function isComponentRegistered(componentType: string): boolean {
  return componentType in componentRegistry;
}

/**
 * Get all registered component names
 */
export function getRegisteredComponents(): string[] {
  return Object.keys(componentRegistry);
}

export default componentRegistry;
