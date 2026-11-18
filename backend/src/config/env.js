import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const BACKEND_ROOT = path.resolve(here, '..', '..');
export const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');
export const ENV_FILE = path.join(BACKEND_ROOT, '.env');

/** Loads backend/.env into process.env (existing variables take precedence). */
export function loadEnvFile(file = ENV_FILE) {
  if (existsSync(file)) process.loadEnvFile(file);
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseTrustProxy(value) {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value; // e.g. "loopback" or a list of subnets
}

/** Builds an immutable configuration object from an environment map. */
export function buildConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const port = toInt(env.PORT, 3000);

  return Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === 'production',
    host: env.HOST || '127.0.0.1',
    port,
    siteUrl: (env.SITE_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    frontendDir: path.join(PROJECT_ROOT, 'frontend'),
    session: Object.freeze({
      ttlHours: clamp(toInt(env.SESSION_TTL_HOURS, 8), 1, 168),
    }),
    rateLimit: Object.freeze({
      windowMs: 15 * 60 * 1000,
      apiMax: Math.max(1, toInt(env.RATE_LIMIT_API_MAX, 300)),
      contactMax: Math.max(1, toInt(env.RATE_LIMIT_CONTACT_MAX, 5)),
      loginMax: Math.max(1, toInt(env.RATE_LIMIT_LOGIN_MAX, 10)),
    }),
    database: Object.freeze({
      connectionString: env.DATABASE_URL || undefined,
      ssl:
        env.PGSSL === 'true'
          ? { rejectUnauthorized: env.PGSSL_REJECT_UNAUTHORIZED !== 'false' }
          : undefined,
      max: clamp(toInt(env.PG_POOL_MAX, 10), 1, 100),
    }),
  });
}

/** Loads .env and returns the runtime configuration. */
export function loadConfig() {
  loadEnvFile();
  return buildConfig(process.env);
}
