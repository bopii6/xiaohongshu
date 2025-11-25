import { NextRequest } from 'next/server';
import { XiaohongshuService } from '@/lib/ernie/xiaohongshu-service';
import { getErnieClientConfig } from '@/lib/ernie/env';

// POST /api/ernie/stream - 流式内容改写
export async function POST(request: NextRequest) {
  try {
    // 验证请求头
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: '请求头 Content-Type 必须是 application/json' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { content, type, targetStyle, model, temperature } = body;

    // 验证必需参数
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'content 参数是必需的，且必须是字符串' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!type || !['polish', 'expand', 'summarize', 'style', 'seo', 'emotion'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'type 参数必须是以下之一: polish, expand, summarize, style, seo, emotion' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 验证内容长度
    if (content.length > 10000) {
      return new Response(
        JSON.stringify({ error: '内容长度不能超过10000字符' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 获取配置
    const config = getErnieClientConfig();

    // 创建服务实例
    const service = new XiaohongshuService(config.apiKey, config.secretKey);

    // 构建改写请求
    const rewriteRequest = {
      content: content.trim(),
      type,
      targetStyle: targetStyle?.trim(),
      model,
      temperature: temperature ? parseFloat(temperature) : undefined
    };

    // 创建一个可读流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始标记
          const startData = {
            type: 'start',
            timestamp: new Date().toISOString(),
            requestId: Math.random().toString(36).substr(2, 9)
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(startData)}\n\n`));

          let fullContent = '';
          let totalTokens = 0;

          // 流式处理内容
          for await (const chunk of service.rewriteContentStream(rewriteRequest)) {
            const chunkData = {
              type: 'chunk',
              content: chunk.content,
              isEnd: chunk.is_end,
              usage: chunk.usage
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));

            fullContent += chunk.content;
            if (chunk.usage) {
              totalTokens = chunk.usage.total_tokens;
            }

            // 如果是结束标记，发送最终结果
            if (chunk.is_end) {
              const endData = {
                type: 'end',
                content: fullContent,
                usage: {
                  totalTokens,
                  estimatedCost: service.estimateCost(content, type)
                },
                timestamp: new Date().toISOString()
              };

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(endData)}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              break;
            }
          }

        } catch (error) {
          console.error('流式改写错误:', error);

          const errorData = {
            type: 'error',
            error: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString()
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('ERNIE流式改写API错误:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// OPTIONS /api/ernie/stream - 处理CORS预检请求
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}