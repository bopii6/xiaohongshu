import { NextRequest } from 'next/server';
import { getAIService } from '@/lib/ai/service';
import { AIRequest } from '@/types/ai';
import { handleAPIError } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body: AIRequest & { provider?: string } = await request.json();

    // 验证请求参数
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Messages array is required'
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const aiService = getAIService();
    const provider = body.provider;

    // 检查指定的提供商是否可用
    if (provider && !aiService.isProviderAvailable(provider)) {
      return new Response(JSON.stringify({
        error: {
          code: 'PROVIDER_NOT_AVAILABLE',
          message: `Provider '${provider}' is not available`
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stream = await aiService.generateTextStream(body, provider);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用nginx缓冲
      },
    });

  } catch (error) {
    const apiError = handleAPIError(error);
    return new Response(JSON.stringify({
      error: {
        code: apiError.code,
        message: apiError.message,
        provider: apiError.provider
      }
    }), {
      status: apiError.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}