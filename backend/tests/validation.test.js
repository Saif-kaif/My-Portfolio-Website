import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanLine,
  isValidEmail,
  parseId,
  parsePagination,
  validateContact,
  validateProject,
} from '../src/utils/validation.js';

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    for (const email of ['a@b.co', 'first.last+tag@example.com', 'x_y@sub.domain.org']) {
      assert.equal(isValidEmail(email), true, email);
    }
  });

  it('rejects malformed addresses', () => {
    for (const email of ['', 'plain', '@example.com', 'a@', 'a@b', 'a..b@example.com', '.a@example.com', 'a b@example.com', 'a@exa mple.com']) {
      assert.equal(isValidEmail(email), false, email);
    }
  });

  it('rejects addresses longer than 254 characters', () => {
    assert.equal(isValidEmail(`${'a'.repeat(60)}@${'b'.repeat(190)}.com`), false);
  });
});

describe('validateContact', () => {
  const valid = { name: 'Test Sender', email: 'sender@example.com', message: 'Hello, this is a test message.' };

  it('accepts a valid submission and trims values', () => {
    const result = validateContact({ ...valid, name: '  Test   Sender ' });
    assert.equal(result.valid, true);
    assert.equal(result.value.name, 'Test Sender');
  });

  it('reports every missing field', () => {
    const result = validateContact({});
    assert.equal(result.valid, false);
    assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'message', 'name']);
  });

  it('enforces length limits', () => {
    assert.ok(validateContact({ ...valid, name: 'A' }).errors.name);
    assert.ok(validateContact({ ...valid, name: 'A'.repeat(101) }).errors.name);
    assert.ok(validateContact({ ...valid, message: 'short' }).errors.message);
    assert.ok(validateContact({ ...valid, message: 'x'.repeat(2001) }).errors.message);
    assert.equal(validateContact({ ...valid, message: 'x'.repeat(2000) }).valid, true);
  });

  it('rejects an invalid email', () => {
    assert.equal(validateContact({ ...valid, email: 'not-an-email' }).errors.email, 'Please enter a valid email address.');
  });

  it('strips control characters but keeps newlines in the message', () => {
    const result = validateContact({ ...valid, message: 'Line one\u0000\r\nLine two is here' });
    assert.equal(result.value.message, 'Line one\nLine two is here');
  });

  it('ignores non-string values safely', () => {
    const result = validateContact({ name: ['x'], email: { $ne: 1 }, message: 42 });
    assert.equal(result.valid, false);
  });

  it('handles non-object input', () => {
    assert.equal(validateContact(null).valid, false);
    assert.equal(validateContact('text').valid, false);
  });
});

describe('validateProject', () => {
  const base = { title: 'A Project', description: 'Something real.' };

  it('requires title and description on create', () => {
    const result = validateProject({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.title);
    assert.ok(result.errors.description);
  });

  it('normalises technologies from a comma-separated string and removes duplicates', () => {
    const result = validateProject({ ...base, technologies: 'Python, SQL, python, , HTML' });
    assert.equal(result.valid, true);
    assert.deepEqual(result.value.technologies, ['Python', 'SQL', 'HTML']);
  });

  it('only accepts http(s) URLs for links', () => {
    assert.ok(validateProject({ ...base, github_url: 'javascript:alert(1)' }).errors.github_url);
    assert.ok(validateProject({ ...base, demo_url: 'ftp://example.com' }).errors.demo_url);
    assert.equal(validateProject({ ...base, github_url: 'https://github.com/example/repo' }).valid, true);
  });

  it('allows site-relative image paths but not protocol-relative ones', () => {
    assert.equal(validateProject({ ...base, image_url: '/assets/projects/shot.webp' }).valid, true);
    assert.ok(validateProject({ ...base, image_url: '//evil.example/x.png' }).errors.image_url);
  });

  it('validates calendar dates', () => {
    assert.equal(validateProject({ ...base, project_date: '2026-02-28' }).valid, true);
    assert.ok(validateProject({ ...base, project_date: '2026-02-30' }).errors.project_date);
    assert.ok(validateProject({ ...base, project_date: '28/02/2026' }).errors.project_date);
  });

  it('converts empty optional fields to null', () => {
    const result = validateProject({ ...base, image_url: '', github_url: '  ', project_date: '' });
    assert.equal(result.value.image_url, null);
    assert.equal(result.value.github_url, null);
    assert.equal(result.value.project_date, null);
  });

  it('supports partial updates', () => {
    const result = validateProject({ title: 'New title' }, { partial: true });
    assert.equal(result.valid, true);
    assert.deepEqual(result.value, { title: 'New title' });
    assert.equal(validateProject({}, { partial: true }).valid, false);
  });
});

describe('helpers', () => {
  it('parseId accepts only positive 32-bit integers', () => {
    assert.equal(parseId('42'), 42);
    for (const raw of ['0', '-1', '1.5', 'abc', '1 OR 1=1', '99999999999', '']) assert.equal(parseId(raw), null, raw);
  });

  it('parsePagination clamps values', () => {
    assert.deepEqual(parsePagination({}), { limit: 50, offset: 0 });
    assert.deepEqual(parsePagination({ limit: '500', offset: '-3' }), { limit: 100, offset: 0 });
  });

  it('cleanLine collapses whitespace', () => {
    assert.equal(cleanLine('  a \n\t b  '), 'a b');
  });
});
