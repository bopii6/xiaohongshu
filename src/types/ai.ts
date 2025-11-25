export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIError {
  error: {
    code: string;
    message: string;
    type?: string;
  };
}

export interface AIProvider {
  name: string;
  generateText(request: AIRequest): Promise<AIResponse>;
  generateTextStream(request: AIRequest): Promise<ReadableStream<Uint8Array>>;
}

export interface ContentRewriteRequest {
  originalContent: string;
  rewriteType: 'expand' | 'simplify' | 'rephrase' | 'optimize';
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
  maxLength?: number;
}

export interface ContentGenerationRequest {
  topic: string;
  contentType: 'xiaohongshu' | 'weibo' | 'douyin' | 'article';
  keywords?: string[];
  length?: 'short' | 'medium' | 'long';
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
}
