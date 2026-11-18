/**
 * Creates the database schema and loads verified seed data.
 *   npm run db:init           -> schema + seed
 *   npm run db:schema         -> schema only
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config/env.js';
import { createDatabase } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = loadConfig();
  const db = createDatabase(config.database);
  const schemaOnly = process.argv.includes('--schema-only');

  try {
    const schema = await readFile(path.join(here, 'schema.sql'), 'utf8');
    const seed = schemaOnly ? null : await readFile(path.join(here, 'seed.sql'), 'utf8');

    await db.transaction(async (client) => {
      await client.query(schema);
      if (seed) await client.query(seed);
    });

    console.log(`[db:init] Schema applied${seed ? ' and verified seed data loaded' : ''}.`);
  } catch (err) {
    console.error('[db:init] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();
