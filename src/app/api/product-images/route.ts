import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getTencentAiArtClient, IMAGE_STYLE_PRESETS, ImageStyleId } from '@/lib/tencent/aiart-client';
import { uploadBufferToCos } from '@/lib/tencent/cos-client';
import { createMaskFromBase64 } from '@/lib/tencent/mask-utils';

const DASHSCOPE_GENERATION_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/background-generation/generation/';
const DASHSCOPE_TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks/';

interface ProductImagesRequest {
    imageBase64: string;
    productName?: string;
    styles?: ImageStyleId[];
}

function parseBase64Image(input: string): { buffer: Buffer; mimeType: string } {
    const dataUriMatch = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (dataUriMatch) {
        return {
            mimeType: dataUriMatch[1],
            buffer: Buffer.from(dataUriMatch[2], 'base64')
        };
    }

    return {
        mimeType: 'image/png',
        buffer: Buffer.from(input, 'base64')
    };
}

function readPositiveNumber(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readNumber(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function buildDashScopePrompt(styleId: ImageStyleId, productName?: string) {
    const preset = IMAGE_STYLE_PRESETS[styleId];
    const base = preset.description || preset.name || 'clean background';
    if (!productName) {
        return base;
    }
    return `${base}, highlight ${productName}`;
}

function extractDashScopeImageUrls(payload: unknown): string[] {
    const data = payload as {
        output?: {
            results?: Array<{ url?: string; image_url?: string; imageUrl?: string }>;
            result?: { url?: string; image_url?: string; imageUrl?: string };
            image_url?: string;
            imageUrl?: string;
        };
        results?: Array<{ url?: string; image_url?: string; imageUrl?: string }>;
        result?: { url?: string; image_url?: string; imageUrl?: string };
        image_url?: string;
        imageUrl?: string;
    };

    const candidates: Array<string | undefined> = [];
    if (Array.isArray(data?.output?.results)) {
        for (const item of data.output.results) {
            candidates.push(item?.url, item?.image_url, item?.imageUrl);
        }
    }
    if (data?.output?.result) {
        candidates.push(data.output.result.url, data.output.result.image_url, data.output.result.imageUrl);
    }
    candidates.push(data?.output?.image_url, data?.output?.imageUrl);

    if (Array.isArray(data?.results)) {
        for (const item of data.results) {
            candidates.push(item?.url, item?.image_url, item?.imageUrl);
        }
    }
    if (data?.result) {
        candidates.push(data.result.url, data.result.image_url, data.result.imageUrl);
    }
    candidates.push(data?.image_url, data?.imageUrl);

    return candidates.filter((url): url is string => typeof url === 'string' && url.length > 0);
}

async function pollDashScopeTask(taskId: string, apiKey: string) {
    const maxAttempts = Math.round(readPositiveNumber(process.env.DASHSCOPE_TASK_MAX_ATTEMPTS, 20));
    const delayMs = Math.round(readPositiveNumber(process.env.DASHSCOPE_TASK_DELAY_MS, 1500));

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await fetch(`${DASHSCOPE_TASK_URL}${taskId}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.message || `DashScope task request failed: ${response.status}`);
        }

        const taskStatus = data?.output?.task_status || data?.task_status;
        if (taskStatus === 'SUCCEEDED' || taskStatus === 'SUCCESS') {
            return data;
        }
        if (taskStatus === 'FAILED' || taskStatus === 'CANCELLED') {
            throw new Error(data?.message || 'DashScope task failed');
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('DashScope task timed out');
}

async function generateDashScopeBackground(params: {
    apiKey: string;
    baseImageUrl: string;
    refPrompt: string;
}) {
    const payload = {
        model: process.env.DASHSCOPE_BG_MODEL || 'wanx-background-generation-v2',
        input: {
            base_image_url: params.baseImageUrl,
            ref_prompt: params.refPrompt
        },
        parameters: {
            n: 1,
            ref_prompt_weight: readNumber(process.env.DASHSCOPE_REF_PROMPT_WEIGHT, 0.5),
            model_version: process.env.DASHSCOPE_MODEL_VERSION || 'v3'
        }
    };

    const response = await fetch(DASHSCOPE_GENERATION_URL, {
        method: 'POST',
        headers: {
            'X-DashScope-Async': 'enable',
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.message || `DashScope request failed: ${response.status}`);
    }

    const taskId = data?.output?.task_id || data?.output?.taskId || data?.task_id;
    if (taskId) {
        return await pollDashScopeTask(taskId, params.apiKey);
    }

    return data;
}

async function normalizeImageBuffer(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    const maxEdge = readPositiveNumber(process.env.TENCENT_AIART_MAX_EDGE, 1280);
    const maxBytes = readPositiveNumber(process.env.TENCENT_AIART_MAX_BYTES, 2_500_000);
    const qualityBase = readPositiveNumber(process.env.TENCENT_AIART_JPEG_QUALITY, 82);
    const qualitySteps = [qualityBase, 72, 62];

    const metadata = await sharp(buffer).rotate().metadata();
    let pipeline = sharp(buffer).rotate();

    if (metadata.width && metadata.height) {
        const maxDimension = Math.max(metadata.width, metadata.height);
        if (maxDimension > maxEdge) {
            const width = metadata.width >= metadata.height ? maxEdge : undefined;
            const height = metadata.height > metadata.width ? maxEdge : undefined;
            pipeline = pipeline.resize({ width, height, fit: 'inside', withoutEnlargement: true });
        }
    }

    let output = await pipeline.clone().jpeg({ quality: qualityBase, mozjpeg: true }).toBuffer();
    for (const quality of qualitySteps.slice(1)) {
        if (output.length <= maxBytes) {
            break;
        }
        output = await pipeline.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    }

    return { buffer: output, mimeType: 'image/jpeg' };
}

export async function POST(request: NextRequest) {
    try {
        const body: ProductImagesRequest = await request.json();
        const { imageBase64, productName, styles } = body;

        if (!imageBase64) {
            return NextResponse.json(
                { success: false, error: '请上传产品图片' },
                { status: 400 }
            );
        }

        // 默认使用所有风格
        const selectedStyles = styles && styles.length > 0
            ? styles
            : Object.keys(IMAGE_STYLE_PRESETS) as ImageStyleId[];

        const isHttpUrl = /^https?:\/\//i.test(imageBase64.trim());
        let productUrl: string;
        let maskUrl: string | undefined;

        if (isHttpUrl) {
            productUrl = imageBase64.trim();
        } else {
            const { buffer } = parseBase64Image(imageBase64);
            const normalized = await normalizeImageBuffer(buffer);
            const productUpload = await uploadBufferToCos(normalized.buffer, normalized.mimeType);
            productUrl = productUpload.url;

            if ((process.env.TENCENT_AIART_MASK_ENABLED || 'true').toLowerCase() !== 'false') {
                try {
                    const normalizedBase64 = normalized.buffer.toString('base64');
                    const maskResult = await createMaskFromBase64(normalizedBase64);
                    if (maskResult.isUsable) {
                        const maskUpload = await uploadBufferToCos(maskResult.buffer, 'image/png', 'aiart-mask');
                        maskUrl = maskUpload.url;
                    } else {
                        console.warn('[AI Art] Mask coverage out of range, skip mask', {
                            ratio: Number(maskResult.ratio.toFixed(3)),
                            edgeRatio: Number(maskResult.edgeRatio.toFixed(3)),
                            width: maskResult.width,
                            height: maskResult.height,
                            threshold: maskResult.threshold
                        });
                    }
                } catch (error) {
                    console.warn('[AI Art] Mask generation failed, fallback to no mask', error);
                }
            }
        }

        const dashScopeApiKey = process.env.DASHSCOPE_API_KEY;
        const dashScopeResults: Array<{ styleId: ImageStyleId; styleName: string; imageUrl: string; error?: string }> = [];
        const tencentFallbackStyles: ImageStyleId[] = [];

        if (dashScopeApiKey) {
            for (const styleId of selectedStyles) {
                const preset = IMAGE_STYLE_PRESETS[styleId];
                const refPrompt = buildDashScopePrompt(styleId, productName);
                try {
                    const data = await generateDashScopeBackground({
                        apiKey: dashScopeApiKey,
                        baseImageUrl: productUrl,
                        refPrompt
                    });
                    const urls = extractDashScopeImageUrls(data);
                    if (!urls.length) {
                        throw new Error('DashScope returned empty result');
                    }
                    dashScopeResults.push({
                        styleId,
                        styleName: preset.name,
                        imageUrl: urls[0]
                    });
                } catch (error) {
                    console.error(`[DashScope] ${preset.name} failed`, error);
                    tencentFallbackStyles.push(styleId);
                }
            }
        } else {
            tencentFallbackStyles.push(...selectedStyles);
        }

        let results = dashScopeResults;
        if (tencentFallbackStyles.length > 0) {
            const client = getTencentAiArtClient();
            const tencentResults = await client.generateProductImages({
                productUrl,
                productName: productName || undefined,
                maskUrl,
                styles: tencentFallbackStyles
            });
            results = results.concat(tencentResults);
        }

        // 过滤出成功的结果
        const successResults = results.filter(r => r.imageUrl && !r.error);
        const failedResults = results.filter(r => r.error);

        return NextResponse.json({
            success: true,
            data: {
                images: successResults,
                failed: failedResults,
                total: results.length,
                successCount: successResults.length
            }
        });

    } catch (error) {
        console.error('Product images generation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : '生成失败，请重试'
            },
            { status: 500 }
        );
    }
}

// GET 请求返回可用的风格列表
export async function GET() {
    const styles = Object.entries(IMAGE_STYLE_PRESETS).map(([id, preset]) => ({
        id,
        name: preset.name,
        description: preset.description
    }));

    return NextResponse.json({
        success: true,
        data: { styles }
    });
}
