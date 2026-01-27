import COS from 'cos-nodejs-sdk-v5';
import crypto from 'crypto';

interface CosConfig {
  secretId: string;
  secretKey: string;
  region: string;
  bucket: string;
  keyPrefix: string;
  publicRead: boolean;
  publicBaseUrl?: string;
  signedUrlExpires: number;
}

export interface UploadResult {
  key: string;
  url: string;
  isSigned: boolean;
}

let cosClient: COS | null = null;

function getCosConfig(): CosConfig {
  const secretId = process.env.TENCENT_COS_SECRET_ID || process.env.TENCENT_SECRET_ID || '';
  const secretKey = process.env.TENCENT_COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '';
  const region = process.env.TENCENT_COS_REGION || process.env.TENCENT_REGION || '';
  const bucket = process.env.TENCENT_COS_BUCKET || '';

  if (!secretId || !secretKey || !region || !bucket) {
    throw new Error('COS config missing: TENCENT_COS_BUCKET/TENCENT_COS_REGION/TENCENT_COS_SECRET_ID/TENCENT_COS_SECRET_KEY');
  }

  return {
    secretId,
    secretKey,
    region,
    bucket,
    keyPrefix: process.env.TENCENT_COS_KEY_PREFIX || 'aiart-product',
    publicRead: (process.env.TENCENT_COS_PUBLIC_READ || '').toLowerCase() === 'true',
    publicBaseUrl: process.env.TENCENT_COS_PUBLIC_BASE_URL || undefined,
    signedUrlExpires: Number(process.env.TENCENT_COS_SIGNED_URL_EXPIRES) || 600
  };
}

function getCosClient(): COS {
  if (!cosClient) {
    const config = getCosConfig();
    cosClient = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey
    });
  }
  return cosClient;
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

function mimeToExtension(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/png':
    default:
      return 'png';
  }
}

function joinUrl(baseUrl: string, key: string) {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedKey = key.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedKey}`;
}

export async function uploadImageToCos(base64Input: string): Promise<UploadResult> {
  const config = getCosConfig();
  const cos = getCosClient();
  const { buffer, mimeType } = parseBase64Image(base64Input);

  if (!buffer.length) {
    throw new Error('Invalid image payload');
  }

  return uploadBufferToCos(buffer, mimeType);
}

export async function uploadBufferToCos(
  buffer: Buffer,
  mimeType: string,
  keyPrefix?: string
): Promise<UploadResult> {
  const config = getCosConfig();
  const cos = getCosClient();

  if (!buffer.length) {
    throw new Error('Invalid image payload');
  }

  const extension = mimeToExtension(mimeType);
  const random = crypto.randomBytes(6).toString('hex');
  const prefix = keyPrefix || config.keyPrefix;
  const key = `${prefix}/${Date.now()}_${random}.${extension}`;

  await new Promise<void>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: config.bucket,
        Region: config.region,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: config.publicRead ? 'public-read' : undefined
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });

  if (config.publicRead) {
    const baseUrl =
      config.publicBaseUrl || `https://${config.bucket}.cos.${config.region}.myqcloud.com`;
    return {
      key,
      url: joinUrl(baseUrl, key),
      isSigned: false
    };
  }

  const signedUrl = cos.getObjectUrl({
    Bucket: config.bucket,
    Region: config.region,
    Key: key,
    Sign: true,
    Expires: config.signedUrlExpires
  });

  return {
    key,
    url: signedUrl,
    isSigned: true
  };
}
