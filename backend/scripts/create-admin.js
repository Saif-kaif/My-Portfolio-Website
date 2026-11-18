/**
 * Creates an admin account, or resets the password of an existing one.
 *   npm run admin:create
 * Non-interactive: set ADMIN_USERNAME and ADMIN_PASSWORD in the environment.
 */
import readline from 'node:readline';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/db/pool.js';
import { hashPassword } from '../src/utils/password.js';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,64}$/;
const MIN_PASSWORD = 12;

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: Boolean(process.stdin.isTTY),
    });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
    if (hidden) rl._writeToOutput = () => {}; // do not echo the password
  });
}

async function main() {
  const config = loadConfig();

  const username = (process.env.ADMIN_USERNAME || (await ask('Admin username: '))).trim();
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Username must be 3–64 characters: letters, numbers, ".", "_" or "-".');
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await ask(`Password (min ${MIN_PASSWORD} characters): `, { hidden: true });
    const confirm = await ask('Confirm password: ', { hidden: true });
    if (password !== confirm) throw new Error('Passwords do not match.');
  }
  if (password.length < MIN_PASSWORD || password.length > 256) {
    throw new Error(`Password must be between ${MIN_PASSWORD} and 256 characters.`);
  }

  const db = createDatabase(config.database);
  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO admin_users (username, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, (xmax = 0) AS inserted`,
      [username, passwordHash],
    );
    const { id, inserted } = rows[0];
    if (!inserted) {
      await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [id]); // sign out old sessions
    }
    console.log(`[admin] ${inserted ? 'Created' : 'Updated password for'} admin "${username}".`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('[admin] Failed:', err.message);
  process.exitCode = 1;
});
