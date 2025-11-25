export class APIError extends Error {
  public code: string;
  public statusCode: number;
  public provider?: string;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500, provider?: string) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.provider = provider;
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, provider);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends APIError {
  public retryAfter?: number;

  constructor(message: string, retryAfter?: number, provider?: string) {
    super(message, 'RATE_LIMIT_ERROR', 429, provider);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class TimeoutError extends APIError {
  constructor(message: string, provider?: string) {
    super(message, 'TIMEOUT_ERROR', 408, provider);
    this.name = 'TimeoutError';
  }
}

export function handleAPIError(error: unknown, provider?: string): APIError {
  if (error instanceof APIError) {
    return error;
  }

  if (error instanceof Error) {
    // 根据错误信息判断错误类型
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized') || errorMessage.includes('api key')) {
      return new AuthenticationError(error.message, provider);
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return new RateLimitError(error.message, undefined, provider);
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return new TimeoutError(error.message, provider);
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return new APIError(error.message, 'NETWORK_ERROR', 503, provider);
    }

    return new APIError(error.message, 'UNKNOWN_ERROR', 500, provider);
  }

  return new APIError('Unknown error occurred', 'UNKNOWN_ERROR', 500, provider);
}

export function createErrorResponse(error: APIError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      provider: error.provider,
      statusCode: error.statusCode
    },
    timestamp: new Date().toISOString(),
  };
}