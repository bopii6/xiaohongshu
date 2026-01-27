import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getTencentAiArtClient, IMAGE_STYLE_PRESETS, ImageStyleId } from '@/lib/tencent/aiart-client';
import { uploadBufferToCos } from '@/lib/tencent/cos-client';
import { createMaskFromBase64 } from '@/lib/tencent/mask-utils';

const DASHSCOPE_EDIT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

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

function readBoolean(value: string | undefined, fallback: boolean) {
    if (value === undefined) {
        return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
        return true;
    }
    if (normalized === 'false' || normalized === '0') {
        return false;
    }
    return fallback;
}

async function normalizeImageBufferForDashScope(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    const maxEdge = readPositiveNumber(process.env.DASHSCOPE_MAX_EDGE, 1280);

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

    const output = await pipeline.ensureAlpha().png().toBuffer();
    return { buffer: output, mimeType: 'image/png' };
}

async function applyMaskToImage(imageBuffer: Buffer, maskBuffer: Buffer): Promise<Buffer> {
    const base = sharp(imageBuffer).ensureAlpha();
    const metadata = await base.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (!width || !height) {
        throw new Error('Invalid image dimensions');
    }

    let maskRaw = await sharp(maskBuffer).raw().toBuffer();
    const maskInfo = await sharp(maskBuffer).metadata();
    if (maskInfo.width !== width || maskInfo.height !== height) {
        maskRaw = await sharp(maskBuffer)
            .resize(width, height, { fit: 'fill' })
            .raw()
            .toBuffer();
    }

    return base
        .removeAlpha()
        .joinChannel(maskRaw, { raw: { width, height, channels: 1 } })
        .png()
        .toBuffer();
}

function buildDashScopePrompt(styleId: ImageStyleId, productName?: string) {
    const productHint = productName ? `, focus on the product ${productName}` : '';
    const keepProduct = 'keep the product unchanged, preserve logo and text, same size and position';

    switch (styleId) {
        case 'holiday':
            return `replace the background with a festive holiday scene, red lanterns, golden ornaments, warm glow, confetti, bokeh lights, ${keepProduct}${productHint}`;
        case 'seasonal':
            return `replace the background with a seasonal themed scene, soft pastel colors, seasonal flowers and leaves, natural light, ${keepProduct}${productHint}`;
        case 'scene':
            return `replace the background with a modern lifestyle scene, clean home interior, soft daylight, shallow depth of field, ${keepProduct}${productHint}`;
        case 'contrast':
            return `replace the background with a high-contrast studio setup, dramatic spotlight, gradient backdrop, premium ad style, ${keepProduct}${productHint}`;
        case 'elegant':
        default:
            return `replace the background with a minimal elegant scene, marble texture, soft natural light, premium clean look, ${keepProduct}${productHint}`;
    }
}

