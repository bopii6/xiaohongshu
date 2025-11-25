// 腾讯云混元大模型客户端
import * as crypto from 'crypto';
import { HunyuanConfig, HunyuanModel, HUNYUAN_MODELS } from './config';

// API请求参数接口
export interface HunyuanChatParams extends Record<string, unknown> {
  Model: string;
  Messages: Array<{
    Role: 'user' | 'assistant';
    Content: string;
  }>;
  Temperature?: number; // 0.0-1.0，控制随机性
  TopP?: number; // 0.0-1.0，控制核采样
  Stream?: boolean; // 是否流式输出
  Seed?: number; // 随机种子
}

// API响应接口
export interface HunyuanResponse {
  RequestId: string;
  Note: string;
  Usage: {
    PromptTokens: number;
    CompletionTokens: number;
    TotalTokens: number;
  };
  Choices: Array<{
    FinishReason: string;
    Message: {
      Role: string;
      Content: string;
    };
  }>;
  Created: number;
  Id: string;
}

// 错误响应接口
export interface HunyuanErrorResponse {
  Error: {
    Code: string;
    Message: string;
  };
  RequestId: string;
}

export class HunyuanClient {
  private config: HunyuanConfig;

  constructor(config: HunyuanConfig) {
    this.config = {
      region: 'ap-guangzhou',
      timeout: 60000,
      maxRetries: 3,
      ...config
    };

    console.log('[HunyuanClient] 初始化配置', {
      secretIdPrefix: this.config.secretId?.slice(0, 6),
      region: this.config.region,
      defaultModel: this.config.defaultModel,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    });
  }

