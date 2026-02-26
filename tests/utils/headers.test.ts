import { describe, it, expect } from 'vitest';
import { buildHeaders } from '../../src/utils/headers.js';

describe('buildHeaders', () => {
  it('returns all four required headers', () => {
    const headers = buildHeaders('test-key-123');

    expect(headers['api-key']).toBe('test-key-123');
    expect(headers['Accept']).toBe('application/vnd.forem.api-v1+json');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['User-Agent']).toBe('Linus-MCP/0.1.0');
  });

  it('uses the exact API key provided', () => {
    const headers = buildHeaders('my-secret-key');
    expect(headers['api-key']).toBe('my-secret-key');
  });
});
