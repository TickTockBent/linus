import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../../src/client/rate-limiter.js';

describe('RateLimiter', () => {
  it('allows requests within limits', async () => {
    const limiter = new RateLimiter();
    // Should not throw or hang for a single request
    await limiter.acquireCreate();
    await limiter.acquireUpdate();
  });

  it('records rate limit hit and returns backoff', () => {
    const limiter = new RateLimiter();

    const firstBackoff = limiter.recordRateLimitHit();
    expect(firstBackoff).toBe(3000);

    const secondBackoff = limiter.recordRateLimitHit();
    expect(secondBackoff).toBe(6000);

    const thirdBackoff = limiter.recordRateLimitHit();
    expect(thirdBackoff).toBe(12000);
  });

  it('resets backoff after successful request', () => {
    const limiter = new RateLimiter();

    limiter.recordRateLimitHit();
    limiter.recordRateLimitHit();
    limiter.resetBackoff();

    const backoff = limiter.recordRateLimitHit();
    expect(backoff).toBe(3000);
  });

  it('caps backoff at 30 seconds', () => {
    const limiter = new RateLimiter();

    // 3s, 6s, 12s, 24s, 30s (capped)
    for (let i = 0; i < 5; i++) {
      limiter.recordRateLimitHit();
    }
    const backoff = limiter.recordRateLimitHit();
    expect(backoff).toBeLessThanOrEqual(30000);
  });
});
