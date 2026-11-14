type Bucket = {
  count: number;
  resetAt: number;
};

/**
 * In-memory sliding-window rate limiter for a single Node process (systemd).
 * Not shared across processes — acceptable for MVP single-instance deploy.
 */
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterMs: 0,
  };
}

/** Artificial delay after failed login (ARCHITECTURE). */
export async function loginFailureDelay(ms = 400): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
