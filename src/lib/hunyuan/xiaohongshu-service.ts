// 小红书专用改写服务 - 腾讯云混元版本
import { HunyuanClient, HunyuanResponse } from './client';
import { RewriteRequest, RewriteResponse } from './config';
import { getRewritePrompt, getTitlePrompt, getTagsPrompt, getSuggestionsPrompt } from './prompts';
import { getHunyuanConfig } from './env';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '未知错误';
}

export class XiaohongshuService {
  private client: HunyuanClient;

  constructor() {
    const config = getHunyuanConfig();
    this.client = new HunyuanClient(config);
  }

  /**
   * 改写小红书内容
   */
  async rewriteContent(request: RewriteRequest): Promise<RewriteResponse> {
    const { content, type, style, model = 'hunyuan-lite', temperature = 0.7 } = request;

    // 根据改写类型选择提示词
    const systemPrompt = getRewritePrompt(content, type, style);

    try {
      console.log('调用腾讯云混元改写服务:', {
        model,
        rewriteType: type,
        contentLength: content.length
      });

      // 调用混元API
      const response = await this.client.chat(model, {
        Messages: [
          {
            Role: 'user',
            Content: systemPrompt
          }
        ],
        Temperature: temperature,
        TopP: 0.9
      });

      const responseContent = this.getChoiceContent(response);

      // 解析响应内容
      const rewrittenContent = this.parseRewrittenContent(responseContent);
      const suggestedTitles = this.extractTitles(responseContent);
      const tags = this.extractTags(responseContent);
      const suggestions = this.extractSuggestions(responseContent);

      // 计算费用
      const cost = this.client.calculateCost(
        model,
        response.Usage.PromptTokens,
        response.Usage.CompletionTokens
      );

      console.log('腾讯云混元改写完成:', {
        model,
        cost,
        totalTokens: response.Usage.TotalTokens
      });

      return {
        rewrittenContent,
        suggestedTitles,
        tags,
        suggestions,
        model,
        usage: {
          promptTokens: response.Usage.PromptTokens,
          completionTokens: response.Usage.CompletionTokens,
          totalTokens: response.Usage.TotalTokens,
          cost
        }
      };

    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('腾讯云混元改写失败:', error);

      // 如果是配置错误，返回更友好的提示
      if (message.includes('环境变量')) {
        throw new Error('腾讯云AI服务配置错误，请联系管理员配置API密钥');
      }

      throw new Error(`AI改写服务暂时不可用: ${message}`);
    }
  }

  /**
   * 生成新标题
   */
  async generateTitles(content: string, count = 5): Promise<string[]> {
    const prompt = getTitlePrompt(content);

    try {
      const response = await this.client.chat('hunyuan-lite', {
        Messages: [
          {
            Role: 'user',
            Content: prompt
          }
        ],
        Temperature: 0.8,
        TopP: 0.9
      });

      return this.extractTitles(this.getChoiceContent(response)).slice(0, count);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('标题生成失败:', error);
      throw new Error(`标题生成失败: ${message}`);
    }
  }

  /**
   * 生成话题标签
   */
  async generateTags(content: string): Promise<string[]> {
    const prompt = getTagsPrompt(content);

    try {
      const response = await this.client.chat('hunyuan-lite', {
        Messages: [
          {
            Role: 'user',
            Content: prompt
          }
        ],
        Temperature: 0.6,
        TopP: 0.8
      });

      return this.extractTags(this.getChoiceContent(response));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('标签生成失败:', error);
      throw new Error(`标签生成失败: ${message}`);
    }
  }

  /**
   * 生成优化建议
   */
  async generateSuggestions(content: string): Promise<string[]> {
    const prompt = getSuggestionsPrompt(content);

    try {
      const response = await this.client.chat('hunyuan-lite', {
        Messages: [
          {
            Role: 'user',
            Content: prompt
          }
        ],
        Temperature: 0.7,
        TopP: 0.8
      });

      return this.extractSuggestions(this.getChoiceContent(response));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('建议生成失败:', error);
      throw new Error(`建议生成失败: ${message}`);
    }
  }

  /**
   * 解析改写后的内容
   */
  private parseRewrittenContent(result: string): string {
    // 移除可能的标题和标签部分，提取主要内容
    const lines = result.split('\n').filter(line => line.trim());

    // 寻找正文内容（跳过标题建议和标签）
    let contentStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 跳过标题行（通常较短或包含数字编号）
      if (line.length > 20 && !line.match(/^\d+[\.\)]/) && !line.includes('标题') && !line.includes('标签')) {
        contentStartIndex = i;
        break;
      }
    }

    const contentLines: string[] = [];
    for (let i = contentStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      // 停止在标签部分之前
      if (line.includes('#') && line.split('#').length > 2) {
        break;
      }
      if (line && !line.includes('标题建议') && !line.includes('话题标签')) {
        contentLines.push(line);
      }
    }

    return contentLines.join('\n').trim() || result;
  }

  /**
   * 提取标题建议
   */
  private extractTitles(result: string): string[] {
    const titles: string[] = [];
    const lines = result.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      // 匹配标题模式
      if (
        trimmedLine.includes('标题') ||
        trimmedLine.match(/^\d+[\.\)]/) ||
        (trimmedLine.length > 10 && trimmedLine.length < 30 && trimmedLine.match(/[^\w\s]/)) // 包含emoji
      ) {
        // 清理标题
        const title = trimmedLine
          .replace(/^\d+[\.\)]\s*/, '') // 移除编号
          .replace(/标题[：:]?\s*/, '') // 移除"标题:"前缀
          .trim();

        if (title && title.length > 5 && title.length < 50) {
          titles.push(title);
        }
      }
    }

    return titles.slice(0, 5); // 最多返回5个标题
  }

  /**
   * 提取话题标签
   */
  private extractTags(result: string): string[] {
    const tags: string[] = [];

    // 匹配 #话题 标签
    const hashtagMatches = result.match(/#[\w\u4e00-\u9fa5]+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches);
    }

    // 如果没有找到标签，生成默认标签
    if (tags.length === 0) {
      tags.push('#小红书', '#分享', '#推荐');
    }

    return tags.slice(0, 8); // 最多返回8个标签
  }

  /**
   * 提取优化建议
   */
  private extractSuggestions(result: string): string[] {
    const suggestions: string[] = [];
    const lines = result.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      // 匹配建议模式
      if (
        trimmedLine.includes('建议') ||
        trimmedLine.includes('可以') ||
        trimmedLine.includes('优化') ||
        trimmedLine.match(/^\d+[\.\)]/)
      ) {
        const suggestion = trimmedLine
          .replace(/^\d+[\.\)]\s*/, '') // 移除编号
          .replace(/建议[：:]?\s*/, '') // 移除"建议:"前缀
          .trim();

        if (suggestion && suggestion.length > 10 && suggestion.length < 100) {
          suggestions.push(suggestion);
        }
      }
    }

    // 如果没有找到建议，生成默认建议
    if (suggestions.length === 0) {
      suggestions.push(
        '可以添加更多个人体验和感受',
        '建议增加相关话题标签提升曝光',
        '可以添加更多图片或视频内容'
      );
    }

    return suggestions.slice(0, 5); // 最多返回5条建议
  }
  private getChoiceContent(response: HunyuanResponse): string {
    const content = response.Choices?.[0]?.Message?.Content;
    if (!content) {
      console.error('腾讯云混元响应为空或格式异常:', response);
      throw new Error('AI响应为空，请稍后重试或检查提示词内容');
    }
    return content;
  }
}

// 导出单例实例
export const xiaohongshuService = new XiaohongshuService();
