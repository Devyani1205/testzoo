'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { PriceBreakdownCard } from './cards/PriceBreakdownCard';
import { AlertBox } from './cards/AlertBox';
import { TestCard } from './cards/TestCard';
import { ClinicalTipCard } from './cards/ClinicalTipCard';
import { RecommendationGrid } from './cards/RecommendationGrid';

export interface ComponentMetadata {
  ai_priority?: number;
  emphasis_color?: string;
  cta?: string;
  reason?: string;
  animateIn?: boolean;
  customStyles?: any;
  recommendedFor?: string;
}

export interface ComponentSchema {
  type: string;
  props: Record<string, any>;
  children?: ComponentSchema[];
  metadata?: ComponentMetadata;
}

const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'PriceBreakdownCard': PriceBreakdownCard,
  'AlertBox': AlertBox,
  'TestCard': TestCard,
  'ClinicalTipCard': ClinicalTipCard,
  'RecommendationGrid': RecommendationGrid,
};

interface ComponentRendererProps {
  schema: ComponentSchema | ComponentSchema[] | null;
  context?: {
    onShare?: (cardId: string) => void;
    onAction?: (actionType: string, payload: any) => void;
    onError?: (error: any) => void;
  };
  isStreaming?: boolean;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  schema,
  context,
  isStreaming = false,
}) => {
  if (!schema) return null;

  const schemas = Array.isArray(schema) ? schema : [schema];

  return (
    <div className="space-y-4">
      {schemas.map((componentSchema, idx) => (
        <Suspense key={`${componentSchema.type}-${idx}`} fallback={<SkeletonLoader />}>
          <GenericComponent schema={componentSchema} context={context} />
        </Suspense>
      ))}
    </div>
  );
};

function GenericComponent({
  schema,
  context,
}: {
  schema: ComponentSchema;
  context?: ComponentRendererProps['context'];
}) {
  const Component = COMPONENT_MAP[schema.type];

  if (!Component) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="font-semibold text-yellow-900">Unknown Component</h3>
        <p className="text-sm text-yellow-800 mt-1">Type: {schema.type}</p>
      </div>
    );
  }

  const metadata = schema.metadata || {};
  const delay = metadata.ai_priority ? metadata.ai_priority * 0.1 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={metadata.customStyles}
    >
      <ErrorBoundary onError={context?.onError}>
        <Component
          {...schema.props}
          metadata={metadata}
          onShare={context?.onShare}
          onAction={context?.onAction}
        />
      </ErrorBoundary>
      {schema.children && schema.children.length > 0 && (
        <div className="children-container mt-3 pl-4 border-l-2 border-blue-200">
          {schema.children.map((child, idx) => (
            <GenericComponent key={idx} schema={child} context={context} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: any) => void },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Component error:', error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900">Component Error</h3>
          <p className="text-sm text-red-800 mt-1">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function SkeletonLoader() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}
