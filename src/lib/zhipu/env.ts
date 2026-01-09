import { ZhipuConfig, ZhipuModel } from './config';

export function validateZhipuConfig(): ZhipuConfig {
    const apiKey = process.env.ZHIPU_API_KEY;

    if (!apiKey) {
        console.warn('ZHIPU_API_KEY environment variable is not set. AI features may not work.');
    }

    const timeoutFromEnv = parseInt(process.env.ZHIPU_TIMEOUT || '0');
    const normalizedTimeout = Number.isFinite(timeoutFromEnv) && timeoutFromEnv > 0 ? timeoutFromEnv : 120000;

    return {
        apiKey,
        baseUrl: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: (process.env.ZHIPU_MODEL as ZhipuModel | undefined) || 'glm-4-plus',
        timeout: Math.max(normalizedTimeout, 120000),
        maxRetries: parseInt(process.env.ZHIPU_MAX_RETRIES || '3')
    };
}

export function getZhipuConfig(): ZhipuConfig {
    try {
        return validateZhipuConfig();
    } catch (error) {
        console.error('Zhipu AI configuration validation failed:', error);
        throw error;
    }
}
