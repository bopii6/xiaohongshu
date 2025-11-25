// 腾讯云混元大模型配置
export interface HunyuanConfig {
  secretId: string;
  secretKey: string;
  region?: string;
  defaultModel?: HunyuanModel;
  timeout?: number;
  maxRetries?: number;
}

// 支持的混元模型
export type HunyuanModel =
  | 'hunyuan-lite'
  | 'hunyuan-standard'
  | 'hunyuan-pro'
  | 'hunyuan-turbo';

// 模型配置信息
export const HUNYUAN_MODELS = {
  'hunyuan-lite': {
    name: '混元-Lite',
    description: '最经济选择，推荐日常使用',
    price: 0.001, // 元/千tokens
    maxTokens: 8192,
    features: ['文本生成', '内容改写', '基础理解']
  },
  'hunyuan-standard': {
    name: '混元-Standard',
    description: '标准版本，平衡性能',
    price: 0.004,
    maxTokens: 8192,
    features: ['文本生成', '内容改写', '多轮对话', '逻辑推理']
  },
  'hunyuan-pro': {
    name: '混元-Pro',
    description: '专业版本，高性能',
    price: 0.008,
    maxTokens: 8192,
    features: ['复杂任务', '专业创作', '深度理解', '多语言支持']
  },
  'hunyuan-turbo': {
    name: '混元-Turbo',
    description: '快速响应，最高性能',
    price: 0.012,
    maxTokens: 8192,
    features: ['实时响应', '高并发', '低延迟', '企业级服务']
  }
} as const;

// 默认配置
export const DEFAULT_HUNYUAN_CONFIG: Partial<HunyuanConfig> = {
  region: 'ap-beijing',
  defaultModel: 'hunyuan-lite',
  timeout: 60000,
  maxRetries: 3
};

// 小红书内容改写类型
export type RewriteType =
  | 'polish'      // 润色优化
  | 'expand'      // 扩写丰富
  | 'shorten'     // 精简压缩
  | 'style'       // 风格转换
  | 'seo'         // SEO优化
  | 'emotion'     // 情感增强;

// 小红书内容风格
export type XiaohongshuStyle =
  | 'zhongcao'    // 种草文案
  | 'ganhuo'      // 干货分享
  | 'shenghuo'    // 生活记录
  | 'pingce'      // 测评体验
  | 'jujia'       // 家居好物
  | 'meizhuang'   // 美妆护肤
  | 'fushi'       // 服装穿搭
  | 'meishi'      // 美食探店;

// 改写请求参数
export interface RewriteRequest {
  content: string;
  type: RewriteType;
  style?: XiaohongshuStyle;
  model?: HunyuanModel;
  temperature?: number;
  maxTokens?: number;
}

// 改写响应结果
export interface RewriteResponse {
  rewrittenContent: string;
  suggestedTitles: string[];
  tags: string[];
  suggestions: string[];
  model: HunyuanModel;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
}