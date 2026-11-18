/**
 * Input validation and sanitisation helpers.
 * Values are normalised here; SQL safety comes from parameterized queries
 * and HTML safety from the frontend rendering with textContent.
 */

// Control characters except tab (\u0009), newline (\u000A) and carriage return (\u000D)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const LIMITS = Object.freeze({
  contact: Object.freeze({ nameMin: 2, nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 2000 }),
  project: Object.freeze({ titleMax: 150, descriptionMax: 5000, techMaxItems: 20, techItemMax: 40, urlMax: 2048 }),
});

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Length in Unicode code points (matches PostgreSQL char_length). */
export const charLength = (value) => [...value].length;

/** Trims, normalises and removes control characters (keeps newlines). */
export function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').normalize('NFC').trim();
}

/** Like cleanText but collapses all whitespace to single spaces. */
export function cleanLine(value) {
  return cleanText(value).replace(/\s+/g, ' ');
}

const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export function isValidEmail(email) {
  if (typeof email !== 'string' || email.length === 0 || email.length > LIMITS.contact.emailMax) return false;
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const local = email.slice(0, at);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return EMAIL_PATTERN.test(email);
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

const isRootRelativePath = (value) => /^\/(?![/\\])[^\s\\]*$/.test(value);

// ---------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------
export function validateContact(input) {
  const body = isPlainObject(input) ? input : {};
  const { nameMin, nameMax, emailMax, messageMin, messageMax } = LIMITS.contact;
  const errors = {};

  const name = cleanLine(body.name);
  const email = cleanText(body.email);
  const message = cleanText(body.message);

  if (!name) errors.name = 'Please enter your name.';
  else if (charLength(name) < nameMin || charLength(name) > nameMax)
    errors.name = `Name must be between ${nameMin} and ${nameMax} characters.`;

  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > emailMax) errors.email = `Email must be at most ${emailMax} characters.`;
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email address.';

  if (!message) errors.message = 'Please enter a message.';
  else if (charLength(message) < messageMin) errors.message = `Message must be at least ${messageMin} characters.`;
  else if (charLength(message) > messageMax) errors.message = `Message must be at most ${messageMax} characters.`;

  return { valid: Object.keys(errors).length === 0, errors, value: { name, email, message } };
}

// ---------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------
function parseTechnologies(raw) {
  const { techMaxItems, techItemMax } = LIMITS.project;
  if (raw === undefined || raw === null || raw === '') return { value: [] };

  const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null;
  if (!items) return { error: 'Technologies must be a list or a comma-separated string.' };

  const list = [];
  const seen = new Set();
  for (const item of items) {
    if (typeof item !== 'string') return { error: 'Each technology must be text.' };
    const tech = cleanLine(item);
    if (!tech) continue;
    if (charLength(tech) > techItemMax) return { error: `Each technology must be at most ${techItemMax} characters.` };
    const key = tech.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      list.push(tech);
    }
  }
  if (list.length > techMaxItems) return { error: `Add at most ${techMaxItems} technologies.` };
  return { value: list };
}

export function parseOptionalUrl(raw, { allowRelative = false } = {}) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: 'Must be a URL.' };
  const value = cleanText(raw);
  if (!value) return { value: null };
  if (value.length > LIMITS.project.urlMax) return { error: `URL must be at most ${LIMITS.project.urlMax} characters.` };
  if (isHttpUrl(value) || (allowRelative && isRootRelativePath(value))) return { value };
  return {
    error: allowRelative
      ? 'Must be an http(s) URL or a site path starting with "/".'
      : 'Must be a valid http(s) URL.',
  };
}

function parseOptionalDate(raw) {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: 'Date must use the YYYY-MM-DD format.' };
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    return { error: 'Date is not a valid calendar date.' };
  const year = date.getUTCFullYear();
  if (year < 1990 || year > 2100) return { error: 'Date must be between 1990 and 2100.' };
  return { value };
}

export const PROJECT_FIELDS = Object.freeze([
  'title', 'description', 'technologies', 'image_url', 'github_url', 'demo_url', 'project_date',
]);

/**
 * Validates a project payload.
 * @param {object} input
 * @param {{partial?: boolean}} options  partial=true validates only provided fields (PATCH)
 */
export function validateProject(input, { partial = false } = {}) {
  const body = isPlainObject(input) ? input : {};
  const { titleMax, descriptionMax } = LIMITS.project;
  const errors = {};
  const value = {};
  const shouldCheck = (key) => !partial || Object.hasOwn(body, key);

  if (shouldCheck('title')) {
    const title = cleanLine(body.title);
    if (!title) errors.title = 'Title is required.';
    else if (charLength(title) > titleMax) errors.title = `Title must be at most ${titleMax} characters.`;
    else value.title = title;
  }

  if (shouldCheck('description')) {
    const description = cleanText(body.description);
    if (!description) errors.description = 'Description is required.';
    else if (charLength(description) > descriptionMax)
      errors.description = `Description must be at most ${descriptionMax} characters.`;
    else value.description = description;
  }

  if (shouldCheck('technologies')) {
    const result = parseTechnologies(body.technologies);
    if (result.error) errors.technologies = result.error;
    else value.technologies = result.value;
  }

  for (const key of ['image_url', 'github_url', 'demo_url']) {
    if (!shouldCheck(key)) continue;
    const result = parseOptionalUrl(body[key], { allowRelative: key === 'image_url' });
    if (result.error) errors[key] = result.error;
    else value[key] = result.value;
  }

  if (shouldCheck('project_date')) {
    const result = parseOptionalDate(body.project_date);
    if (result.error) errors.project_date = result.error;
    else value.project_date = result.value;
  }

  if (partial && Object.keys(value).length === 0 && Object.keys(errors).length === 0) {
    errors.body = 'Provide at least one field to update.';
  }

  return { valid: Object.keys(errors).length === 0, errors, value };
}

// ---------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------

/** Parses a positive integer route id; returns null when invalid. */
export function parseId(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= 2_147_483_647 ? id : null;
}

export function parsePagination(query = {}) {
  const limit = Number.parseInt(query.limit, 10);
  const offset = Number.parseInt(query.offset, 10);
  return {
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50,
    offset: Number.isFinite(offset) ? Math.min(Math.max(offset, 0), 1_000_000) : 0,
  };
}
