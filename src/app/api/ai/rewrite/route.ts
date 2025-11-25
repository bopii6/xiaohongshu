import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/service';
import { ContentRewriteRequest } from '@/types/ai';
import { handleAPIError, createErrorResponse } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body: ContentRewriteRequest & { provider?: string } = await request.json();

    // 验证请求参数
    if (!body.originalContent) {
      return NextResponse.json(
        createErrorResponse(handleAPIError('Original content is required')),
        { status: 400 }
      );
    }

    if (!body.rewriteType || !['expand', 'simplify', 'rephrase', 'optimize'].includes(body.rewriteType)) {
      return NextResponse.json(
        createErrorResponse(handleAPIError('Valid rewrite type is required')),
        { status: 400 }
      );
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

    const rewrittenContent = await aiService.rewriteContent(body, provider);

    return NextResponse.json({
      success: true,
      data: {
        originalContent: body.originalContent,
        rewrittenContent,
        rewriteType: body.rewriteType,
        provider: provider || 'default'
      }
    });

  } catch (error) {
    const apiError = handleAPIError(error);
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}