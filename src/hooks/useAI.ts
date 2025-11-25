'use client';

import { useState, useCallback } from 'react';
import { AIRequest, ContentRewriteRequest, ContentGenerationRequest } from '@/types/ai';
import { aiClient, useAIStreaming } from '@/lib/ai-client';

interface UseAIOptions {
  provider?: string;
  onError?: (error: Error) => void;
}

export function useAI(options: UseAIOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { generateWithStreaming } = useAIStreaming();
  const { provider, onError } = options;

  const generateText = useCallback(async (request: AIRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiClient.generateText({
        ...request,
        provider: provider || request.provider
      });
      setLoading(false);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setLoading(false);
      onError?.(error);
      throw error;
    }
  }, [provider, onError]);

  const rewriteContent = useCallback(async (request: ContentRewriteRequest) => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiClient.rewriteContent({
        ...request,
        provider: provider || request.provider
      });
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setLoading(false);
      onError?.(error);
      throw error;
    }
  }, [provider, onError]);

  const generateContent = useCallback(async (request: ContentGenerationRequest) => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiClient.generateContent({
        ...request,
        provider: provider || request.provider
      });
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setLoading(false);
      onError?.(error);
      throw error;
    }
  }, [provider, onError]);

  const generateTextStreaming = useCallback((
    request: AIRequest,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void
  ) => {
    setLoading(true);
    setError(null);

    generateWithStreaming(
      {
        ...request,
        provider: provider || request.provider
      },
      onChunk,
      (fullText) => {
        setLoading(false);
        onComplete(fullText);
      },
      (error) => {
        setError(error);
        setLoading(false);
        onError?.(error);
      }
    );
  }, [provider, onError, generateWithStreaming]);

  return {
    loading,
    error,
    generateText,
    rewriteContent,
    generateContent,
    generateTextStreaming,
    clearError: () => setError(null)
  };
}
