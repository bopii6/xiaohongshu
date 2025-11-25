// 环境变量验证
import { HunyuanConfig, HunyuanModel } from './config';

export function validateHunyuanConfig(): HunyuanConfig {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  if (!secretId) {
    throw new Error('TENCENT_SECRET_ID 环境变量未设置');
  }

  if (!secretKey) {
    throw new Error('TENCENT_SECRET_KEY 环境变量未设置');
  }

  return {
    secretId,
    secretKey,
    region: process.env.TENCENT_REGION || 'ap-guangzhou',
    defaultModel: (process.env.TENCENT_MODEL as HunyuanModel | undefined) || 'hunyuan-lite',
    timeout: parseInt(process.env.TENCENT_TIMEOUT || '60000'),
    maxRetries: parseInt(process.env.TENCENT_MAX_RETRIES || '3')
  };
}

// 获取配置，用于服务端
export function getHunyuanConfig(): HunyuanConfig {
  try {
    return validateHunyuanConfig();
  } catch (error) {
    console.error('腾讯云混元配置验证失败:', error);
    throw error;
  }
}
