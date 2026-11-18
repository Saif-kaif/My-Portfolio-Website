import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashSessionToken, parseCookies } from '../src/middleware/auth.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';

describe('password hashing', () => {
  it('hashes with a random salt and verifies correctly', async () => {
    const hash = await hashPassword('correct horse battery staple');
    const again = await hashPassword('correct horse battery staple');
    assert.match(hash, /^scrypt\$32768\$8\$1\$/);
    assert.notEqual(hash, again);
    assert.equal(await verifyPassword('correct horse battery staple', hash), true);
    assert.equal(await verifyPassword('wrong password', hash), false);
  });

  it('rejects malformed stored hashes', async () => {
    assert.equal(await verifyPassword('x', 'not-a-hash'), false);
    assert.equal(await verifyPassword('x', 'scrypt$1$1$1$a$b'), false);
  });
});

describe('session helpers', () => {
  it('parses cookies and keeps the first occurrence', () => {
    assert.deepEqual(parseCookies('a=1; b=hello%20world; a=2'), { a: '1', b: 'hello world' });
    assert.deepEqual(parseCookies(undefined), {});
  });

  it('hashes tokens deterministically to 64 hex characters', () => {
    assert.match(hashSessionToken('token'), /^[0-9a-f]{64}$/);
    assert.equal(hashSessionToken('token'), hashSessionToken('token'));
  });
});

describe('rate limiter', () => {
  it('blocks requests over the limit with 429', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const req = { ip: '203.0.113.9' };
    const headers = {};
    const res = { setHeader: (k, v) => (headers[k] = v) };
    const results = [];
    for (let i = 0; i < 3; i += 1) limiter(req, res, (err) => results.push(err?.status ?? 'ok'));
    assert.deepEqual(results, ['ok', 'ok', 429]);
    assert.ok(Number(headers['Retry-After']) > 0);
  });

  it('tracks clients independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const res = { setHeader() {} };
    const results = [];
    limiter({ ip: '1.1.1.1' }, res, (err) => results.push(err?.status ?? 'ok'));
    limiter({ ip: '2.2.2.2' }, res, (err) => results.push(err?.status ?? 'ok'));
    assert.deepEqual(results, ['ok', 'ok']);
  });
});
