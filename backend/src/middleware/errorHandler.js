import { HttpError } from '../utils/httpError.js';

// Connection / availability failures from Node or PostgreSQL
const DB_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN',
  '08000', '08001', '08003', '08004', '08006', '57P01', '57P02', '57P03', '3D000', '28000', '28P01',
]);

const isDatabaseUnavailable = (err) =>
  DB_UNAVAILABLE_CODES.has(err?.code) ||
  /connection terminated|timeout exceeded when trying to connect|connect ECONNREFUSED/i.test(err?.message ?? '');

export function notFound(req, res, next) {
  next(new HttpError(404, 'The requested resource was not found.'));
}

/** Centralised error handler: consistent JSON shape, no internal details leaked. */
export function errorHandler({ logger = console } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function handleError(err, req, res, next) {
    if (res.headersSent) return next(err);

    let status = 500;
    let message = 'An unexpected error occurred. Please try again later.';
    let details;

    if (err instanceof HttpError) {
      ({ status, message, details } = err);
    } else if (err?.type === 'entity.parse.failed') {
      status = 400;
      message = 'Request body contains malformed JSON.';
    } else if (err?.type === 'entity.too.large') {
      status = 413;
      message = 'Request body is too large.';
    } else if (err?.type === 'charset.unsupported' || err?.type === 'encoding.unsupported') {
      status = 415;
      message = 'Unsupported request encoding.';
    } else if (isDatabaseUnavailable(err)) {
      status = 503;
      message = 'The service is temporarily unavailable. Please try again shortly.';
    } else if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 && err.expose) {
      status = err.status;
      message = err.message;
    }

    if (status >= 500) logger.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    if (status === 503) res.setHeader('Retry-After', '30');

    res.status(status).json({ error: { status, message, ...(details ? { details } : {}) } });
  };
}
