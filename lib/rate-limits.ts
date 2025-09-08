// in-memory, per-process (fine for single host)
type Bucket = { n: number; reset: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (b.n >= limit) return { allowed: false, remaining: 0, retryAfterMs: b.reset - now }
  b.n += 1
  return { allowed: true, remaining: limit - b.n }
}
