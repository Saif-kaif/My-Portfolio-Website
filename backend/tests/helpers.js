import { createApp } from '../src/app.js';
import { buildConfig } from '../src/config/env.js';

export const silentLogger = { error() {}, warn() {}, info() {}, log() {} };

/**
 * A minimal stand-in for the pg pool. Each route is [RegExp, handler(params, text)].
 * The first route whose pattern matches the SQL text handles the query.
 * Every call is recorded so tests can assert that values were parameterized.
 */
export function createFakeDb(routes = []) {
  const calls = [];
  return {
    calls,
    async query(text, params = []) {
      calls.push({ text, params });
      for (const [pattern, handler] of routes) {
        if (pattern.test(text)) return handler(params, text);
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

export async function startTestServer({ db, env = {} } = {}) {
  const config = buildConfig({ NODE_ENV: 'test', ...env });
  const app = createApp({ db, config, logger: silentLogger });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    request: (path, init) => fetch(`${baseUrl}${path}`, init),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}

export const postJson = (body, headers = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

export const VERIFIED_PROFILE = Object.freeze({
  full_name: 'Saifuzzaman Kaif',
  university: 'Independent University, Bangladesh',
  department: 'Computer Science and Engineering',
  academic_start_year: 2024,
  academic_end_year: 2028,
  cgpa: 3.65,
  cgpa_scale: 4,
});

export const VERIFIED_SKILLS = Object.freeze([
  { id: 1, name: 'Python', category: 'Programming Languages', display_order: 1 },
  { id: 2, name: 'Java', category: 'Programming Languages', display_order: 2 },
  { id: 3, name: 'HTML', category: 'Web Development', display_order: 3 },
  { id: 4, name: 'SQL', category: 'Database', display_order: 4 },
]);

export const VERIFIED_ACHIEVEMENTS = Object.freeze([
  {
    id: 1,
    title: "The Duke of Edinburgh's International Award",
    award_level: 'Bronze',
    description: null,
    certificate_url: null,
    display_order: 1,
  },
]);
