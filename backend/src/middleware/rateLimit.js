import { HttpError } from '../utils/httpError.js';

/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 * Suitable for a single-instance deployment; use a shared store (e.g. Redis)
 * if the app is ever scaled horizontally.
 */
export function createRateLimiter({
  windowMs,
  max,
  message = 'Too many requests. Please try again later.',
  keyGenerator = (req) => req.ip ?? req.socket?.remoteAddress ?? 'unknown',
}) {
  const hits = new Map();

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs);
  sweeper.unref?.();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = keyGenerator(req);

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    const resetSeconds = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return next(new HttpError(429, message));
    }
    return next();
  };
}
