import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createFakeDb, postJson, startTestServer } from './helpers.js';

const VALID = { name: 'Test Sender', email: 'sender@example.com', message: 'Hello! This is a genuine test message.' };

describe('POST /api/contact', () => {
  let server;
  const db = createFakeDb([
    [/INSERT INTO contact_messages/, () => ({ rows: [{ id: '1', created_at: '2026-01-01T00:00:00.000Z' }] })],
  ]);

  before(async () => {
    // High contact limit here; rate limiting has its own test below.
    server = await startTestServer({ db, env: { RATE_LIMIT_CONTACT_MAX: '100' } });
  });
  after(() => server.close());
  beforeEach(() => {
    db.calls.length = 0;
  });

  it('stores a valid message and returns 201', async () => {
    const res = await server.request('/api/contact', postJson(VALID));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.id, '1');
    assert.match(body.message, /received/);
    assert.equal(db.calls.length, 1);
    assert.deepEqual(db.calls[0].params, [VALID.name, VALID.email, VALID.message]);
  });

  it('passes hostile input only as query parameters (SQL injection safe)', async () => {
    const payload = { ...VALID, name: "Robert'); DROP TABLE contact_messages;--" };
    const res = await server.request('/api/contact', postJson(payload));
    assert.equal(res.status, 201);
    const call = db.calls[0];
    assert.doesNotMatch(call.text, /DROP TABLE/);
    assert.equal(call.params[0], payload.name);
  });

  it('returns 422 with field details for invalid input', async () => {
    const res = await server.request('/api/contact', postJson({ name: 'A', email: 'nope', message: 'short' }));
    assert.equal(res.status, 422);
    const { error } = await res.json();
    assert.deepEqual(Object.keys(error.details).sort(), ['email', 'message', 'name']);
    assert.equal(db.calls.length, 0);
  });

  it('rejects messages over the length limit', async () => {
    const res = await server.request('/api/contact', postJson({ ...VALID, message: 'x'.repeat(2001) }));
    assert.equal(res.status, 422);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await server.request('/api/contact', postJson('{"name": '));
    assert.equal(res.status, 400);
  });

  it('rejects non-JSON bodies with 415', async () => {
    const res = await server.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'name=a&email=b&message=c',
    });
    assert.equal(res.status, 415);
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await server.request('/api/contact', postJson({ ...VALID, message: 'x'.repeat(20_000) }));
    assert.equal(res.status, 413);
  });

  it('rejects submissions that fill the honeypot field', async () => {
    const res = await server.request('/api/contact', postJson({ ...VALID, website: 'https://spam.example' }));
    assert.equal(res.status, 400);
    assert.equal(db.calls.length, 0);
  });
});

describe('POST /api/contact rate limiting', () => {
  let server;
  const db = createFakeDb([
    [/INSERT INTO contact_messages/, () => ({ rows: [{ id: '1', created_at: '2026-01-01T00:00:00.000Z' }] })],
  ]);

  before(async () => {
    server = await startTestServer({ db, env: { RATE_LIMIT_CONTACT_MAX: '3' } });
  });
  after(() => server.close());

  it('returns 429 after the limit is reached', async () => {
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push((await server.request('/api/contact', postJson(VALID))).status);
    }
    assert.deepEqual(statuses, [201, 201, 201, 429]);
  });
});
