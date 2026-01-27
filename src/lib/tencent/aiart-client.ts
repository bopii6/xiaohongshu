import crypto from 'crypto';
import { uploadImageToCos } from './cos-client';

export interface TencentAiArtConfig {
    secretId: string;
    secretKey: string;
    region?: string;
    endpoint?: string;
    version?: string;
    maxRetries?: number;
}

// 5种预设风格的 Prompt 模板
export const IMAGE_STYLE_PRESETS = {
    elegant: {
        id: 'elegant',
        name: '精美背景图',
        description: '极简、大理石、木纹等高级感背景',
        prompt: '产品保持原始外观与比例，不改变材质与颜色，正面居中，细节清晰，真实摄影。放在白色大理石桌面上，极简风格，柔和自然光，高级质感，干净背景。',
        negativePrompt: '变形，扭曲，拉伸，融化，模糊，低质量，过曝，色偏，噪点，边缘锯齿，文字水印，遮挡'
    },
    holiday: {
        id: 'holiday',
        name: '节日主题图',
        description: '春节、情人节等节日氛围',
        prompt: '产品保持原始外观与比例，不改变材质与颜色，正面居中，细节清晰，真实摄影。新年红色喜庆背景，金色装饰点缀，温馨节日氛围，简洁不杂乱。',
        negativePrompt: '变形，扭曲，拉伸，融化，模糊，低质量，过曝，色偏，噪点，边缘锯齿，文字水印，遮挡'
    },
    seasonal: {
        id: 'seasonal',
        name: '季节主题图',
        description: '春夏秋冬季节氛围',
        prompt: '产品保持原始外观与比例，不改变材质与颜色，正面居中，细节清晰，真实摄影。春天樱花背景，粉色花瓣点缀，柔和光影，清新浪漫氛围。',
        negativePrompt: '变形，扭曲，拉伸，融化，模糊，低质量，过曝，色偏，噪点，边缘锯齿，文字水印，遮挡'
    },
    scene: {
        id: 'scene',
        name: '使用场景图',
        description: '办公室、家居、户外等场景',
        prompt: '产品保持原始外观与比例，不改变材质与颜色，正面居中，细节清晰，真实摄影。现代简约客厅场景，自然采光，生活化摆放，背景虚化。',
        negativePrompt: '变形，扭曲，拉伸，融化，模糊，低质量，过曝，色偏，噪点，边缘锯齿，文字水印，遮挡'
    },
    contrast: {
        id: 'contrast',
        name: '对比效果图',
        description: '高级对比展示效果',
        prompt: '产品保持原始外观与比例，不改变材质与颜色，正面居中，细节清晰，真实摄影。深浅渐变背景，聚光灯效果，突出主体，高端广告风格，干净利落。',
        negativePrompt: '变形，扭曲，拉伸，融化，模糊，低质量，过曝，色偏，噪点，边缘锯齿，文字水印，遮挡'
    }
} as const;

export type ImageStyleId = keyof typeof IMAGE_STYLE_PRESETS;

export interface ReplaceBackgroundParams {
    productUrl?: string;
    productBase64?: string;
    prompt: string;
    negativePrompt?: string;
    product?: string; // 浜у搧鍚嶇О锛屽彲閫?
    maskUrl?: string;
}

export interface ReplaceBackgroundResult {
    imageUrl: string;
    requestId: string;
}

interface TencentAiArtApiResponse {
    Response: {
        ResultImage?: string; // Base64 encoded image
        RequestId: string;
        Error?: {
            Code: string;
            Message: string;
        };
    };
}

export class TencentAiArtClient {
    private config: Required<TencentAiArtConfig>;
    private service = 'aiart';
    private maxRetries: number;

