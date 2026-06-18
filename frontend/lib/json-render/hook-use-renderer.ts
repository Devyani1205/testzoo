'use client';

import { useState, useCallback } from 'react';
import { ComponentSpec, StreamChunk, ComponentSpecSchema } from './catalog';

/**
 * useRenderer Hook
 * Manage component spec state and validation
 *
 * @example
 * ```tsx
 * const { spec, setSpec, isValid, error } = useRenderer();
 *
 * // Later, when receiving AI data:
 * setSpec(aiGeneratedSpec);
 * ```
 */
export function useRenderer() {
  const [spec, setSpecState] = useState<ComponentSpec | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setSpec = useCallback((newSpec: any) => {
    try {
      // Validate spec against schema
      const validated = ComponentSpecSchema.parse(newSpec);
      setSpecState(validated);
      setIsValid(true);
      setError(null);
    } catch (err: any) {
      setIsValid(false);
      setError(err.message || 'Invalid component specification');
      console.error('Renderer validation error:', err);
    }
  }, []);

  const clearSpec = useCallback(() => {
    setSpecState(null);
    setIsValid(true);
    setError(null);
  }, []);

  return {
    spec,
    setSpec,
    clearSpec,
    isValid,
    error,
  };
}

/**
 * useStreamingRenderer Hook
 * Manage streaming component specs with progressive rendering
 *
 * @example
 * ```tsx
 * const { specs, addSpec, isStreaming, error } = useStreamingRenderer();
 *
 * useEffect(() => {
 *   // Parse incoming SSE stream chunks
 *   const handleMessage = (chunk: StreamChunk) => {
 *     if (chunk.type === 'component') {
 *       addSpec(chunk.component);
 *     }
 *   };
 * }, [addSpec]);
 *
 * return <MultiRenderer specs={specs} isStreaming={isStreaming} error={error} />;
 * ```
 */
export function useStreamingRenderer() {
  const [specs, setSpecs] = useState<ComponentSpec[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSpec = useCallback((newSpec: any) => {
    try {
      const validated = ComponentSpecSchema.parse(newSpec);
      setSpecs((prev) => [...prev, validated]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Invalid component specification');
      console.error('Streaming renderer validation error:', err);
    }
  }, []);

  const clearSpecs = useCallback(() => {
    setSpecs([]);
    setError(null);
  }, []);

  const startStreaming = useCallback(() => {
    setIsStreaming(true);
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const processStreamChunk = useCallback((chunk: StreamChunk) => {
    try {
      switch (chunk.type) {
        case 'component':
          addSpec(chunk.component);
          break;
        case 'error':
          setError(chunk.message);
          break;
        case 'complete':
          stopStreaming();
          break;
      }
    } catch (err) {
      console.error('Error processing stream chunk:', err);
    }
  }, [addSpec, stopStreaming]);

  return {
    specs,
    addSpec,
    clearSpecs,
    isStreaming,
    startStreaming,
    stopStreaming,
    error,
    processStreamChunk,
  };
}
