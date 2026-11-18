import pg from 'pg';

// Return DATE columns as plain 'YYYY-MM-DD' strings (avoids timezone shifts)
pg.types.setTypeParser(1082, (value) => value);
// Return NUMERIC columns (e.g. CGPA) as JavaScript numbers
pg.types.setTypeParser(1700, (value) => (value === null ? null : Number.parseFloat(value)));

/**
 * Creates the PostgreSQL access layer used by the application.
 * Connection settings come from DATABASE_URL or the standard PG* variables.
 */
export function createDatabase(dbConfig = {}, logger = console) {
  const pool = new pg.Pool({
    connectionString: dbConfig.connectionString,
    ssl: dbConfig.ssl,
    max: dbConfig.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    logger.error('[db] Unexpected error on idle client:', err.message);
  });

  return {
    pool,
    /** Runs a parameterized query. Never interpolate user input into `text`. */
    query: (text, params) => pool.query(text, params),
    /** Runs `fn(client)` inside a transaction. */
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
