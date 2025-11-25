import crypto from 'crypto';

export interface TencentOcrConfig {
  secretId: string;
  secretKey: string;
  region?: string;
  action?: 'GeneralBasicOCR' | 'GeneralAccurateOCR';
  endpoint?: string;
  version?: string;
  maxRetries?: number;
}

export interface TencentOcrTextDetection {
  DetectedText: string;
  Confidence?: number;
}

export interface TencentOcrResult {
  TextDetections: TencentOcrTextDetection[];
  Language?: string;
  RequestId: string;
}

export interface TencentOcrRequestPayload {
  ImageUrl?: string;
  ImageBase64?: string;
  LanguageType?: string;
  IsPdf?: boolean;
  EnableDetectLabel?: boolean;
  EnableDetectCandWord?: boolean;
}

interface TencentOcrApiResponse {
  Response: TencentOcrResult & {
    Error?: {
      Code: string;
      Message: string;
    };
  };
}

export class TencentOcrClient {
  private config: Required<TencentOcrConfig>;
  private service = 'ocr';
  private maxRetries: number;

  constructor(config: TencentOcrConfig) {
    if (!config.secretId || !config.secretKey) {
      throw new Error('未配置腾讯云 OCR 的密钥');
    }

    this.config = {
      region: 'ap-beijing',
      action: 'GeneralAccurateOCR',
      endpoint: 'ocr.tencentcloudapi.com',
      version: '2018-11-19',
      ...config,
      maxRetries: config.maxRetries ?? 3
    } as Required<TencentOcrConfig>;

    this.maxRetries = this.config.maxRetries;
  }

  private hash(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private hmac(key: Buffer | string, data: string) {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  private buildAuthorization(payload: string, timestamp: number) {
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const canonicalRequest = [
      'POST',
      '/',
      '',
      `content-type:application/json; charset=utf-8\nhost:${this.config.endpoint}\n`,
      'content-type;host',
      this.hash(payload)
    ].join('\n');

    const credentialScope = `${date}/${this.service}/tc3_request`;
    const stringToSign = [
      'TC3-HMAC-SHA256',
      timestamp.toString(),
      credentialScope,
      this.hash(canonicalRequest)
    ].join('\n');

    const secretDate = this.hmac(`TC3${this.config.secretKey}`, date);
    const secretService = this.hmac(secretDate, this.service);
    const secretSigning = this.hmac(secretService, 'tc3_request');
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    return `TC3-HMAC-SHA256 Credential=${this.config.secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
  }

  private isRetryableError(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const maybeError = error as { cause?: { code?: string } };
    const code = maybeError.cause?.code;
    return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED';
  }

  private async request(params: TencentOcrRequestPayload, retryCount = 0): Promise<TencentOcrResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(params);

    const headers = {
      'Authorization': this.buildAuthorization(payload, timestamp),
      'Content-Type': 'application/json; charset=utf-8',
      'Host': this.config.endpoint,
      'X-TC-Action': this.config.action,
      'X-TC-Version': this.config.version,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Region': this.config.region
    };

    try {
      const response = await fetch(`https://${this.config.endpoint}`, {
        method: 'POST',
        headers,
        body: payload
      });

      const data = (await response.json()) as TencentOcrApiResponse;

      if (!response.ok || data.Response?.Error) {
        const error = data.Response?.Error;
        throw new Error(error ? `${error.Code}: ${error.Message}` : '腾讯OCR请求失败');
      }

      return data.Response as TencentOcrResult;
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = Math.pow(2, retryCount) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request(params, retryCount + 1);
      }
      throw error;
    }
  }

  async recognizeBase64(imageBase64: string) {
    return this.request({
      ImageBase64: imageBase64
    });
  }
}
