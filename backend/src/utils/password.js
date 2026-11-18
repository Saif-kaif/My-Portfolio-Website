/**
 * Password hashing with scrypt (memory-hard, built into Node.js).
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64>
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const PARAMS = Object.freeze({ N: 2 ** 15, r: 8, p: 1, keyLength: 64, saltLength: 16 });

const maxmemFor = (N, r) => 256 * N * r; // generous headroom over 128 * N * r

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) throw new TypeError('Password must be a non-empty string.');
  const { N, r, p, keyLength, saltLength } = PARAMS;
  const salt = randomBytes(saltLength);
  const key = await scrypt(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem: maxmemFor(N, r) });
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every(Number.isSafeInteger) || N < 2 ** 14 || N > 2 ** 20 || r < 1 || r > 32 || p < 1 || p > 16) return false;

  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  if (salt.length < 16 || expected.length < 32) return false;

  const actual = await scrypt(password.normalize('NFKC'), salt, expected.length, { N, r, p, maxmem: maxmemFor(N, r) });
  return timingSafeEqual(actual, expected);
}

let dummyHashPromise;
/** A real hash used to equalise timing when a username does not exist. */
export function getDummyHash() {
  dummyHashPromise ??= hashPassword(randomBytes(24).toString('base64'));
  return dummyHashPromise;
}
