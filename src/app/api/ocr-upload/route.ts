import { NextRequest, NextResponse } from 'next/server';
import { TencentOcrClient } from '@/lib/tencent/ocr-client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

let client: TencentOcrClient | null = null;

function getOcrClient() {
  if (client) {
    return client;
  }

  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error('未配置腾讯OCR密钥，请设置 TENCENT_SECRET_ID/TENCENT_SECRET_KEY');
  }

  client = new TencentOcrClient({
    secretId,
    secretKey,
    region: process.env.TENCENT_REGION || 'ap-beijing',
    action: (process.env.TENCENT_OCR_ACTION as 'GeneralAccurateOCR' | 'GeneralBasicOCR') || 'GeneralAccurateOCR'
  });

  return client;
}

async function recognizeWithTencent(buffer: Buffer) {
  const ocr = getOcrClient();
  const response = await ocr.recognizeBase64(buffer.toString('base64'));

  const lines = (response.TextDetections || [])
    .map(item => item.DetectedText?.trim())
    .filter((text): text is string => Boolean(text));

  if (!lines.length) {
    throw new Error('未能从图片中识别到文字，请确保图片清晰且包含文字内容');
  }

  const confidence =
    response.TextDetections?.reduce((sum, item) => sum + (item.Confidence ?? 0), 0) /
      (response.TextDetections?.length || 1) || 0;

  return { text: lines.join('\n'), confidence };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: '未上传图片文件' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的图片格式，请上传 JPEG、PNG 或 WebP 格式的图片' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '图片文件过大，请上传小于10MB的图片' },
        { status: 400 }
      );
    }

    const filename = `${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, confidence } = await recognizeWithTencent(buffer);

    return NextResponse.json({
      success: true,
      data: {
        text,
        confidence,
        filename,
        fileSize: file.size,
        fileType: file.type
      }
    });
  } catch (error: unknown) {
    console.error('处理上传文件失败:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          '处理文件失败: ' +
          (error instanceof Error ? error.message : typeof error === 'string' ? error : '未知错误')
      },
      { status: 500 }
    );
  }
}
