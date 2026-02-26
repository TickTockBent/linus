/**
 * Sliding window token bucket rate limiter.
 * Two buckets: create (10/30s) and update (30/30s).
 */

interface Bucket {
  maxTokens: number;
  windowMs: number;
  timestamps: number[];
}

export class RateLimiter {
  private buckets: Record<string, Bucket>;
  private backoffMs = 3000;
  private maxBackoffMs = 30000;

  constructor() {
    this.buckets = {
      create: { maxTokens: 10, windowMs: 30_000, timestamps: [] },
      update: { maxTokens: 30, windowMs: 30_000, timestamps: [] },
    };
  }

  async acquireCreate(): Promise<void> {
    await this.acquire('create');
  }

  async acquireUpdate(): Promise<void> {
    await this.acquire('update');
  }

  /** Record a 429 and return the backoff delay to wait. */
  recordRateLimitHit(): number {
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    return delay;
  }

  /** Reset backoff after a successful request. */
  resetBackoff(): void {
    this.backoffMs = 3000;
  }

  private async acquire(bucketName: string): Promise<void> {
    const bucket = this.buckets[bucketName];
    if (!bucket) return;

    const now = Date.now();
    // Prune expired timestamps
    bucket.timestamps = bucket.timestamps.filter(
      (timestamp) => now - timestamp < bucket.windowMs,
    );

    if (bucket.timestamps.length >= bucket.maxTokens) {
      // Wait until the oldest timestamp expires
      const oldestTimestamp = bucket.timestamps[0]!;
      const waitTime = oldestTimestamp + bucket.windowMs - now + 1;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      // Prune again after waiting
      const afterWait = Date.now();
      bucket.timestamps = bucket.timestamps.filter(
        (timestamp) => afterWait - timestamp < bucket.windowMs,
      );
    }

    bucket.timestamps.push(Date.now());
  }
}
