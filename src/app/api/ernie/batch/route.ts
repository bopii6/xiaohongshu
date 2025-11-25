import { NextRequest, NextResponse } from 'next/server';
import { XiaohongshuService } from '@/lib/ernie/xiaohongshu-service';
import { getErnieClientConfig } from '@/lib/ernie/env';

// POST /api/ernie/batch - 批量内容改写
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
    const { contents, type, targetStyle, model } = body;

    // 验证必需参数
    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json(
        { error: 'contents 参数是必需的，且必须是数组' },
        { status: 400 }
      );
    }

    if (contents.length === 0) {
      return NextResponse.json(
        { error: 'contents 数组不能为空' },
        { status: 400 }
      );
    }

    if (contents.length > 10) {
      return NextResponse.json(
        { error: '批量处理最多支持10条内容' },
        { status: 400 }
      );
    }

    // 验证每个内容项
    for (let i = 0; i < contents.length; i++) {
      if (!contents[i] || typeof contents[i] !== 'string') {
        return NextResponse.json(
          { error: `contents[${i}] 必须是非空字符串` },
          { status: 400 }
        );
      }

      if (contents[i].length > 10000) {
        return NextResponse.json(
          { error: `contents[${i}] 长度不能超过10000字符` },
          { status: 400 }
        );
      }
    }

    if (!type || !['polish', 'expand', 'summarize', 'style', 'seo', 'emotion'].includes(type)) {
      return NextResponse.json(
        { error: 'type 参数必须是以下之一: polish, expand, summarize, style, seo, emotion' },
        { status: 400 }
      );
    }

    // 获取配置
    const config = getErnieClientConfig();

    // 创建服务实例
    const service = new XiaohongshuService(config.apiKey, config.secretKey);

    // 计算预估成本
    const estimatedCost = contents.reduce((total, content) => {
      return total + service.estimateCost(content, type);
    }, 0);

    // 执行批量改写
    const startTime = Date.now();
    const results = await service.rewriteBatch({
      contents,
      type,
      targetStyle,
      model
    });
    const processingTime = Date.now() - startTime;

    // 计算实际成本和使用统计
    const totalUsage = {
      promptTokens: results.reduce((sum, r) => sum + r.usage.promptTokens, 0),
      completionTokens: results.reduce((sum, r) => sum + r.usage.completionTokens, 0),
      totalTokens: results.reduce((sum, r) => sum + r.usage.totalTokens, 0),
      cost: results.reduce((sum, r) => sum + r.usage.cost, 0)
    };

    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        results: results.map((result, index) => ({
          index,
          originalContent: result.originalContent,
          rewrittenContent: result.rewrittenContent,
          rewrittenTitle: result.rewrittenTitle,
          usage: result.usage,
          processingTime: result.processingTime
        })),
        summary: {
          totalProcessed: results.length,
          totalUsage,
          totalProcessingTime: processingTime,
          estimatedCost: parseFloat(estimatedCost.toFixed(4)),
          actualCost: parseFloat(totalUsage.cost.toFixed(4))
        }
      }
    });

  } catch (error) {
    console.error('ERNIE批量改写API错误:', error);

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

// GET /api/ernie/batch - 获取批量处理信息
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        description: '批量内容改写API，支持同时处理多条内容',
        limits: {
          maxBatchSize: 10,
          maxContentLength: 10000,
          supportedFormats: ['application/json']
        },
        pricing: {
          costPerRequest: '根据选择的模型和使用量计算',
          models: {
            'ernie-4.0-8k': '0.12元/千tokens',
            'ernie-3.5-8k': '0.008元/千tokens',
            'ernie-3.5-128k': '0.024元/千tokens',
            'ernie-speed-8k': '0.004元/千tokens',
            'ernie-speed-128k': '0.012元/千tokens',
            'ernie-tiny-8k': '0.002元/千tokens'
          }
        },
        bestPractices: [
          '批量处理适合相似类型的内容',
          '建议一次处理3-5条内容以获得最佳性能',
          '长文本建议使用ernie-3.5-128k模型',
          '简单任务可以使用ernie-tiny-8k节省成本',
          '处理前请检查内容格式和长度'
        ],
        example: {
          request: {
            contents: [
              '今天去了新开的咖啡店，环境很棒！',
              '推荐大家尝试一下他们家的拿铁'
            ],
            type: 'expand',
            targetStyle: '生活记录'
          },
          response: {
            results: [
              {
                index: 0,
                rewrittenContent: '☕️今天发现了一家宝藏咖啡店！环境真的太治愈了～',
                usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230, cost: 0.0024 }
              },
              {
                index: 1,
                rewrittenContent: '✨他们家的拿铁必须推荐！口感丝滑，奶泡绵密...',
                usage: { promptTokens: 140, completionTokens: 75, totalTokens: 215, cost: 0.0022 }
              }
            ],
            summary: {
              totalProcessed: 2,
              totalUsage: { cost: 0.0046 },
              totalProcessingTime: 3500
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('ERNIE批量API信息获取错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取批量API信息失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}