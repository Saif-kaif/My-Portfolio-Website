/**
 * Vercel serverless entry point.
 * Vercel serves frontend/ as static files; vercel.json rewrites /api/*,
 * /robots.txt and /sitemap.xml to this function, which runs the Express app.
 * The original request path is preserved, so Express routing works unchanged.
 */
import { createApp } from '../backend/src/app.js';
import { buildConfig } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/db/pool.js';

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

// Vercel/Neon integrations may name the connection string differently depending on the prefix chosen.
const databaseUrl =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || process.env.NEON_DATABASE_URL;

// Serverless-friendly defaults; any variable set in the Vercel dashboard wins.
const config = buildConfig({
  NODE_ENV: 'production',
  TRUST_PROXY: 'true', // Vercel's proxy sets X-Forwarded-For; needed for per-IP rate limits
  PG_POOL_MAX: '3', // each function instance keeps only a few connections
  ...(productionHost ? { SITE_URL: `https://${productionHost}` } : {}),
  ...process.env,
  ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
});

// Created once per function instance and reused across invocations.
const db = createDatabase(config.database);

export default createApp({ db, config });
