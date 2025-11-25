import { AIProvider, AIRequest, AIResponse } from '@/types/ai';
import { HunyuanClient, HunyuanResponse } from '@/lib/hunyuan/client';
import { getHunyuanConfig } from '@/lib/hunyuan/env';
import { HunyuanModel, HUNYUAN_MODELS } from '@/lib/hunyuan/config';

function isValidModel(model?: string): model is HunyuanModel {
  if (!model) return false;
  return Object.keys(HUNYUAN_MODELS).includes(model);
}

export class TencentHunyuanProvider implements AIProvider {
  name = 'tencent';
  private client: HunyuanClient;
  private defaultModel: HunyuanModel;

  constructor() {
    const config = getHunyuanConfig();
    this.client = new HunyuanClient(config);
    this.defaultModel = config.defaultModel || 'hunyuan-lite';
  }

  private mapMessages(messages: AIRequest['messages']) {
    if (!messages || messages.length === 0) {
      throw new Error('messages 参数不能为空');
    }

    return messages.map(message => ({
      Role: message.role === 'assistant' ? 'assistant' : 'user',
      Content: message.content
    }));
  }

  private transformResponse(response: HunyuanResponse): AIResponse {
    return {
      choices: response.Choices.map(choice => ({
        message: {
          role: choice.Message.Role,
          content: choice.Message.Content
        },
        finish_reason: choice.FinishReason
      })),
      usage: {
        prompt_tokens: response.Usage.PromptTokens,
        completion_tokens: response.Usage.CompletionTokens,
        total_tokens: response.Usage.TotalTokens
      }
    };
  }

  private resolveModel(requestedModel?: string): HunyuanModel {
    if (isValidModel(requestedModel)) {
      return requestedModel;
    }
    return this.defaultModel;
  }

  async generateText(request: AIRequest): Promise<AIResponse> {
    const model = this.resolveModel(request.model);
    const response = await this.client.chat(model, {
      Messages: this.mapMessages(request.messages),
      Temperature: request.temperature ?? 0.7,
      TopP: 0.9
    });

    return this.transformResponse(response);
  }

  async generateTextStream(request: AIRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const model = this.resolveModel(request.model);

    return new ReadableStream<Uint8Array>({
      start: async controller => {
        try {
          for await (const chunk of this.client.chatStream(model, {
            Messages: this.mapMessages(request.messages),
            Temperature: request.temperature ?? 0.7,
            TopP: 0.9
          })) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }
}
