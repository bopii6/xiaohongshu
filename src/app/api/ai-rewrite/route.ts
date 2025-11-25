import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/service';
import { getZhipuConfig } from '@/lib/zhipu/env';
import { AIRequest } from '@/types/ai';

interface RewriteRequest {
  originalTitle: string;
  originalContent: string;
  style: RewriteStyle;
  model?: string;
}

interface RewriteResult {
  originalTitle: string;
  originalContent: string;
  newContent: string;
  newTitles: string[];
  keyPoints: string[];
  model: string;
}

type RewriteStyle = 'similar' | 'creative' | 'professional' | 'casual';
type RewriteMode = 'polish' | 'expand' | 'shorten' | 'style';
type PromptFlavor = 'default' | 'enhanced';

type StreamPayload =
  | { type: 'content'; data: string }
  | { type: 'result'; data: RewriteResult }
  | { type: 'error'; data: string };

const aiService = getAIService();

const STREAM_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no'
};

const CONTENT_START = '<<<CONTENT_START>>>';
const CONTENT_END = '<<<CONTENT_END>>>';
const META_START = '<<<META_START>>>';
const META_END = '<<<META_END>>>';

const MIN_TITLE_COUNT = 4;
const MAX_KEYPOINTS = 5;
const DEFAULT_KEYPOINTS = ['好物推荐', '真实测评', '使用心得'];

const STYLE_GUIDES: Record<RewriteStyle, string> = {
  similar: '保持原文真实记录感，语言自然亲切，适当加入 emoji。',
  creative: '勇于打破常规，制造亮点，语言生动，注意节奏。',
  professional: '结构清晰、用词专业，可引用数据或对比，突出可信度。',
  casual: '语气轻松口语化，像和朋友聊天一样，融入生活化场景。'
};

const MODE_DESCRIPTIONS: Record<RewriteMode, string> = {
  polish: '润色优化表达，提升可读性与吸引力，保留核心信息。',
  expand: '扩写并补充细节，加入场景、体验或使用技巧。',
  shorten: '精简内容，突出核心卖点和必须信息。',
  style: '转换整体风格，使其符合指定的小红书内容定位。'
};

