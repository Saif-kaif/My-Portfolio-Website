import { Router } from 'express';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { HttpError } from '../utils/httpError.js';
import { validateContact } from '../utils/validation.js';

export function contactRouter({ contact }, config) {
  const router = Router();

  const limiter = createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.contactMax,
    message: 'Too many messages sent from this connection. Please wait a few minutes and try again.',
  });

  router.post('/', limiter, async (req, res) => {
    if (!req.is('application/json')) throw new HttpError(415, 'Content-Type must be application/json.');

    // Honeypot field: hidden from people, often filled in by bots.
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      throw new HttpError(400, 'Your message could not be accepted.');
    }

    const { valid, errors, value } = validateContact(req.body);
    if (!valid) throw new HttpError(422, 'Please correct the highlighted fields.', errors);

    const saved = await contact.create(value);
    res.status(201).json({
      data: { id: saved.id, created_at: saved.created_at },
      message: 'Thank you! Your message has been received.',
    });
  });

  return router;
}
