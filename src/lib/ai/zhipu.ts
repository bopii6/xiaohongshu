import { AIProvider, AIRequest, AIResponse } from '@/types/ai';
import { ZhipuClient, ZhipuResponse } from '@/lib/zhipu/client';
import { getZhipuConfig } from '@/lib/zhipu/env';
import { ZhipuModel, ZHIPU_MODELS } from '@/lib/zhipu/config';

function isValidModel(model?: string): model is ZhipuModel {
    if (!model) return false;
    return Object.keys(ZHIPU_MODELS).includes(model);
}

export class ZhipuProvider implements AIProvider {
    name = 'zhipu';
    private client: ZhipuClient;
    private defaultModel: ZhipuModel;

    constructor() {
        const config = getZhipuConfig();
        this.client = new ZhipuClient(config);
        this.defaultModel = config.defaultModel || 'glm-4-flash';
    }

    private mapMessages(messages: AIRequest['messages']) {
        if (!messages || messages.length === 0) {
            throw new Error('messages cannot be empty');
        }

        return messages.map(message => ({
            role: message.role,
            content: message.content
        }));
    }

    private transformResponse(response: ZhipuResponse): AIResponse {
        return {
            choices: response.choices.map(choice => ({
                message: {
                    role: choice.message.role,
                    content: choice.message.content
                },
                finish_reason: choice.finish_reason
            })),
            usage: response.usage ? {
                prompt_tokens: response.usage.prompt_tokens,
                completion_tokens: response.usage.completion_tokens,
                total_tokens: response.usage.total_tokens
            } : undefined
        };
    }

    private resolveModel(requestedModel?: string): ZhipuModel {
        if (isValidModel(requestedModel)) {
            return requestedModel;
        }
        return this.defaultModel;
    }

    async generateText(request: AIRequest): Promise<AIResponse> {
        const model = this.resolveModel(request.model);
        const response = await this.client.chat({
            model: model,
            messages: this.mapMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            top_p: 0.9,
            max_tokens: request.max_tokens
        });

        return this.transformResponse(response);
    }

    async generateTextStream(request: AIRequest): Promise<ReadableStream<Uint8Array>> {
        const encoder = new TextEncoder();
        const model = this.resolveModel(request.model);

        return new ReadableStream<Uint8Array>({
            start: async controller => {
                try {
                    for await (const chunk of this.client.chatStream({
                        model: model,
                        messages: this.mapMessages(request.messages),
                        temperature: request.temperature ?? 0.7,
                        top_p: 0.9,
                        max_tokens: request.max_tokens
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