function extractDashScopeImageUrls(payload: unknown): string[] {
    const data = payload as {
        output?: {
            choices?: Array<{
                message?: {
                    content?: Array<{ image?: string; image_url?: string; imageUrl?: string }>;
                };
            }>;
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
    if (Array.isArray(data?.output?.choices)) {
        for (const choice of data.output.choices) {
            if (Array.isArray(choice?.message?.content)) {
                for (const item of choice.message.content) {
                    candidates.push(item?.image, item?.image_url, item?.imageUrl);
                }
            }
        }
    }
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

async function generateDashScopeImageEdit(params: {
    apiKey: string;
    imageUrl: string;
    prompt: string;
    size?: string;
}) {
    const negativePromptValue = process.env.DASHSCOPE_NEGATIVE_PROMPT;
    const negativePrompt = negativePromptValue && negativePromptValue.trim().length > 0
        ? negativePromptValue
        : ' ';
    const parameters: Record<string, unknown> = {
        n: 1,
        negative_prompt: negativePrompt,
        prompt_extend: readBoolean(process.env.DASHSCOPE_PROMPT_EXTEND, true),
        watermark: readBoolean(process.env.DASHSCOPE_WATERMARK, false)
    };

    if (params.size) {
        parameters.size = params.size;
    }

    const payload = {
        model: process.env.DASHSCOPE_EDIT_MODEL || 'qwen-image-edit-plus',
        input: {
            messages: [
                {
                    role: 'user',
                    content: [
                        { image: params.imageUrl },
                        { text: params.prompt }
                    ]
                }
            ]
        },
        parameters
    };

    const response = await fetch(DASHSCOPE_EDIT_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.message || `DashScope request failed: ${response.status}`);
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

        const dashScopeApiKey = process.env.DASHSCOPE_API_KEY;
        const dashScopeOnly = (process.env.DASHSCOPE_ONLY || '').toLowerCase() === 'true';
        const dashScopeUseMask = (process.env.DASHSCOPE_USE_MASK || 'true').toLowerCase() !== 'false';
        const dashScopeImageSizeEnv = process.env.DASHSCOPE_IMAGE_SIZE?.trim();
        const isHttpUrl = /^https?:\/\//i.test(imageBase64.trim());
        let productUrl: string;
        let maskUrl: string | undefined;
        let dashScopeSize: { width: number; height: number } | null = null;

        if (isHttpUrl) {
            productUrl = imageBase64.trim();
        } else {
            const { buffer } = parseBase64Image(imageBase64);
            const normalized = dashScopeApiKey
                ? await normalizeImageBufferForDashScope(buffer)
                : await normalizeImageBuffer(buffer);
            let dashScopeBuffer = normalized.buffer;

            if (dashScopeApiKey && dashScopeUseMask) {
                try {
                    const normalizedBase64 = normalized.buffer.toString('base64');
                    const maskResult = await createMaskFromBase64(normalizedBase64);
                    dashScopeBuffer = await applyMaskToImage(normalized.buffer, maskResult.buffer);
                    if (!maskResult.isUsable) {
                        console.warn('[DashScope] Mask out of range, still applied', {
                            ratio: Number(maskResult.ratio.toFixed(3)),
                            edgeRatio: Number(maskResult.edgeRatio.toFixed(3)),
                            width: maskResult.width,
                            height: maskResult.height,
                            threshold: maskResult.threshold
                        });
                    }
                } catch (error) {
                    console.warn('[DashScope] Mask generation failed, fallback to no mask', error);
                }
            }

            if (dashScopeApiKey) {
                const metadata = await sharp(dashScopeBuffer).metadata();
                if (metadata.width && metadata.height) {
                    dashScopeSize = { width: metadata.width, height: metadata.height };
                }
            }

            const uploadBuffer = dashScopeApiKey ? dashScopeBuffer : normalized.buffer;
            const productUpload = await uploadBufferToCos(uploadBuffer, normalized.mimeType);
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

        const dashScopeImageSize = dashScopeImageSizeEnv
            ? dashScopeImageSizeEnv
            : dashScopeSize
                ? `${dashScopeSize.width}*${dashScopeSize.height}`
                : undefined;

        const dashScopeResults: Array<{ styleId: ImageStyleId; styleName: string; imageUrl: string; error?: string }> = [];
        const tencentFallbackStyles: ImageStyleId[] = [];

        if (dashScopeApiKey) {
            for (const styleId of selectedStyles) {
                const preset = IMAGE_STYLE_PRESETS[styleId];
                const prompt = buildDashScopePrompt(styleId, productName);
                try {
                    const data = await generateDashScopeImageEdit({
                        apiKey: dashScopeApiKey,
                        imageUrl: productUrl,
                        prompt,
                        size: dashScopeImageSize
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
                    if (dashScopeOnly) {
                        dashScopeResults.push({
                            styleId,
                            styleName: preset.name,
                            imageUrl: '',
                            error: error instanceof Error ? error.message : 'DashScope failed'
                        });
                    } else {
                        tencentFallbackStyles.push(styleId);
                    }
                }
            }
        } else {
            if (dashScopeOnly) {
                return NextResponse.json(
                    { success: false, error: 'DASHSCOPE_API_KEY 未配置，且已启用 DASHSCOPE_ONLY' },
                    { status: 500 }
                );
            }
            tencentFallbackStyles.push(...selectedStyles);
        }

        let results = dashScopeResults;
        if (tencentFallbackStyles.length > 0 && !dashScopeOnly) {
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
