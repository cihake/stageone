/**
 * Per-route rate limiters. Stricter than the global limiter in app.ts.
 * Per spec §6.2.
 */
import rateLimit from 'express-rate-limit';

/** Auth endpoints: 20 requests per minute per IP. */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many auth attempts; please slow down.',
  },
});

/** AI endpoints (Phase 4): 10 requests per minute per authenticated user. */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  message: {
    error: 'TooManyRequests',
    message: 'AI assistant rate limit reached; try again in a minute.',
  },
});
