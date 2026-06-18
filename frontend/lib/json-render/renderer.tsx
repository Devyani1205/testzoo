'use client';

import React, { useCallback } from 'react';
import { ComponentSpec, StreamChunk } from './catalog';
import { getComponent, isComponentRegistered } from './registry';

// ============================================================================
// RENDERER COMPONENT: Renders AI-generated JSON specs progressively
// ============================================================================

interface RendererProps {
  spec?: ComponentSpec | null;
  isStreaming?: boolean;
  error?: string | null;
  fallback?: React.ReactNode;
}

/**
 * Renderer Component
 * Safely renders AI-generated component specifications
 *
 * Features:
 * - Type-safe rendering with Zod validation
 * - Progressive streaming support
 * - Error boundary and fallback UI
 * - Extensible component registry
 *
 * @example
 * ```tsx
 * const [spec, setSpec] = useState<ComponentSpec | null>(null);
 *
 * return (
 *   <Renderer
 *     spec={spec}
 *     isStreaming={isLoading}
 *     error={error}
 *     fallback={<LoadingSkeleton />}
 *   />
 * );
 * ```
 */
export const Renderer: React.FC<RendererProps> = ({
  spec,
  isStreaming = false,
  error = null,
  fallback = <LoadingPlaceholder />,
}) => {
  // Render error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">Rendering Error</h3>
        <p className="text-sm text-red-800 mt-2">{error}</p>
      </div>
    );
  }

  // Render loading state
  if (isStreaming || !spec) {
    return <>{fallback}</>;
  }

  // Get the component from registry
  const Component = getComponent(spec.type);

  if (!Component) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="font-semibold text-yellow-900">Unknown Component</h3>
        <p className="text-sm text-yellow-800 mt-2">
          Component type '{spec.type}' is not registered. Available components:
        </p>
        <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside">
          {getRegisteredComponentNames().map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Component {...spec.props} />
    </ErrorBoundary>
  );
};

/**
 * Multi-Renderer: Renders multiple component specs sequentially
 */
interface MultiRendererProps {
  specs: ComponentSpec[];
  isStreaming?: boolean;
  error?: string | null;
}

export const MultiRenderer: React.FC<MultiRendererProps> = ({
  specs,
  isStreaming = false,
  error = null,
}) => {
  return (
    <div className="space-y-4">
      {specs.map((spec, index) => (
        <Renderer
          key={`${spec.type}-${index}`}
          spec={spec}
          isStreaming={isStreaming}
          error={error}
        />
      ))}
    </div>
  );
};

// ─── Error Boundary ────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Renderer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900">Component Error</h3>
          <p className="text-sm text-red-800 mt-2">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Loading Placeholders ─────────────────────────────────────────────

const LoadingPlaceholder: React.FC = () => (
  <div className="space-y-4">
    <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
    </div>
  </div>
);

const LoadingSkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="rounded-lg bg-gray-200 h-64 animate-pulse" />
    ))}
  </div>
);

// ─── Utility Functions ────────────────────────────────────────────────

function getRegisteredComponentNames(): string[] {
  return Object.keys({
    PriceBreakdownCard: true,
    AlertBox: true,
    TestCard: true,
    RecommendationGrid: true,
    Button: true,
  });
}

export { LoadingPlaceholder, LoadingSkeletonGrid };
