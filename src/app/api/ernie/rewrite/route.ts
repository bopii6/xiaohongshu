import { NextRequest, NextResponse } from 'next/server';
import { XiaohongshuService } from '@/lib/ernie/xiaohongshu-service';
import { getErnieClientConfig } from '@/lib/ernie/env';
import { RewriteRequest } from '@/lib/ernie/xiaohongshu-service';

// POST /api/ernie/rewrite - 内容改写
export async function POST(request: NextRequest) {
  try {
    // 验证请求头
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: '请求头 Content-Type 必须是 application/json' },
        { status: 400 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { content, title, type, targetStyle, model, temperature } = body;

    // 验证必需参数
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content 参数是必需的，且必须是字符串' },
        { status: 400 }
      );
    }

    if (!type || !['polish', 'expand', 'summarize', 'style', 'seo', 'emotion'].includes(type)) {
      return NextResponse.json(
        { error: 'type 参数必须是以下之一: polish, expand, summarize, style, seo, emotion' },
        { status: 400 }
      );
    }

    // 验证内容长度
    if (content.length > 10000) {
      return NextResponse.json(
        { error: '内容长度不能超过10000字符' },
        { status: 400 }
      );
    }

    // 获取配置
    const config = getErnieClientConfig();

    // 创建服务实例
    const service = new XiaohongshuService(config.apiKey, config.secretKey);

    // 构建改写请求
    const rewriteRequest: RewriteRequest = {
      content: content.trim(),
      title: title?.trim(),
      type,
      targetStyle: targetStyle?.trim(),
      model,
      temperature: temperature ? parseFloat(temperature) : undefined
    };

    // 执行改写
    const startTime = Date.now();
    const result = await service.rewriteContent(rewriteRequest);
    const processingTime = Date.now() - startTime;

    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        originalContent: result.originalContent,
        rewrittenContent: result.rewrittenContent,
        rewrittenTitle: result.rewrittenTitle,
        model: result.model,
        usage: result.usage,
        processingTime: result.processingTime,
        serverProcessingTime: processingTime
      }
    });

  } catch (error) {
    console.error('ERNIE改写API错误:', error);

    // 错误处理
    let errorMessage = '服务器内部错误';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('环境变量')) {
        errorMessage = error.message;
        statusCode = 500;
      } else if (error.message.includes('内容改写失败')) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('ERNIE API错误')) {
        errorMessage = 'AI模型处理失败，请稍后重试';
        statusCode = 502;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// GET /api/ernie/rewrite - 获取使用统计和支持的操作类型
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        supportedOperations: [
          {
            type: 'polish',
            name: '内容润色',
            description: '优化表达，让文案更生动有趣',
            example: '将普通描述改写为吸引人的小红书风格'
          },
          {
            type: 'expand',
            name: '内容扩写',
            description: '增加细节和个人体验，丰富内容',
            example: '将简短观点扩展为详细分享'
          },
          {
            type: 'summarize',
            name: '内容精简',
            description: '提取核心信息，简洁表达',
            example: '将长文案精简为精华内容'
          },
          {
            type: 'style',
            name: '风格转换',
            description: '转换为目标风格的小红书文案',
            example: '转换为种草、干货、生活记录等风格'
          },
          {
            type: 'seo',
            name: 'SEO优化',
            description: '优化话题标签和关键词',
            example: '提高内容在搜索中的曝光'
          },
          {
            type: 'emotion',
            name: '情感增强',
            description: '增强情感表达，提高感染力',
            example: '让文案更有共鸣和代入感'
          }
        ],
        supportedStyles: [
          '干货分享', '种草推荐', '生活记录', '经验总结',
          '产品评测', '旅行攻略', '美食探店', '美妆护肤',
          '穿搭搭配', '健身运动', '学习方法', '职场经验'
        ],
        parameters: {
          content: {
            type: 'string',
            required: true,
            maxLength: 10000,
            description: '需要改写的内容'
          },
          title: {
            type: 'string',
            required: false,
            maxLength: 100,
            description: '原标题（可选）'
          },
          type: {
            type: 'string',
            required: true,
            enum: ['polish', 'expand', 'summarize', 'style', 'seo', 'emotion'],
            description: '改写类型'
          },
          targetStyle: {
            type: 'string',
            required: false,
            description: '目标风格（当type为style时必需）'
          },
          model: {
            type: 'string',
            required: false,
            enum: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-3.5-128k', 'ernie-speed-8k', 'ernie-speed-128k', 'ernie-tiny-8k'],
            description: '使用的模型版本'
          },
          temperature: {
            type: 'number',
            required: false,
            min: 0,
            max: 1,
            default: 0.7,
            description: '控制输出的随机性，0-1之间'
          }
        },
        usage: {
          maxContentLength: 10000,
          supportedFormats: ['application/json'],
          authentication: 'API Key authentication',
          rateLimit: '10 requests per minute'
        }
      }
    });

  } catch (error) {
    console.error('ERNIE改写API信息获取错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取API信息失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}