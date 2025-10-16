// lib/rate-limits.ts

// Token-bucket per-process limiter (good for single host / dev).
// For multi-instance, back this with Redis/Upstash using the same math.
type Bucket = {
  tokens: number; // current available tokens
  last: number; // last refill timestamp (ms)
  capacity: number; // max tokens (== limit)
  refillPerMs: number; // tokens added per ms (limit / windowMs)
};

const buckets = new Map<string, Bucket>();

// Simple periodic GC to avoid memory growth from one-off keys.
let callCount = 0;
const GC_EVERY = 500; // run GC every N calls
function gc(now: number, windowMs: number) {
  for (const [k, b] of buckets) {
    // If a bucket hasn't been touched for 2 windows, drop it.
    if (now - b.last > windowMs * 2) buckets.delete(k);
  }
}

/**
 * Rate limit using a token bucket.
 * - key: any stable identifier (IP, userId, route+IP, etc.)
 * - limit: tokens per window (default 30)
 * - windowMs: window length for refill rate (default 60_000)
 *
 * Returns:
 *  { allowed, remaining, retryAfterMs? }
 *   - retryAfterMs is present ONLY when not allowed.
 */
export function redditRateLimit(key: string) {
  return rateLimit(`reddit:${key}`, 30, 60_000); // 30 req/min
}

export function rateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const now = Date.now();

  // tiny GC
  if (++callCount % GC_EVERY === 0) gc(now, windowMs);

  const refillPerMs = limit / windowMs;
  const existing = buckets.get(key);

  let b: Bucket;
  if (!existing) {
    b = { tokens: limit, last: now, capacity: limit, refillPerMs };
    buckets.set(key, b);
  } else {
    b = existing;

    // If config changed across calls for same key, adapt gracefully.
    if (b.capacity !== limit || b.refillPerMs !== refillPerMs) {
      b.capacity = limit;
      b.refillPerMs = refillPerMs;
      // Clamp tokens to new capacity.
      b.tokens = Math.min(b.tokens, limit);
    }

    // Refill since last check.
    const elapsed = Math.max(0, now - b.last);
    if (elapsed > 0) {
      b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerMs);
    }
    b.last = now;
  }

  if (b.tokens < 1) {
    // Not enough tokens. Compute wait time for next token.
    const needed = 1 - b.tokens; // fraction of a token
    const retryAfterMs = Math.ceil(needed / b.refillPerMs);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  // Consume one token.
  b.tokens -= 1;

  // Remaining tokens rounded down to an int for UX/headers.
  const remaining = Math.max(0, Math.floor(b.tokens));
  return { allowed: true, remaining };
}

/**
 * Helper to build standard rate limit headers for responses.
 * Usage:
 *   const rl = rateLimit(key, 60, 60_000);
 *   return new Response(body, { status, headers: buildRateLimitHeaders(60, rl) });
 */
export function buildRateLimitHeaders(
  limit: number,
  result: { allowed: boolean; remaining: number; retryAfterMs?: number }
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.allowed && result.retryAfterMs != null) {
    // Seconds for Retry-After header
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
  }
  return headers;
}

// // in-memory, per-process (fine for single host)
// type Bucket = { n: number; reset: number }
// const buckets = new Map<string, Bucket>()

// export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
//   const now = Date.now()
//   const b = buckets.get(key)
//   if (!b || now > b.reset) {
//     buckets.set(key, { n: 1, reset: now + windowMs })
//     return { allowed: true, remaining: limit - 1 }
//   }
//   if (b.n >= limit) return { allowed: false, remaining: 0, retryAfterMs: b.reset - now }
//   b.n += 1
//   return { allowed: true, remaining: limit - b.n }
// }
