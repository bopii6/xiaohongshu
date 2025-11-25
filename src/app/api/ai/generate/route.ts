import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/service';
import { AIRequest } from '@/types/ai';
import { handleAPIError, createErrorResponse } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body: AIRequest & { provider?: string } = await request.json();

    // 验证请求参数
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        createErrorResponse(handleAPIError('Messages array is required')),
        { status: 400 }
      );
    }

    // 验证消息格式
    for (const message of body.messages) {
      if (!message.role || !message.content) {
        return NextResponse.json(
          createErrorResponse(handleAPIError('Each message must have role and content')),
          { status: 400 }
        );
      }
    }

    const aiService = getAIService();
    const provider = body.provider;

    // 检查指定的提供商是否可用
    if (provider && !aiService.isProviderAvailable(provider)) {
      return NextResponse.json(
        createErrorResponse(handleAPIError(`Provider '${provider}' is not available`)),
        { status: 400 }
      );
    }

    const response = await aiService.generateText(body, provider);

    return NextResponse.json({
      success: true,
      data: response,
      provider: provider || 'default'
    });

  } catch (error) {
    const apiError = handleAPIError(error);
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}

export async function GET() {
  const aiService = getAIService();

  return NextResponse.json({
    success: true,
    data: {
      availableProviders: aiService.getAvailableProviders(),
      endpoints: {
        generate: '/api/ai/generate',
        generateStream: '/api/ai/generate/stream',
        rewrite: '/api/ai/rewrite',
        generateContent: '/api/ai/generate-content'
      }
    }
  });
}