  /**
   * 生成腾讯云API签名
   */
  private generateSignature(
    method: string,
    params: Record<string, unknown>,
    timestamp: number,
    headers: Record<string, string>
  ): string {
    const httpRequestMethod = method;
    const canonicalUri = '/';
    const canonicalQueryString = '';
    // 按照腾讯云API要求，canonical headers必须按小写字典序排序
    const sortedHeaderEntries = Object.entries(headers)
      .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()));

    const canonicalHeaders = sortedHeaderEntries
      .map(([key, value]) => `${key.toLowerCase().trim()}:${String(value).trim()}`)
      .join('\n') + '\n';

    const signedHeaders = sortedHeaderEntries
      .map(([key]) => key.toLowerCase())
      .join(';');

    const payload = JSON.stringify(params);
    const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');

    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const service = 'hunyuan';
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    const secretDate = crypto.createHmac('sha256', `TC3${this.config.secretKey}`).update(date).digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();

    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    console.log('[HunyuanClient] 生成签名', {
      credentialScope,
      signedHeaders,
      payloadHash: hashedPayload,
      timestamp,
      canonicalRequest: canonicalRequest.substring(0, 200) + '...',
      stringToSign: stringToSign.substring(0, 200) + '...'
    });

    return `TC3-HMAC-SHA256 Credential=${this.config.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  /**
   * 发起API请求
   */
  private async makeRequest(
    params: HunyuanChatParams,
    retryCount = 0
  ): Promise<HunyuanResponse> {
    const endpoint = 'hunyuan.tencentcloudapi.com';
    const timestamp = Math.floor(Date.now() / 1000);

    const baseHeaders: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'host': endpoint,
      'x-tc-action': 'ChatCompletions',
      'x-tc-timestamp': timestamp.toString(),
      'x-tc-version': '2023-09-01',
      'x-tc-region': this.config.region!
    };

    const authorization = this.generateSignature('POST', params, timestamp, baseHeaders);
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': endpoint,
      'X-TC-Action': 'ChatCompletions',
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': '2023-09-01',
      'X-TC-Region': this.config.region!,
      'Authorization': authorization
    };

    console.log('[HunyuanClient] 请求头信息', {
      action: baseHeaders['x-tc-action'],
      region: baseHeaders['x-tc-region'],
      timestamp: baseHeaders['x-tc-timestamp'],
      signedHeaders: Object.keys(baseHeaders).map(key => key.toLowerCase()).join(';')
    });

    try {
      const response = await fetch(`https://${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      const data = await response.json();

      if (!response.ok || data?.Response?.Error) {
        const errorInfo = data?.Response?.Error;
        throw new Error(
          errorInfo
            ? `腾讯云API错误: ${errorInfo.Code} - ${errorInfo.Message}`
            : '腾讯云API响应异常'
        );
      }

      return data.Response as HunyuanResponse;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.name === 'TimeoutError' &&
        retryCount < this.config.maxRetries!
      ) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(params, retryCount + 1);
      }

      if (
        error instanceof Error &&
        error.message?.includes('RateLimit') &&
        retryCount < this.config.maxRetries!
      ) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(params, retryCount + 1);
      }

      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`腾讯云混元请求失败: ${error}`);
    }
  }

  /**
   * 聊天对话
   */
  async chat(
    model: HunyuanModel,
    params: Omit<HunyuanChatParams, 'Model'>
  ): Promise<HunyuanResponse> {
    console.log(`[模型调用] 腾讯混元 - ${model}`, {
      timestamp: new Date().toISOString(),
      model,
      messageCount: Array.isArray(params.Messages) ? params.Messages.length : 0,
      temperature: params.Temperature,
      topP: params.TopP,
      stream: params.Stream
    });

    try {
      const requestParams: HunyuanChatParams = {
        Model: model,
        Messages: params.Messages as Array<{Role: 'user' | 'assistant'; Content: string}>,
        Temperature: params.Temperature as number | undefined,
        TopP: params.TopP as number | undefined,
        Stream: params.Stream as boolean | undefined,
        Seed: params.Seed as number | undefined
      };
      const response = await this.makeRequest(requestParams);

      console.log(`[模型响应] 腾讯混元 - ${model}`, {
        timestamp: new Date().toISOString(),
        model,
        promptTokens: response.Usage.PromptTokens,
        completionTokens: response.Usage.CompletionTokens,
        totalTokens: response.Usage.TotalTokens,
        cost: this.calculateCost(model, response.Usage.PromptTokens, response.Usage.CompletionTokens),
        finishReason: response.Choices?.[0]?.FinishReason
      });

      return response;
    } catch (error) {
      console.error(`[模型错误] 腾讯混元 - ${model}`, {
        timestamp: new Date().toISOString(),
        model,
        error: error instanceof Error ? error.message : error
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`腾讯云混元API调用失败: ${error}`);
    }
  }

  /**
   * 流式聊天
   */
  async *chatStream(
    model: HunyuanModel,
    params: Omit<HunyuanChatParams, 'Model'>
  ): AsyncGenerator<string, void, unknown> {
    const streamParams = { ...params, Stream: true };

    console.log(`[模型调用] 腾讯混元流式 - ${model}`, {
      timestamp: new Date().toISOString(),
      model,
      messageCount: Array.isArray(params.Messages) ? params.Messages.length : 0,
      temperature: params.Temperature,
      topP: params.TopP,
      stream: true
    });

    try {
      const endpoint = 'hunyuan.tencentcloudapi.com';
      const timestamp = Math.floor(Date.now() / 1000);

      const baseHeaders: Record<string, string> = {
        'content-type': 'application/json; charset=utf-8',
        'host': endpoint,
        'x-tc-action': 'ChatCompletions',
        'x-tc-timestamp': timestamp.toString(),
        'x-tc-version': '2023-09-01',
        'x-tc-region': this.config.region!
      };

      const authorization = this.generateSignature('POST', {Model: model, ...streamParams}, timestamp, baseHeaders);
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': endpoint,
        'X-TC-Action': 'ChatCompletions',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Version': '2023-09-01',
        'X-TC-Region': this.config.region!,
        'Authorization': authorization
      };

      const response = await fetch(`https://${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({Model: model, ...streamParams}),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        const errorData: HunyuanErrorResponse = await response.json();
        console.error(`[模型错误] 腾讯混元流式 - ${model}`, {
          timestamp: new Date().toISOString(),
          model,
          error: `${errorData.Error.Code} - ${errorData.Error.Message}`
        });
        throw new Error(`腾讯云API错误: ${errorData.Error.Code} - ${errorData.Error.Message}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        // 腾讯云流式响应格式处理
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              if (data.Choices && data.Choices[0]?.Delta?.Content) {
                yield data.Choices[0].Delta.Content;
              }
            } catch (parseError) {
              console.warn('解析流式响应失败:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[模型错误] 腾讯混元流式 - ${model}`, {
        timestamp: new Date().toISOString(),
        model,
        error: error instanceof Error ? error.message : error
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`腾讯云混元流式调用失败: ${error}`);
    }
  }

  /**
   * 计算token费用
   */
  calculateCost(model: HunyuanModel, inputTokens: number, outputTokens: number): number {
    const config = HUNYUAN_MODELS[model];
    const totalTokens = (inputTokens + outputTokens) / 1000; // 转换为千tokens
    return totalTokens * config.price;
  }

  /**
   * 生成请求ID（用于追踪）
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
