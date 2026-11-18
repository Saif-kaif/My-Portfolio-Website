import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createDatabase } from './db/pool.js';
import { createAdminRepository } from './repositories/adminRepository.js';

const config = loadConfig();
const db = createDatabase(config.database);
const app = createApp({ db, config });

const server = app.listen(config.port, config.host, () => {
  const host = config.host === '0.0.0.0' ? 'localhost' : config.host;
  console.log(`[server] Portfolio running at http://${host}:${config.port} (${config.nodeEnv})`);
});

server.on('error', (err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});

// Periodically remove expired admin sessions.
const adminRepository = createAdminRepository(db);
setInterval(() => {
  adminRepository.deleteExpiredSessions().catch(() => {});
}, 60 * 60 * 1000).unref();

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down…`);
  server.close(async () => {
    await db.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
