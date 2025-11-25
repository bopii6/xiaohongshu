import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/service';
import { ContentGenerationRequest } from '@/types/ai';
import { handleAPIError, createErrorResponse } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body: ContentGenerationRequest & { provider?: string } = await request.json();

    // 验证请求参数
    if (!body.topic) {
      return NextResponse.json(
        createErrorResponse(handleAPIError('Topic is required')),
        { status: 400 }
      );
    }

    if (!body.contentType || !['xiaohongshu', 'weibo', 'douyin', 'article'].includes(body.contentType)) {
      return NextResponse.json(
        createErrorResponse(handleAPIError('Valid content type is required')),
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

    const generatedContent = await aiService.generateContent(body, provider);

    return NextResponse.json({
      success: true,
      data: {
        topic: body.topic,
        contentType: body.contentType,
        generatedContent,
        keywords: body.keywords,
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