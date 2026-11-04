import rateLimit from 'express-rate-limit'

/** Global ceiling per IP; APIs stay usable for real clients, bots get 429s. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' } },
})

/**
 * Strict limiter for credential endpoints per IP: brute forcing one account or
 * spraying many is throttled to 10 attempts / 15 min. Set in env as LOGIN limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts' } },
})
