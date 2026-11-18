import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  VERIFIED_ACHIEVEMENTS,
  VERIFIED_PROFILE,
  VERIFIED_SKILLS,
  createFakeDb,
  startTestServer,
} from './helpers.js';

describe('public API', () => {
  let server;
  const db = createFakeDb([
    [/SELECT 1/, () => ({ rows: [{ '?column?': 1 }] })],
    [/FROM profile/, () => ({ rows: [VERIFIED_PROFILE] })],
    [/FROM skills/, () => ({ rows: [...VERIFIED_SKILLS] })],
    [/FROM achievements/, () => ({ rows: [...VERIFIED_ACHIEVEMENTS] })],
    [/FROM projects WHERE id = \$1/, () => ({ rows: [] })],
    [/FROM projects/, () => ({ rows: [] })],
  ]);

  before(async () => {
    server = await startTestServer({ db });
  });
  after(() => server.close());

  it('GET /api/health reports ok when the database responds', async () => {
    const res = await server.request('/api/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'up');
  });

  it('GET /api/profile returns only the verified profile', async () => {
    const res = await server.request('/api/profile');
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.deepEqual(data, VERIFIED_PROFILE);
  });

  it('GET /api/skills returns skills with their categories', async () => {
    const res = await server.request('/api/skills');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.data.map((s) => s.name), ['Python', 'Java', 'HTML', 'SQL']);
    assert.deepEqual(body.meta.categories, ['Programming Languages', 'Web Development', 'Database']);
  });

  it('GET /api/achievements returns the Bronze award', async () => {
    const res = await server.request('/api/achievements');
    const { data } = await res.json();
    assert.equal(data.length, 1);
    assert.equal(data[0].award_level, 'Bronze');
  });

  it('GET /api/projects returns an empty list initially', async () => {
    const res = await server.request('/api/projects');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.data, []);
    assert.equal(body.meta.count, 0);
  });

  it('GET /api/projects/:id validates the id and returns 404 when missing', async () => {
    assert.equal((await server.request('/api/projects/abc')).status, 400);
    assert.equal((await server.request('/api/projects/1%20OR%201=1')).status, 400);
    assert.equal((await server.request('/api/projects/999')).status, 404);
  });

  it('unknown API routes return a JSON 404', async () => {
    const res = await server.request('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.status, 404);
  });

  it('sets security headers', async () => {
    const res = await server.request('/api/health');
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('serves robots.txt and sitemap.xml', async () => {
    const robots = await server.request('/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Disallow: \/admin/);
    const sitemap = await server.request('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(await sitemap.text(), /<urlset/);
  });

  it('serves the frontend index page', async () => {
    const res = await server.request('/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Saifuzzaman Kaif \| CSE Undergraduate Portfolio/);
  });
});

describe('public API when the database is unavailable', () => {
  let server;
  const db = createFakeDb([
    [
      /.*/,
      () => {
        const err = new Error('connect ECONNREFUSED 127.0.0.1:5432');
        err.code = 'ECONNREFUSED';
        throw err;
      },
    ],
  ]);

  before(async () => {
    server = await startTestServer({ db });
  });
  after(() => server.close());

  it('GET /api/health returns 503', async () => {
    const res = await server.request('/api/health');
    assert.equal(res.status, 503);
    assert.equal((await res.json()).database, 'down');
  });

  it('data endpoints return 503 without leaking internals', async () => {
    const res = await server.request('/api/profile');
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.doesNotMatch(JSON.stringify(body), /ECONNREFUSED|5432/);
  });
});
