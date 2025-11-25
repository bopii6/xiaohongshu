import { AIRequest, AIResponse, ContentRewriteRequest, ContentGenerationRequest } from '@/types/ai';

class AIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/ai') {
    this.baseUrl = baseUrl;
  }

  async generateText(request: AIRequest & { provider?: string }): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate text');
    }

    const result = await response.json();
    return result.data;
  }

  async generateTextStream(request: AIRequest & { provider?: string }): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseUrl}/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate text stream');
    }

    return response.body!;
  }

  async rewriteContent(request: ContentRewriteRequest & { provider?: string }): Promise<string> {
    const response = await fetch(`${this.baseUrl}/rewrite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to rewrite content');
    }

    const result = await response.json();
    return result.data.rewrittenContent;
  }

  async generateContent(request: ContentGenerationRequest & { provider?: string }): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate content');
    }

    const result = await response.json();
    return result.data.generatedContent;
  }

  async getAvailableProviders(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/generate`);

    if (!response.ok) {
      throw new Error('Failed to get available providers');
    }

    const result = await response.json();
    return result.data.availableProviders;
  }
}

// React Hook for AI text generation with streaming support
export function useAIStreaming() {
  const generateWithStreaming = async (
    request: AIRequest & { provider?: string },
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void
  ) => {
    try {
      const client = new AIClient();
      const stream = await client.generateTextStream(request);

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onChunk(chunk);
      }

      onComplete(fullText);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  return { generateWithStreaming };
}

// 导出客户端实例
export const aiClient = new AIClient();
export default AIClient;