const MODEL_ALIASES: Record<string, string> = {
  glm4: 'glm-4-flash',
  'glm-4': 'glm-4',
  'glm-4-flash': 'glm-4-flash',
  'glm-4-plus': 'glm-4-plus',
  'glm-4-air': 'glm-4-air',
  'glm-4-long': 'glm-4-long',
  'glm-4-0520': 'glm-4-0520',
  'glm4.5': 'glm-4.5',
  'glm-4.5': 'glm-4.5',
  'glm-4.5-flash': 'glm-4.5-flash',
  'glm-4.5_flash': 'glm-4.5-flash',
  'glm4.5-flash': 'glm-4.5-flash'
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RewriteRequest;
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const config = getZhipuConfig();
    if (!config.apiKey) {
      return NextResponse.json({ success: false, error: '未配置 ZHIPU_API_KEY，无法调用智谱接口' }, { status: 500 });
    }

    const resolvedModel = resolveModel(body.model, config.defaultModel || 'glm-4-flash');
    const flavor: PromptFlavor = resolvedModel === 'glm-4.5' ? 'enhanced' : 'default';
    const rewriteType = mapStyleToRewriteType(body.style);
    const targetStyle = mapStyleToXiaohongshuStyle(body.style);

    const messages: AIRequest['messages'] = [
      { role: 'system', content: buildSystemPrompt(body.style, rewriteType, targetStyle, flavor) },
      { role: 'user', content: buildUserPrompt({ ...body, rewriteType, targetStyle }) }
    ];

    const { maxTokens, temperature } = resolveGenerationParams(
      resolvedModel,
      body.style,
      body.originalContent.length
    );

    const stream = await aiService.generateTextStream(
      {
        messages,
        temperature,
        max_tokens: maxTokens,
        model: resolvedModel
      },
      'zhipu'
    );

    const streamingResponse = makeRewriteStream(stream, {
      ...body,
      rewriteType,
      targetStyle,
      model: resolvedModel
    });

    return new Response(streamingResponse, { headers: STREAM_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : '改写失败，请稍后再试';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function validateRequest(body: RewriteRequest): string | null {
  if (!body.originalTitle?.trim() || !body.originalContent?.trim()) {
    return '原标题和正文内容不能为空';
  }
  if (!['similar', 'creative', 'professional', 'casual'].includes(body.style)) {
    return '无效的改写风格';
  }
  return null;
}

function resolveModel(model: string | undefined, fallback: string): string {
  if (!model) return fallback;
  return MODEL_ALIASES[model.toLowerCase()] || model;
}

function mapStyleToRewriteType(style: RewriteStyle): RewriteMode {
  const map: Record<RewriteStyle, RewriteMode> = {
    similar: 'polish',
    creative: 'expand',
    professional: 'style',
    casual: 'polish'
  };
  return map[style];
}

function mapStyleToXiaohongshuStyle(style: RewriteStyle): string {
  const map: Record<RewriteStyle, string> = {
    similar: '生活记录',
    creative: '种草推荐',
    professional: '干货分享',
    casual: '生活记录'
  };
  return map[style];
}

function resolveGenerationParams(model: string, style: RewriteStyle, contentLength: number) {
  const estimatedTokens = Math.min(3200, Math.max(900, Math.floor(contentLength * 1.5)));

  if (model === 'glm-4.5') {
    return {
      maxTokens: Math.max(estimatedTokens, 1500),
      temperature: 0.7
    };
  }

  if (model === 'glm-4.5-flash' || model === 'glm-4-flash') {
    return {
      maxTokens: Math.max(Math.min(estimatedTokens, 1800), 900),
      temperature: style === 'creative' ? 0.75 : 0.65
    };
  }

  return {
    maxTokens: Math.max(estimatedTokens, 1200),
    temperature: style === 'creative' ? 0.85 : 0.75
  };
}

function buildSystemPrompt(style: RewriteStyle, rewriteType: RewriteMode, targetStyle: string, flavor: PromptFlavor) {
  const base = `你是一名资深的小红书内容创作专家，需要根据用户给出的原文，产出具有传播力的爆款文案。
- 风格提示：${STYLE_GUIDES[style]}
- 改写类型：${MODE_DESCRIPTIONS[rewriteType]}
- 目标定位：${targetStyle}

输出格式非常关键，请严格遵循：
第一行必须只输出 ${CONTENT_START}
随后输出正文，多段落排版，可使用 emoji，不得夹杂其他结构或提示。
${CONTENT_END}
${META_START}
{"newTitles": ["标题1","标题2"], "keyPoints": ["要点1","要点2"]}
${META_END}
必须严格按照先正文、后 JSON 的顺序输出。
禁止在上述标记以外输出任何说明、统计、二维码提示或推广信息。`;

  if (flavor === 'enhanced') {
    return `${base}

额外要求：
1. ${CONTENT_START} 与 ${CONTENT_END} 之间只能包含正文文本，禁止再次输出 JSON。
2. ${META_START} 区域严格输出合法 JSON，字段名仅限 newTitles、keyPoints。
3. 不得输出未定义的标记或额外说明。`;
  }

  return base;
}

function buildUserPrompt(params: {
  originalTitle: string;
  originalContent: string;
  rewriteType: RewriteMode;
  targetStyle: string;
  style: RewriteStyle;
}): string {
  const { originalTitle, originalContent, rewriteType, targetStyle, style } = params;

  const lines = [
    `原始标题：${originalTitle}`,
    '',
    '原始正文：',
    originalContent,
    '',
    '补充要求：',
    `- 改写类型：${MODE_DESCRIPTIONS[rewriteType]}`,
    `- 小红书定位：${targetStyle}`,
    `- 语气提示：${STYLE_GUIDES[style]}`
  ];

  lines.push('', '请严格遵循系统提示给出的输出结构。');
  return lines.join('\n');
}

function makeRewriteStream(
  upstream: ReadableStream<Uint8Array>,
  context: RewriteRequest & { rewriteType: RewriteMode; targetStyle: string; model: string }
) {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let buffer = '';
  let lastLength = 0;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const { content, length } = extractContent(buffer);
          if (content && length > lastLength) {
            const delta = content.slice(lastLength);
            lastLength = length;
            enqueueJSON(controller, { type: 'content', data: delta }, encoder);
          }
        }

        const result = await finalizeResult(buffer, context);
        enqueueJSON(controller, { type: 'result', data: result }, encoder);
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI流式输出失败';
        enqueueJSON(controller, { type: 'error', data: message }, encoder);
        controller.close();
      } finally {
        reader.releaseLock();
      }
    }
  });
}

function extractContent(buffer: string): { content: string | null; length: number } {
  const startIndex = buffer.indexOf(CONTENT_START);
  if (startIndex === -1) {
    return { content: null, length: 0 };
  }
  const endIndex = buffer.indexOf(CONTENT_END, startIndex + CONTENT_START.length);
  if (endIndex === -1) {
    return {
      content: buffer.slice(startIndex + CONTENT_START.length),
      length: buffer.length - (startIndex + CONTENT_START.length)
    };
  }
  const content = buffer.slice(startIndex + CONTENT_START.length, endIndex);
  return { content, length: content.length };
}

