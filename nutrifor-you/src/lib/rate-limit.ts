const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
}

/**
 * Simple in-memory rate limiter.
 * Note: In serverless environments (e.g. Vercel), each function instance
 * has its own memory, so rate limiting is per-instance only.
 * For distributed rate limiting, use Redis (e.g. Upstash).
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()

  // Lazy cleanup: remove expired entries on each call to avoid memory leaks
  // without relying on setInterval (which is problematic in serverless)
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }

  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  entry.count++

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  }
}
