export type ZhipuModel =
  | 'glm-4'
  | 'glm-4-plus'
  | 'glm-4-air'
  | 'glm-4-flash'
  | 'glm-4-long'
  | 'glm-4-0520'
  | 'glm-4.5'
  | 'glm-4.5-flash';

export const ZHIPU_MODELS: Record<ZhipuModel, { name: string; price: number }> = {
    'glm-4': { name: 'GLM-4', price: 0.1 }, // Price is placeholder
    'glm-4-plus': { name: 'GLM-4 Plus', price: 0.1 },
    'glm-4-air': { name: 'GLM-4 Air', price: 0.001 },
    'glm-4-flash': { name: 'GLM-4 Flash', price: 0 },
  'glm-4-long': { name: 'GLM-4 Long', price: 0.001 },
  'glm-4-0520': { name: 'GLM-4 0520', price: 0.1 },
  'glm-4.5': { name: 'GLM-4.5', price: 0.15 },
  'glm-4.5-flash': { name: 'GLM-4.5 Flash', price: 0 }
};

export interface ZhipuConfig {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: ZhipuModel;
    timeout?: number;
    maxRetries?: number;
}
