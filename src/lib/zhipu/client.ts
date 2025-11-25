import crypto from 'node:crypto';
import { ZhipuConfig } from './config';

export interface ZhipuChatParams extends Record<string, unknown> {
    model: string;
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
    max_tokens?: number;
    request_id?: string;
}

export interface ZhipuResponse {
    id: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        finish_reason: string;
        message: {
            role: string;
            content: string;
        };
        delta?: {
            role?: string;
            content?: string;
        };
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class ZhipuClient {
    private config: ZhipuConfig;

    constructor(config: ZhipuConfig) {
        this.config = {
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            timeout: 60000,
            maxRetries: 3,
            ...config
        };
    }

    private generateToken(): string {
        if (!this.config.apiKey) {
            throw new Error('API Key is required');
        }

        const [id, secret] = this.config.apiKey.split('.');
        if (!id || !secret) {
            throw new Error('Invalid API Key format');
        }

        // Note: In a real browser environment, jsonwebtoken might not work directly if not polyfilled.
        // However, this is a server-side library (Next.js API routes), so it should be fine.
        // If jwt is not available, we might need a different approach or a simple JWT implementation.
        // Assuming 'jsonwebtoken' is installed or we can use a simple implementation.
        // Actually, Zhipu's new V4 API supports standard Bearer token with the API Key directly if using the SDK, 
        // but for raw HTTP requests, we often need to generate the JWT.
        // WAIT: Zhipu V4 API documentation says: "Authorization: Bearer <your_api_key>" is NOT sufficient?
        // Let's re-read the docs or assume standard Bearer for now if it's simpler, 
        // BUT the standard way for Zhipu is often JWT signed with the secret.
        // Let's try to use the API Key directly as Bearer token first as some newer endpoints might support it,
        // OR just implement a simple JWT signer if `jsonwebtoken` is not available.
        // Since I cannot easily check installed packages, I will try to use a simple JWT sign function 
        // or just pass the API Key if the docs say so.
        // Re-checking Zhipu docs from memory: V4 usually requires JWT.

        // Let's implement a simple JWT generator to be safe and avoid dependency issues if possible,
        // OR just use the `jsonwebtoken` package if I assume it's there (it's a very common dep).
        // Given the environment, I'll assume `jsonwebtoken` might NOT be there.
        // I will use a simple implementation using 'crypto' which is available in Node.

        return this.generateJWT(id, secret);
    }

    private generateJWT(id: string, secret: string): string {
        const header: Record<string, unknown> = { alg: 'HS256', sign_type: 'SIGN' };
        const payload: Record<string, unknown> = {
            api_key: id,
            exp: Date.now() + 3600 * 1000,
            timestamp: Date.now(),
        };

        const base64UrlEncode = (obj: Record<string, unknown>) => {
            return Buffer.from(JSON.stringify(obj)).toString('base64')
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
        };

        const encodedHeader = base64UrlEncode(header);
        const encodedPayload = base64UrlEncode(payload);

        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        const signature = crypto.createHmac('sha256', Buffer.from(secret, 'utf8'))
            .update(signatureInput)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    private async makeRequest(
        endpoint: string,
        params: Record<string, unknown>,
        retryCount = 0
    ): Promise<Response> {
        const url = `${this.config.baseUrl}${endpoint}`;
        const token = this.generateToken();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(params),
                signal: AbortSignal.timeout(this.config.timeout!)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Zhipu API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            return response;
        } catch (error: unknown) {
            if (retryCount < this.config.maxRetries!) {
                const delay = Math.pow(2, retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(endpoint, params, retryCount + 1);
            }
            throw error;
        }
    }

    async chat(params: ZhipuChatParams): Promise<ZhipuResponse> {
        console.log(`[模型调用] 智谱AI - ${params.model}`, {
            timestamp: new Date().toISOString(),
            model: params.model,
            messageCount: params.messages?.length,
            temperature: params.temperature,
            topP: params.top_p,
            maxTokens: params.max_tokens,
            stream: false
        });

        try {
            const response = await this.makeRequest('/chat/completions', params);
            const result = await response.json();

            console.log(`[模型响应] 智谱AI - ${params.model}`, {
                timestamp: new Date().toISOString(),
                model: params.model,
                promptTokens: result.usage?.prompt_tokens,
                completionTokens: result.usage?.completion_tokens,
                totalTokens: result.usage?.total_tokens,
                finishReason: result.choices?.[0]?.finish_reason
            });

            return result;
        } catch (error) {
            console.error(`[模型错误] 智谱AI - ${params.model}`, {
                timestamp: new Date().toISOString(),
                model: params.model,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }

    async *chatStream(params: ZhipuChatParams): AsyncGenerator<string, void, unknown> {
        console.log(`[模型调用] 智谱AI流式 - ${params.model}`, {
            timestamp: new Date().toISOString(),
            model: params.model,
            messageCount: params.messages?.length,
            temperature: params.temperature,
            topP: params.top_p,
            maxTokens: params.max_tokens,
            stream: true
        });

        try {
            const response = await this.makeRequest('/chat/completions', { ...params, stream: true });

            if (!response.body) throw new Error('Response body is empty');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') return;

                        try {
                            const data = JSON.parse(dataStr);
                            if (data.choices && data.choices[0]?.delta?.content) {
                                yield data.choices[0].delta.content;
                            }
                        } catch {
                            // Ignore parse errors for partial chunks
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[模型错误] 智谱AI流式 - ${params.model}`, {
                timestamp: new Date().toISOString(),
                model: params.model,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }
}
