import { AIProvider, AIRequest, AIResponse, ContentRewriteRequest, ContentGenerationRequest } from '@/types/ai';
import { ZhipuProvider } from './zhipu';
import { TencentHunyuanProvider } from './tencent-hunyuan';

export class AIService {
  private provider: AIProvider;

  constructor() {
    // Default to Zhipu AI
    this.provider = new ZhipuProvider();
  }

  private ensureProvider(providerName?: string): AIProvider {
    if (providerName) {
      if (providerName.toLowerCase() === 'tencent' || providerName.toLowerCase() === 'hunyuan') {
        return new TencentHunyuanProvider();
      }
      if (providerName.toLowerCase() === 'zhipu') {
        return new ZhipuProvider();
      }
    }
    return this.provider;
  }

  async generateText(request: AIRequest, provider?: string): Promise<AIResponse> {
    const aiProvider = this.ensureProvider(provider);

    console.log(`[AI服务] 选择提供商`, {
      timestamp: new Date().toISOString(),
      requestedProvider: provider || 'default',
      actualProvider: aiProvider.constructor.name,
      messageCount: request.messages?.length,
      temperature: request.temperature,
      maxTokens: request.max_tokens,
      stream: false
    });

    try {
      const response = await aiProvider.generateText(request);

      console.log(`[AI服务] 响应完成`, {
        timestamp: new Date().toISOString(),
        provider: aiProvider.constructor.name,
        usage: response.usage
      });

      return response;
    } catch (error) {
      console.error(`[AI服务] 生成失败`, {
        timestamp: new Date().toISOString(),
        provider: aiProvider.constructor.name,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async generateTextStream(request: AIRequest, provider?: string): Promise<ReadableStream<Uint8Array>> {
    const aiProvider = this.ensureProvider(provider);

    console.log(`[AI服务] 选择提供商（流式）`, {
      timestamp: new Date().toISOString(),
      requestedProvider: provider || 'default',
      actualProvider: aiProvider.constructor.name,
      messageCount: request.messages?.length,
      temperature: request.temperature,
      maxTokens: request.max_tokens,
      stream: true
    });

    try {
      const response = await aiProvider.generateTextStream(request);
      return response;
    } catch (error) {
      console.error(`[AI服务] 流式生成失败`, {
        timestamp: new Date().toISOString(),
        provider: aiProvider.constructor.name,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async rewriteContent(request: ContentRewriteRequest, provider?: string): Promise<string> {
    const systemPrompts = {
      expand: '你是一个专业的内容创作者，擅长将简短的内容扩展为更详细、更丰富的文章。',
      simplify: '你是一个内容编辑专家，擅长将复杂的内容简化为通俗易懂的文字。',
      rephrase: '你是一个文案优化专家，擅长重新表述内容，使其更加吸引人。',
      optimize: '你是一个内容优化专家，擅长优化内容的质量、结构和表达方式。'
    };

    const toneInstructions = {
      professional: '请使用专业、正式的语调。',
      casual: '请使用轻松、随意的语调。',
      friendly: '请使用友好、亲切的语调。',
      formal: '请使用严谨、正式的语调。'
    };

    let systemPrompt = systemPrompts[request.rewriteType];

    if (request.tone) {
      systemPrompt += `\n\n${toneInstructions[request.tone]}`;
    }

    if (request.targetAudience) {
      systemPrompt += `\n\n目标受众：${request.targetAudience}`;
    }

    if (request.maxLength) {
      systemPrompt += `\n\n请将内容控制在${request.maxLength}字以内。`;
    }

    const aiRequest: AIRequest = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `请帮我改写以下内容：\n\n${request.originalContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: request.maxLength || 2000
    };

    const response = await this.generateText(aiRequest, provider);
    return response.choices[0]?.message?.content || '';
  }

  async generateContent(request: ContentGenerationRequest, provider?: string): Promise<string> {
    const contentTypePrompts = {
      xiaohongshu: '你是一个小红书内容创作专家，擅长创作吸引人的小红书笔记。',
      weibo: '你是一个微博内容创作专家，擅长创作有影响力的微博内容。',
      douyin: '你是一个抖音文案创作专家，擅长创作朗朗上口的抖音文案。',
      article: '你是一个专业文章创作专家，擅长创作深度、有价值的长篇文章。'
    };

    const lengthInstructions = {
      short: '请创作简短的内容（100-300字）。',
      medium: '请创作中等长度的内容（300-800字）。',
      long: '请创作详细的内容（800-2000字）。'
    };

    const toneInstructions = {
      professional: '请使用专业、权威的语调。',
      casual: '请使用轻松、日常的语调。',
      friendly: '请使用友好、互动的语调。',
      formal: '请使用严谨、正式的语调。'
    };

    let systemPrompt = contentTypePrompts[request.contentType];

    if (request.length) {
      systemPrompt += `\n\n${lengthInstructions[request.length]}`;
    }

    if (request.tone) {
      systemPrompt += `\n\n${toneInstructions[request.tone]}`;
    }

    let userPrompt = `请为我创作关于"${request.topic}"的${request.contentType === 'xiaohongshu' ? '小红书笔记' : request.contentType === 'weibo' ? '微博' : request.contentType === 'douyin' ? '抖音文案' : '文章'}。`;

    if (request.keywords && request.keywords.length > 0) {
      userPrompt += `\n\n请包含以下关键词：${request.keywords.join('、')}`;
    }

    const aiRequest: AIRequest = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: request.length === 'long' ? 2000 : request.length === 'medium' ? 800 : 300
    };

    const response = await this.generateText(aiRequest, provider);
    return response.choices[0]?.message?.content || '';
  }

  getAvailableProviders(): string[] {
    return ['zhipu', 'tencent'];
  }

  isProviderAvailable(provider: string): boolean {
    if (!provider) return true;
    const normalized = provider.toLowerCase();
    return normalized === 'zhipu' || normalized === 'tencent' || normalized === 'hunyuan' || normalized === 'default';
  }
}

let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
