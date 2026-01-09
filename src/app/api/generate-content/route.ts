import { NextRequest } from 'next/server';
import { getAIService } from '@/lib/ai/service';
import { getZhipuConfig } from '@/lib/zhipu/env';

type ContentStyle = 'zhongcao' | 'ceping' | 'fenxiang' | 'jiaocheng';

interface ContentRequest {
    topic: string;
    style: ContentStyle;
    model?: string;
}

interface StreamPayload {
    type: 'content' | 'result' | 'error';
    data: string | ContentResult;
}

interface ContentResult {
    content: string;
    tags: string[];
    suggestedTitles: string[];
}

const STYLE_PROMPTS: Record<ContentStyle, string> = {
    zhongcao: `你是小红书顶流种草博主，擅长用生活化口吻分享真实使用体验。
风格特点：
- 开头用亲切的称呼如"姐妹们"、"宝子们"
- 大量使用emoji表情增强阅读趣味
- 真实分享使用前后对比体验
- 结尾给出真诚购买建议`,

    ceping: `你是专业测评博主，擅长客观、深度地评测产品。
风格特点：
- 用数据和事实说话
- 多角度分析优缺点
- 对比同类竞品
- 给出性价比建议`,

    fenxiang: `你是生活方式博主，擅长分享实用经验和干货知识。
风格特点：
- 条理清晰的分点阐述
- 分享踩坑经验和解决方案
- 给出可执行的行动建议
- 真诚分享个人成长感悟`,

    jiaocheng: `你是保姆级教程博主，擅长用最简单的方式讲解方法步骤。
风格特点：
- 步骤编号清晰明了
- 每一步都足够详细小白也能看懂
- 可能的坑点提前标注
- 附上效果验证方法`
};

const STREAM_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
};

export async function POST(request: NextRequest) {
    try {
        const body: ContentRequest = await request.json();
        const { topic, style = 'zhongcao', model } = body;

        if (!topic?.trim()) {
            return new Response(JSON.stringify({ error: '请输入产品或话题' }), { status: 400 });
        }

        const zhipuConfig = getZhipuConfig();
        const resolvedModel = model || zhipuConfig.defaultModel || 'glm-4-flash';

        const aiService = getAIService();

        const systemPrompt = `${STYLE_PROMPTS[style]}

你的任务：为用户创作一篇关于"${topic}"的小红书爆款笔记。

输出格式要求（严格按照以下格式）：
===CONTENT_START===
（在这里输出你的500字左右的小红书正文，包含emoji，段落分明）
===CONTENT_END===

===TITLES_START===
标题1
标题2
标题3
===TITLES_END===

===TAGS_START===
标签1
标签2
标签3
标签4
标签5
===TAGS_END===

注意：
1. 正文内容约500字，要有吸引力和可读性
2. 生成3个吸引人的标题供用户选择
3. 生成5个相关话题标签（不含#号）`;

        const upstreamStream = await aiService.generateTextStream({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `请为"${topic}"创作一篇小红书爆款笔记` }
            ],
            temperature: 0.8,
            max_tokens: 2000,
            model: resolvedModel
        });

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullContent = '';

        const transformedStream = new ReadableStream<Uint8Array>({
            async start(controller) {
                const reader = upstreamStream.getReader();

                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        fullContent += chunk;

                        // Stream content as it comes
                        const contentPayload: StreamPayload = { type: 'content', data: chunk };
                        controller.enqueue(encoder.encode(JSON.stringify(contentPayload) + '\n'));
                    }

                    // Parse final result
                    const result = parseContent(fullContent, topic);
                    const resultPayload: StreamPayload = { type: 'result', data: result };
                    controller.enqueue(encoder.encode(JSON.stringify(resultPayload) + '\n'));

                    controller.close();
                } catch (error) {
                    const errorPayload: StreamPayload = {
                        type: 'error',
                        data: error instanceof Error ? error.message : '生成失败'
                    };
                    controller.enqueue(encoder.encode(JSON.stringify(errorPayload) + '\n'));
                    controller.close();
                }
            }
        });

        return new Response(transformedStream, { headers: STREAM_HEADERS });

    } catch (error) {
        console.error('Content generation error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : '生成失败' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

function parseContent(fullText: string, topic: string): ContentResult {
    // Extract content
    let content = '';
    const contentMatch = fullText.match(/===CONTENT_START===\s*([\s\S]*?)\s*===CONTENT_END===/);
    if (contentMatch) {
        content = contentMatch[1].trim();
    } else {
        // Fallback: use the full text as content
        content = fullText
            .replace(/===\w+_(?:START|END)===/g, '')
            .replace(/标题\d+[：:]/g, '')
            .replace(/标签\d+[：:]/g, '')
            .trim()
            .slice(0, 600);
    }

    // Extract titles
    let titles: string[] = [];
    const titlesMatch = fullText.match(/===TITLES_START===\s*([\s\S]*?)\s*===TITLES_END===/);
    if (titlesMatch) {
        titles = titlesMatch[1]
            .split('\n')
            .map(t => t.replace(/^标题\d+[：:\s]*/g, '').trim())
            .filter(t => t.length > 0 && t.length < 50)
            .slice(0, 3);
    }

    // Fallback titles
    if (titles.length === 0) {
        titles = [
            `${topic}｜用了才知道有多香！`,
            `姐妹们！这个${topic}真的绝了！`,
            `后悔没早点发现这个${topic}...`
        ];
    }

    // Extract tags
    let tags: string[] = [];
    const tagsMatch = fullText.match(/===TAGS_START===\s*([\s\S]*?)\s*===TAGS_END===/);
    if (tagsMatch) {
        tags = tagsMatch[1]
            .split('\n')
            .map(t => t.replace(/^标签\d+[：:\s#]*/g, '').trim())
            .filter(t => t.length > 0 && t.length < 20)
            .slice(0, 5);
    }

    // Fallback tags
    if (tags.length === 0) {
        tags = [topic, '好物分享', '真实测评', '个人体验', '推荐'];
    }

    return {
        content,
        suggestedTitles: titles,
        tags
    };
}
