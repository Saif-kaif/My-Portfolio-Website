import { Router } from 'express';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_PATH,
  generateSessionToken,
  hashSessionToken,
  requireAdmin,
  sameOriginOnly,
} from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { HttpError } from '../utils/httpError.js';
import { getDummyHash, verifyPassword } from '../utils/password.js';
import {
  cleanLine,
  parseId,
  parseOptionalUrl,
  parsePagination,
  validateProject,
} from '../utils/validation.js';

/**
 * Administrative API. Every route except /login requires a valid session
 * (HttpOnly, SameSite=Strict cookie) and same-origin requests for writes.
 */
export function adminRouter({ admin, projects, contact, portfolio }, config) {
  const router = Router();

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    path: SESSION_COOKIE_PATH,
  };

  const loginLimiter = createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.loginMax,
    message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
  });

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  router.use(sameOriginOnly);

  // ---------------- Authentication ----------------
  router.post('/login', loginLimiter, async (req, res) => {
    const username = cleanLine(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password || username.length > 64 || password.length > 256) {
      throw new HttpError(400, 'Username and password are required.');
    }

    const user = await admin.findUserByUsername(username);
    // Always run a hash comparison so response time does not reveal valid usernames.
    const passwordOk = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
    if (!user || !passwordOk) throw new HttpError(401, 'Invalid username or password.');

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + config.session.ttlHours * 60 * 60 * 1000);
    await admin.createSession(user.id, hashSessionToken(token), expiresAt);
    await admin.recordLogin(user.id);

    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
    res.json({ data: { username: user.username, expires_at: expiresAt.toISOString() } });
  });

  // Everything below requires an authenticated admin.
  router.use(requireAdmin(admin));

  router.get('/session', (req, res) => {
    res.json({ data: { username: req.admin.username } });
  });

  router.post('/logout', async (req, res) => {
    await admin.deleteSession(req.sessionTokenHash);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  // ---------------- Projects ----------------
  const requireJson = (req) => {
    if (!req.is('application/json')) throw new HttpError(415, 'Content-Type must be application/json.');
  };
  const requireId = (raw) => {
    const id = parseId(raw);
    if (id === null) throw new HttpError(400, 'Id must be a positive integer.');
    return id;
  };

  router.get('/projects', async (req, res) => {
    res.json({ data: await projects.list() });
  });

  router.post('/projects', async (req, res) => {
    requireJson(req);
    const { valid, errors, value } = validateProject(req.body);
    if (!valid) throw new HttpError(422, 'Please correct the highlighted fields.', errors);
    const created = await projects.create(value);
    res.status(201).location(`/api/projects/${created.id}`).json({ data: created });
  });

  const updateProject = (partial) => async (req, res) => {
    const id = requireId(req.params.id);
    requireJson(req);
    const { valid, errors, value } = validateProject(req.body, { partial });
    if (!valid) throw new HttpError(422, 'Please correct the highlighted fields.', errors);
    const updated = await projects.update(id, value);
    if (!updated) throw new HttpError(404, 'Project not found.');
    res.json({ data: updated });
  };
  router.put('/projects/:id', updateProject(false));
  router.patch('/projects/:id', updateProject(true));

  router.delete('/projects/:id', async (req, res) => {
    const id = requireId(req.params.id);
    if (!(await projects.remove(id))) throw new HttpError(404, 'Project not found.');
    res.status(204).end();
  });

  // ---------------- Contact messages ----------------
  router.get('/messages', async (req, res) => {
    const { limit, offset } = parsePagination(req.query);
    const { rows, total } = await contact.list({ limit, offset });
    res.json({ data: rows, meta: { total, limit, offset } });
  });

  router.delete('/messages/:id', async (req, res) => {
    const id = requireId(req.params.id);
    if (!(await contact.remove(id))) throw new HttpError(404, 'Message not found.');
    res.status(204).end();
  });

  // ---------------- Achievements (certificate link) ----------------
  router.get('/achievements', async (req, res) => {
    res.json({ data: await portfolio.listAchievements() });
  });

  router.put('/achievements/:id/certificate', async (req, res) => {
    const id = requireId(req.params.id);
    requireJson(req);
    const result = parseOptionalUrl(req.body?.certificate_url, { allowRelative: true });
    if (result.error) {
      throw new HttpError(422, 'Please correct the highlighted fields.', { certificate_url: result.error });
    }
    const updated = await portfolio.updateAchievementCertificate(id, result.value);
    if (!updated) throw new HttpError(404, 'Achievement not found.');
    res.json({ data: updated });
  });

  return router;
}