async function finalizeResult(
  buffer: string,
  context: RewriteRequest & { rewriteType: RewriteMode; targetStyle: string; model: string }
): Promise<RewriteResult> {
  const content = extractSection(buffer, CONTENT_START, CONTENT_END)?.trim() || context.originalContent;
  const metaRaw = extractSection(buffer, META_START, META_END);
  const metadata = parseMetadata(metaRaw);

  const primaryTitles = getMetaField(metadata, 'newTitles');
  const backupTitles =
    getMetaField(metadata, 'titles') ||
    getMetaField(metadata, 'suggestedTitles') ||
    getMetaField(metadata, 'rawTitles') ||
    getMetaField(metadata, 'newTitles');

  let newTitles = sanitizeTitles(primaryTitles).slice(0, MIN_TITLE_COUNT);
  if (!newTitles.length) {
    newTitles = sanitizeTitles(backupTitles).slice(0, MIN_TITLE_COUNT);
  }

  if (newTitles.length < MIN_TITLE_COUNT) {
    try {
      newTitles = await generateFallbackTitles(context, content);
    } catch {
      newTitles = fallbackTitles(newTitles, context);
    }
  }

  let keyPoints = sanitizeKeyPoints(getMetaField(metadata, 'keyPoints'));
  if (!keyPoints.length) {
    keyPoints = extractTagsFromContent(content);
  }
  if (!keyPoints.length) {
    keyPoints = DEFAULT_KEYPOINTS;
  }

  return {
    originalTitle: context.originalTitle,
    originalContent: context.originalContent,
    newContent: content.trim(),
    newTitles,
    keyPoints: keyPoints.slice(0, MAX_KEYPOINTS),
    model: context.model
  };
}

function extractSection(buffer: string, start: string, end: string): string | null {
  const startIndex = buffer.indexOf(start);
  if (startIndex === -1) return null;
  const endIndex = buffer.indexOf(end, startIndex + start.length);
  if (endIndex === -1) {
    return buffer.slice(startIndex + start.length);
  }
  return buffer.slice(startIndex + start.length, endIndex);
}

function parseMetadata(meta: string | null): Record<string, unknown> | null {
  if (!meta) return null;
  const cleaned = meta.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function getMetaField<T = unknown>(metadata: Record<string, unknown> | null, key: string): T | undefined {
  if (!metadata) return undefined;
  return metadata[key] as T | undefined;
}

function sanitizeTitles(value: unknown): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(/\n|,|，|；|;/);
  return list
    .map(item => item.replace(/^[-•*]\s*/, '').replace(/"/g, '').trim())
    .filter(item => item.length >= 4 && item.length <= 40);
}

function sanitizeKeyPoints(value: unknown): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[,#\n\s]+/);
  return list
    .map(item => item.replace(/#/g, '').trim())
    .filter(Boolean);
}

async function generateFallbackTitles(
  context: RewriteRequest & { rewriteType: RewriteMode; targetStyle: string; model: string },
  content: string
): Promise<string[]> {
  const response = await aiService.generateText(
    {
      messages: [
        {
          role: 'system',
          content:
            '你是一名擅长为小红书爆款内容设计标题的资深编辑，每个标题都需在15-25字之间，包含中文和合适的 emoji，且互不重复。'
        },
        {
          role: 'user',
          content: `请为以下内容生成 4 个不同的小红书标题，只返回换行分隔的标题文本：\n\n标题：${context.originalTitle}\n内容：${content.slice(0, 600)}`
        }
      ],
      temperature: 0.8,
      max_tokens: 400,
      model: context.model
    },
    'zhipu'
  );

  const raw = response.choices[0]?.message?.content || '';
  const candidates = raw
    .split(/\n|；|;/)
    .map(item => item.replace(/^[-•*\d\.\)]\s*/, '').trim())
    .filter(Boolean);

  const titles = sanitizeTitles(candidates).slice(0, MIN_TITLE_COUNT);
  if (titles.length >= MIN_TITLE_COUNT) {
    return titles;
  }
  return fallbackTitles(titles, context);
}

function fallbackTitles(current: string[], context: RewriteRequest & { rewriteType: RewriteMode; targetStyle: string }) {
  if (current.length >= MIN_TITLE_COUNT) return current;
  const needed = MIN_TITLE_COUNT - current.length;
  const extras = Array.from({ length: needed }).map((_, index) => `${context.originalTitle} · ${index + 1}`);
  return [...current, ...extras];
}

function extractTagsFromContent(content: string): string[] {
  const matches = content.match(/#[^\s#]+/g);
  if (matches && matches.length) {
    return matches.map(tag => tag.replace(/^#/, '')).slice(0, MAX_KEYPOINTS);
  }
  return DEFAULT_KEYPOINTS;
}

function enqueueJSON(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: StreamPayload,
  encoder: TextEncoder
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
}
