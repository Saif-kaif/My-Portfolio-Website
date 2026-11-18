import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { hashPassword } from '../src/utils/password.js';
import { createFakeDb, postJson, startTestServer } from './helpers.js';

const PASSWORD = 'a-very-strong-test-password';

describe('admin API', () => {
  let server;
  let cookie;
  const sessions = new Set();
  const projects = [];
  let passwordHash;

  const db = createFakeDb([
    [/FROM admin_users WHERE username = \$1/, ([username]) => ({
      rows: username === 'admin' ? [{ id: 1, username: 'admin', password_hash: passwordHash }] : [],
    })],
    [/UPDATE admin_users SET last_login_at/, () => ({ rows: [], rowCount: 1 })],
    [/INSERT INTO admin_sessions/, ([tokenHash]) => {
      sessions.add(tokenHash);
      return { rows: [], rowCount: 1 };
    }],
    [/DELETE FROM admin_sessions WHERE token_hash/, ([tokenHash]) => {
      sessions.delete(tokenHash);
      return { rows: [], rowCount: 1 };
    }],
    [/FROM admin_sessions s/, ([tokenHash]) => ({
      rows: sessions.has(tokenHash) ? [{ id: 1, username: 'admin', expires_at: new Date(Date.now() + 3600e3) }] : [],
    })],
    [/INSERT INTO projects/, (params) => {
      const [title, description, technologies, image_url, github_url, demo_url, project_date] = params;
      const row = { id: projects.length + 1, title, description, technologies, image_url, github_url, demo_url, project_date };
      projects.push(row);
      return { rows: [row], rowCount: 1 };
    }],
    [/DELETE FROM projects WHERE id = \$1/, ([id]) => {
      const index = projects.findIndex((p) => p.id === id);
      if (index >= 0) projects.splice(index, 1);
      return { rows: [], rowCount: index >= 0 ? 1 : 0 };
    }],
  ]);

  before(async () => {
    passwordHash = await hashPassword(PASSWORD);
    server = await startTestServer({ db });
  });
  after(() => server.close());

  it('rejects unauthenticated write requests with 401', async () => {
    const res = await server.request('/api/admin/projects', postJson({ title: 'X', description: 'Y' }));
    assert.equal(res.status, 401);
    assert.equal(projects.length, 0);
  });

  it('rejects forged session cookies', async () => {
    const res = await server.request('/api/admin/session', {
      headers: { Cookie: `sk_admin_session=${'A'.repeat(43)}` },
    });
    assert.equal(res.status, 401);
  });

  it('rejects wrong credentials with a generic message', async () => {
    const wrongPassword = await server.request('/api/admin/login', postJson({ username: 'admin', password: 'wrong-password' }));
    const unknownUser = await server.request('/api/admin/login', postJson({ username: 'nobody', password: 'wrong-password' }));
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.equal((await wrongPassword.json()).error.message, (await unknownUser.json()).error.message);
  });

  it('logs in and sets a secure session cookie', async () => {
    const res = await server.request('/api/admin/login', postJson({ username: 'admin', password: PASSWORD }));
    assert.equal(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.match(setCookie, /sk_admin_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    assert.match(setCookie, /Path=\/api\/admin/);
    cookie = setCookie.split(';')[0];
    assert.equal(sessions.size, 1);
    // Only the hash of the token is stored.
    assert.ok(![...sessions].includes(cookie.split('=')[1]));
  });

  it('creates a project when authenticated', async () => {
    const res = await server.request(
      '/api/admin/projects',
      postJson({ title: 'Test Project', description: 'Created in a test.', technologies: 'Python, SQL' }, { Cookie: cookie }),
    );
    assert.equal(res.status, 201);
    const { data } = await res.json();
    assert.deepEqual(data.technologies, ['Python', 'SQL']);
    assert.equal(res.headers.get('location'), `/api/projects/${data.id}`);
  });

  it('validates project input', async () => {
    const res = await server.request(
      '/api/admin/projects',
      postJson({ title: '', description: '', github_url: 'javascript:alert(1)' }, { Cookie: cookie }),
    );
    assert.equal(res.status, 422);
    const { error } = await res.json();
    assert.ok(error.details.title && error.details.description && error.details.github_url);
  });

  it('blocks cross-origin write requests even with a valid session', async () => {
    const res = await server.request(
      '/api/admin/projects',
      postJson({ title: 'X', description: 'Y' }, { Cookie: cookie, Origin: 'https://evil.example' }),
    );
    assert.equal(res.status, 403);
  });

  it('deletes a project and returns 404 for a missing one', async () => {
    const del = await server.request('/api/admin/projects/1', { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(del.status, 204);
    const again = await server.request('/api/admin/projects/1', { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(again.status, 404);
  });

  it('logs out and invalidates the session', async () => {
    const res = await server.request('/api/admin/logout', { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(res.status, 204);
    const after = await server.request('/api/admin/session', { headers: { Cookie: cookie } });
    assert.equal(after.status, 401);
  });
});