    constructor(config: TencentAiArtConfig) {
        if (!config.secretId || !config.secretKey) {
            throw new Error('未配置腾讯云 AI Art 的密钥');
        }

        this.config = {
            region: 'ap-guangzhou',
            endpoint: 'aiart.tencentcloudapi.com',
            version: '2022-12-29',
            ...config,
            maxRetries: config.maxRetries ?? 3
        } as Required<TencentAiArtConfig>;

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

    private async request(action: string, params: Record<string, unknown>, retryCount = 0): Promise<TencentAiArtApiResponse['Response']> {
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = JSON.stringify(params);

        const headers = {
            'Authorization': this.buildAuthorization(payload, timestamp),
            'Content-Type': 'application/json; charset=utf-8',
            'Host': this.config.endpoint,
            'X-TC-Action': action,
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

            const data = (await response.json()) as TencentAiArtApiResponse;

            if (!response.ok || data.Response?.Error) {
                const error = data.Response?.Error;
                throw new Error(error ? `${error.Code}: ${error.Message}` : '鑵捐浜?AI Art 璇锋眰澶辫触');
            }

            return data.Response;
        } catch (error) {
            if (retryCount < this.maxRetries && this.isRetryableError(error)) {
                const delay = Math.pow(2, retryCount) * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.request(action, params, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * 鍟嗗搧鑳屾櫙鐢熸垚 - 鏍规嵁Prompt鏇挎崲鍟嗗搧鑳屾櫙
     */
    async replaceBackground(params: ReplaceBackgroundParams): Promise<ReplaceBackgroundResult> {
        console.log('[AI Art] ========== 寮€濮嬬敓鎴愬晢鍝佽儗鏅?==========');
        console.log('[AI Art] Prompt:', params.prompt);
        console.log('[AI Art] NegativePrompt:', params.negativePrompt);
        console.log('[AI Art] Product:', params.product);

        const requestParams: Record<string, unknown> = {
            Prompt: params.prompt
        };

        // 鏀寔URL鎴朆ase64
        if (params.productUrl) {
            console.log('[AI Art] 浣跨敤 ProductUrl (HTTP URL)');
            requestParams.ProductUrl = params.productUrl;
        } else if (params.productBase64) {
            // 澶勭悊 Base64 鏁版嵁
            const base64Input = params.productBase64;
            console.log('[AI Art] 浣跨敤 Base64 鍥剧墖');
            console.log('[AI Art] Base64 鏁版嵁闀垮害:', base64Input.length);
            console.log('[AI Art] Base64 鍓?0瀛楃:', base64Input.substring(0, 50));

            // 检查是否已经是 data URI 格式
            if (base64Input.startsWith('data:image/')) {
                // 已经是完整的 data URI，直接使用
                console.log('[AI Art] 输入已经是 data URI 格式，直接使用');
                requestParams.ProductUrl = base64Input;
            } else {
                // 绾?Base64 鏁版嵁锛岄渶瑕佹坊鍔犲墠缂€
                // 灏濊瘯妫€娴嬪浘鐗囩被鍨嬶紙閫氳繃 Base64 鐨勫墠鍑犱釜瀛楃锛?
                let mimeType = 'image/png'; // 榛樿 PNG
                if (base64Input.startsWith('/9j/')) {
                    mimeType = 'image/jpeg';
                } else if (base64Input.startsWith('iVBOR')) {
                    mimeType = 'image/png';
                } else if (base64Input.startsWith('R0lGOD')) {
                    mimeType = 'image/gif';
                } else if (base64Input.startsWith('UklGR')) {
                    mimeType = 'image/webp';
                }
                console.log('[AI Art] 妫€娴嬪埌 MIME 绫诲瀷:', mimeType);
                requestParams.ProductUrl = `data:${mimeType};base64,${base64Input}`;
            }

            const productUrl = requestParams.ProductUrl as string;
            // 浠呮墦鍗板墠100涓瓧绗︼紝閬垮厤鏃ュ織杩囬暱
            console.log('[AI Art] 鏈€缁?ProductUrl 鍓?00瀛楃:', productUrl.substring(0, 100) + '...');
            console.log('[AI Art] 鏈€缁?ProductUrl 鎬婚暱搴?', productUrl.length);
        } else {
            throw new Error('蹇呴』鎻愪緵 productUrl 鎴?productBase64');
        }

        if (params.negativePrompt) {
            requestParams.NegativePrompt = params.negativePrompt;
        }

        if (params.product) {
            requestParams.Product = params.product;
        }

        if (params.maskUrl) {
            requestParams.MaskUrl = params.maskUrl;
        }

        console.log('[AI Art] 璇锋眰鍙傛暟 (涓嶅惈鍥剧墖鏁版嵁):', {
            Prompt: requestParams.Prompt,
            NegativePrompt: requestParams.NegativePrompt,
            Product: requestParams.Product,
            MaskUrl: requestParams.MaskUrl,
            ProductUrlLength: (requestParams.ProductUrl as string)?.length
        });

        console.log('[AI Art] 寮€濮嬭皟鐢ㄨ吘璁簯 API...');
        const startTime = Date.now();

        try {
            const response = await this.request('ReplaceBackground', requestParams);
            const duration = Date.now() - startTime;
            console.log('[AI Art] API 璋冪敤鎴愬姛, 鑰楁椂:', duration, 'ms');
            console.log('[AI Art] RequestId:', response.RequestId);

            if (!response.ResultImage) {
                console.log('[AI Art] 閿欒: 鏈繑鍥?ResultImage');
                throw new Error('鏈繑鍥炵敓鎴愮殑鍥剧墖');
            }

            console.log('[AI Art] 鐢熸垚鎴愬姛, 缁撴灉鍥剧墖 Base64 闀垮害:', response.ResultImage.length);
            console.log('[AI Art] ========== 鐢熸垚瀹屾垚 ==========');

            let imageUrl = `data:image/png;base64,${response.ResultImage}`;
            try {
                const uploaded = await uploadImageToCos(response.ResultImage);
                imageUrl = uploaded.url;
            } catch (uploadError) {
                console.warn('[AI Art] Upload to COS failed, fallback to Base64', uploadError);
            }

            return {
                imageUrl,
                requestId: response.RequestId
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('[AI Art] API 璋冪敤澶辫触, 鑰楁椂:', duration, 'ms');
            console.error('[AI Art] 閿欒璇︽儏:', error);
            throw error;
        }
    }

    /**
     * 鎵归噺鐢熸垚涓嶅悓椋庢牸鐨勫晢鍝佸浘
     */
    async generateProductImages(params: {
        productBase64?: string;
        productUrl?: string;
        productName?: string;
        maskUrl?: string;
        styles: ImageStyleId[];
    }): Promise<Array<{ styleId: ImageStyleId; styleName: string; imageUrl: string; error?: string }>> {
        if (!params.productBase64 && !params.productUrl) {
            throw new Error('Missing product image payload');
        }

        const imagePayload = params.productUrl
            ? { productUrl: params.productUrl, maskUrl: params.maskUrl }
            : { productBase64: params.productBase64 as string, maskUrl: params.maskUrl };
        const results: Array<{ styleId: ImageStyleId; styleName: string; imageUrl: string; error?: string }> = [];
        const maxAttempts = Number(process.env.TENCENT_AIART_JOB_RETRIES) || 5;
        const baseDelayMs = Number(process.env.TENCENT_AIART_JOB_RETRY_DELAY_MS) || 1200;
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 串行生成，避免触发 JobNumExceed
        for (const styleId of params.styles) {
            const preset = IMAGE_STYLE_PRESETS[styleId];
            let attempt = 0;
            while (attempt < maxAttempts) {
                try {
                    const result = await this.replaceBackground({
                        ...imagePayload,
                        prompt: preset.prompt,
                        negativePrompt: preset.negativePrompt,
                        product: params.productName
                    });
                    results.push({
                        styleId,
                        styleName: preset.name,
                        imageUrl: result.imageUrl
                    });
                    break;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    const isJobLimit = message.includes('JobNumExceed');
                    attempt += 1;

                    if (isJobLimit && attempt < maxAttempts) {
                        const delay = baseDelayMs * Math.pow(2, attempt - 1);
                        await sleep(delay);
                        continue;
                    }

                    console.error(`生成 ${preset.name} 失败:`, error);
                    results.push({
                        styleId,
                        styleName: preset.name,
                        imageUrl: '',
                        error: error instanceof Error ? error.message : 'Generate failed'
                    });
                    break;
                }
            }
        }

        return results;
    }
}

// 鍗曚緥鑾峰彇瀹㈡埛绔?
let aiArtClient: TencentAiArtClient | null = null;

export function getTencentAiArtClient(): TencentAiArtClient {
    if (!aiArtClient) {
        aiArtClient = new TencentAiArtClient({
            secretId: process.env.TENCENT_SECRET_ID || '',
            secretKey: process.env.TENCENT_SECRET_KEY || '',
            // AI Art API 鍙敮鎸?ap-guangzhou 鍦板煙
            region: 'ap-guangzhou',
            maxRetries: Number(process.env.TENCENT_MAX_RETRIES) || 3
        });
    }
    return aiArtClient;
}






