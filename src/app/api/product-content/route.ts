import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/service';

interface ProductRequest {
    imageBase64: string;
    productHint?: string;
}

interface ProductResult {
    productName: string;
    titles: string[];
    content: string;
    tags: string[];
}

export async function POST(request: NextRequest) {
    try {
        const body: ProductRequest = await request.json();
        const { imageBase64, productHint } = body;

        if (!imageBase64) {
            return NextResponse.json(
                { success: false, error: '请上传产品图片' },
                { status: 400 }
            );
        }

        const aiService = getAIService();

        // Build the prompt
        const systemPrompt = `你是小红书顶流种草博主，擅长根据产品图片创作爆款文案。

你的任务：
1. 仔细观察图片中的产品
2. 识别产品类型和特点
3. 创作一篇500字左右的种草笔记

输出格式（严格遵守）：
===PRODUCT_NAME===
（产品名称或类型，简短）
===PRODUCT_NAME_END===

===TITLES===
标题1（使用emoji，有吸引力）
标题2
标题3
===TITLES_END===

===CONTENT===
（500字左右的种草正文，包含：
- 开头用"姐妹们"或"宝子们"打招呼
- 分享发现这个产品的契机
- 详细描述使用体验和效果
- 真实感受，带emoji表情
- 给出推荐理由）
===CONTENT_END===

===TAGS===
标签1
标签2
标签3
标签4
标签5
===TAGS_END===`;

        const userPrompt = productHint
            ? `这是一张${productHint}的图片，请根据图片创作小红书种草笔记。`
            : '请观察这张产品图片，识别产品并创作小红书种草笔记。';

        // Prefer the vision-capable model; fall back to text in the catch block.
        // Using glm-4.5v-flash for vision (user has 6M token package)
        const resolvedModel = 'glm-4.5v-flash';

        // For GLM-4V, we need to send image in a specific format
        const messages = [
            { role: 'system' as const, content: systemPrompt },
            {
                role: 'user' as const,
                content: [
                    { type: 'text', text: userPrompt },
                    { type: 'image_url', image_url: { url: imageBase64 } }
                ]
            }
        ];

        const response = await aiService.generateText({
            messages: messages as Parameters<typeof aiService.generateText>[0]['messages'],
            temperature: 0.8,
            max_tokens: 2000,
            model: resolvedModel
        });

        const fullText = response.choices[0]?.message?.content || '';
        const result = parseProductResult(fullText, productHint);

        return NextResponse.json({ success: true, data: result });

    } catch (error) {
        console.error('Product content generation error:', error);

        // If vision model fails, try with a text-only fallback
        try {
            const body: ProductRequest = await request.json().catch(() => ({ imageBase64: '', productHint: '' }));
            const result = await generateFallbackContent(body.productHint || '产品');
            return NextResponse.json({ success: true, data: result });
        } catch {
            return NextResponse.json(
                { success: false, error: '生成失败，请重试' },
                { status: 500 }
            );
        }
    }
}

function parseProductResult(fullText: string, productHint?: string): ProductResult {
    // Extract product name
    let productName = productHint || '';
    const nameMatch = fullText.match(/===PRODUCT_NAME===\s*([\s\S]*?)\s*===PRODUCT_NAME_END===/);
    if (nameMatch) {
        productName = nameMatch[1].trim();
    }

    // Extract titles
    let titles: string[] = [];
    const titlesMatch = fullText.match(/===TITLES===\s*([\s\S]*?)\s*===TITLES_END===/);
    if (titlesMatch) {
        titles = titlesMatch[1]
            .split('\n')
            .map(t => t.replace(/^标题\d+[：:\s]*/g, '').trim())
            .filter(t => t.length > 0 && t.length < 50)
            .slice(0, 3);
    }

    // Fallback titles
    if (titles.length === 0) {
        const name = productName || '好物';
        titles = [
            `${name}｜真的太好用了吧！`,
            `姐妹们！这个${name}绝了！`,
            `后悔没早发现这个${name}...`
        ];
    }

    // Extract content
    let content = '';
    const contentMatch = fullText.match(/===CONTENT===\s*([\s\S]*?)\s*===CONTENT_END===/);
    if (contentMatch) {
        content = contentMatch[1].trim();
    } else {
        content = fullText
            .replace(/===\w+(?:_END)?===/g, '')
            .replace(/标题\d+[：:]/g, '')
            .trim()
            .slice(0, 600);
    }

    // Extract tags
    let tags: string[] = [];
    const tagsMatch = fullText.match(/===TAGS===\s*([\s\S]*?)\s*===TAGS_END===/);
    if (tagsMatch) {
        tags = tagsMatch[1]
            .split('\n')
            .map(t => t.replace(/^标签\d+[：:\s#]*/g, '').trim())
            .filter(t => t.length > 0 && t.length < 20)
            .slice(0, 5);
    }

    // Fallback tags
    if (tags.length === 0) {
        tags = [productName || '好物', '真实测评', '好物分享', '种草', '推荐'];
    }

    return {
        productName,
        titles,
        content,
        tags
    };
}

async function generateFallbackContent(productName: string): Promise<ProductResult> {
    const aiService = getAIService();

    const response = await aiService.generateText({
        messages: [
            {
                role: 'system',
                content: '你是小红书种草博主，擅长创作吸引人的产品推荐文案。'
            },
            {
                role: 'user',
                content: `请为"${productName}"创作一篇500字左右的小红书种草笔记，包含3个标题选项和5个推荐标签。使用emoji，语气亲切自然。`
            }
        ],
        temperature: 0.8,
        max_tokens: 1500
    });

    const fullText = response.choices[0]?.message?.content || '';
    return parseProductResult(fullText, productName);
}
