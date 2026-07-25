interface WindowEntry {
  timestamps: number[];
  lockUntil?: number;
}

export class SlidingRateLimiter {
  private store = new Map<string, WindowEntry>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly lockoutMs: number = 0
  ) {}

  private cleanup(key: string, now: number) {
    const entry = this.store.get(key);
    if (!entry) return;
    const cutoff = now - this.windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.lockUntil && entry.lockUntil < now) {
      entry.lockUntil = undefined;
    }
    if (entry.timestamps.length === 0 && !entry.lockUntil) {
      this.store.delete(key);
    }
  }

  hit(key: string): { allowed: boolean; retryAfterMs: number; remaining: number } {
    const now = Date.now();
    this.cleanup(key, now);

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    if (entry.lockUntil && entry.lockUntil > now) {
      return {
        allowed: false,
        retryAfterMs: entry.lockUntil - now,
        remaining: 0,
      };
    }

    if (entry.timestamps.length >= this.limit) {
      const retryAfterMs = Math.max(...entry.timestamps) + this.windowMs - now;
      if (this.lockoutMs > 0) {
        entry.lockUntil = now + this.lockoutMs;
      }
      return {
        allowed: false,
        retryAfterMs,
        remaining: 0,
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: this.limit - entry.timestamps.length,
    };
  }

  reset(key: string) {
    this.store.delete(key);
  }
}

export const sendOtpLimiter = new SlidingRateLimiter(3, 10 * 60 * 1000, 10 * 60 * 1000);
export const verifyOtpLimiter = new SlidingRateLimiter(5, 10 * 60 * 1000, 15 * 60 * 1000);
