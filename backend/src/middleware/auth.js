import { createHash, randomBytes } from 'node:crypto';
import { HttpError } from '../utils/httpError.js';

export const SESSION_COOKIE = 'sk_admin_session';
export const SESSION_COOKIE_PATH = '/api/admin';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url

export const generateSessionToken = () => randomBytes(32).toString('base64url');

/** Only the SHA-256 of a token is stored, so a database leak cannot be replayed. */
export const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');

export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    if (!name || Object.hasOwn(cookies, name)) continue;
    try {
      cookies[name] = decodeURIComponent(raw);
    } catch {
      cookies[name] = raw;
    }
  }
  return cookies;
}

export function readSessionToken(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

/** Authorisation middleware: rejects requests without a valid, unexpired session. */
export function requireAdmin(adminRepository) {
  return async function requireAdminSession(req, res, next) {
    const token = readSessionToken(req);
    if (!token) throw new HttpError(401, 'Authentication required.');

    const tokenHash = hashSessionToken(token);
    const admin = await adminRepository.findSessionAdmin(tokenHash);
    if (!admin) throw new HttpError(401, 'Your session has expired. Please sign in again.');

    req.admin = { id: admin.id, username: admin.username };
    req.sessionTokenHash = tokenHash;
    next();
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth (on top of SameSite=Strict cookies):
 * state-changing requests from browsers must originate from this site.
 */
export function sameOriginOnly(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin) {
    const fetchSite = req.get('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      return next(new HttpError(403, 'Cross-site requests are not allowed.'));
    }
    return next();
  }

  let originHost = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    /* invalid or opaque origin */
  }
  if (originHost && originHost === req.get('host')) return next();
  return next(new HttpError(403, 'Cross-site requests are not allowed.'));
}
