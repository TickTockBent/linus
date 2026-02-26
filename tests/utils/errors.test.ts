import { describe, it, expect } from 'vitest';
import { LinusError, mapHttpStatusToError } from '../../src/utils/errors.js';

describe('LinusError', () => {
  it('creates an error with code and message', () => {
    const error = new LinusError('auth_failed', 'Bad key');
    expect(error.code).toBe('auth_failed');
    expect(error.message).toBe('Bad key');
    expect(error.name).toBe('LinusError');
    expect(error.details).toBeUndefined();
  });

  it('includes optional details', () => {
    const error = new LinusError('rate_limited', 'Slow down', { retryAfter: 3 });
    expect(error.details).toEqual({ retryAfter: 3 });
  });

  it('produces MCP error response', () => {
    const error = new LinusError('not_found', 'Article not found', { httpStatus: 404 });
    const response = error.toMcpResponse();

    expect(response.isError).toBe(true);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.error).toBe('not_found');
    expect(parsed.message).toBe('Article not found');
    expect(parsed.details.httpStatus).toBe(404);
  });

  it('produces MCP response without details when none provided', () => {
    const error = new LinusError('auth_failed', 'No key');
    const response = error.toMcpResponse();
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.details).toBeUndefined();
  });
});

describe('mapHttpStatusToError', () => {
  it('maps 401 to auth_failed', () => {
    const error = mapHttpStatusToError(401, { error: 'unauthorized', status: 401 });
    expect(error.code).toBe('auth_failed');
  });

  it('maps 403 to forbidden', () => {
    const error = mapHttpStatusToError(403, { error: 'forbidden' });
    expect(error.code).toBe('forbidden');
    expect(error.message).toContain('forbidden');
  });

  it('maps 404 to not_found', () => {
    const error = mapHttpStatusToError(404, { error: 'not found' });
    expect(error.code).toBe('not_found');
  });

  it('maps 422 to invalid_request', () => {
    const error = mapHttpStatusToError(422, { error: 'Validation failed' });
    expect(error.code).toBe('invalid_request');
  });

  it('maps 429 to rate_limited', () => {
    const error = mapHttpStatusToError(429, { error: 'Rate limit reached' });
    expect(error.code).toBe('rate_limited');
  });

  it('maps 5xx to api_error', () => {
    const error = mapHttpStatusToError(500, { error: 'Internal server error' });
    expect(error.code).toBe('api_error');
  });

  it('maps unknown 4xx to invalid_request', () => {
    const error = mapHttpStatusToError(418, { error: "I'm a teapot" });
    expect(error.code).toBe('invalid_request');
  });

  it('handles body without error field', () => {
    const error = mapHttpStatusToError(500, { message: 'broken' });
    expect(error.code).toBe('api_error');
    expect(error.message).toContain('Unknown error');
  });
});
