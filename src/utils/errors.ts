import type { LinusErrorCode } from '../types.js';

export class LinusError extends Error {
  readonly code: LinusErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: LinusErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'LinusError';
    this.code = code;
    this.details = details;
  }

  toMcpResponse() {
    const errorPayload: Record<string, unknown> = {
      error: this.code,
      message: this.message,
    };
    if (this.details) {
      errorPayload.details = this.details;
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(errorPayload, null, 2) }],
      isError: true,
    };
  }
}

export function mapHttpStatusToError(
  status: number,
  body: unknown,
): LinusError {
  const bodyMessage =
    typeof body === 'object' && body !== null && 'error' in body
      ? String((body as Record<string, unknown>).error)
      : 'Unknown error';

  switch (status) {
    case 401:
      return new LinusError('auth_failed', 'Authentication failed. Check your API key.', {
        httpStatus: status,
      });
    case 403:
      return new LinusError('forbidden', `Forbidden: ${bodyMessage}`, {
        httpStatus: status,
      });
    case 404:
      return new LinusError('not_found', `Resource not found: ${bodyMessage}`, {
        httpStatus: status,
      });
    case 422:
      return new LinusError('invalid_request', `Invalid request: ${bodyMessage}`, {
        httpStatus: status,
        body,
      });
    case 429:
      return new LinusError('rate_limited', 'Rate limit exceeded. Try again shortly.', {
        httpStatus: status,
        retryAfter: 3,
      });
    default:
      if (status >= 400 && status < 500) {
        return new LinusError('invalid_request', `Client error (${status}): ${bodyMessage}`, {
          httpStatus: status,
          body,
        });
      }
      return new LinusError('api_error', `Forem API error (${status}): ${bodyMessage}`, {
        httpStatus: status,
        body,
      });
  }
}
