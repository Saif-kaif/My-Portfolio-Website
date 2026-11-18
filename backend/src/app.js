import path from 'node:path';
import express from 'express';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { createAdminRepository } from './repositories/adminRepository.js';
import { createContactRepository } from './repositories/contactRepository.js';
import { createPortfolioRepository } from './repositories/portfolioRepository.js';
import { createProjectRepository } from './repositories/projectRepository.js';
import { adminRouter } from './routes/admin.js';
import { contactRouter } from './routes/contact.js';
import { healthRouter } from './routes/health.js';
import { portfolioRouter } from './routes/portfolio.js';
import { projectsRouter } from './routes/projects.js';
import { robotsTxt, sitemapXml } from './utils/seo.js';

/**
 * Builds the Express application.
 * @param {{ db: { query: Function }, config: object, logger?: Console }} deps
 * The database is injected so tests can run without PostgreSQL.
 */
export function createApp({ db, config, logger = console }) {
  const repositories = {
    portfolio: createPortfolioRepository(db),
    projects: createProjectRepository(db),
    contact: createContactRepository(db),
    admin: createAdminRepository(db),
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders({ isProduction: config.isProduction }));

  // ---------------- REST API ----------------
  const api = express.Router();
  api.use(createRateLimiter({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.apiMax }));
  api.use(express.json({ limit: '16kb', strict: true }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  api.use('/health', healthRouter({ db }));
  api.use(portfolioRouter(repositories));
  api.use('/projects', projectsRouter(repositories));
  api.use('/contact', contactRouter(repositories, config));
  api.use('/admin', adminRouter(repositories, config));
  api.use(notFound);
  app.use('/api', api);

  // ---------------- SEO ----------------
  app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsTxt(config.siteUrl)));
  app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(sitemapXml(config.siteUrl)));

  // ---------------- Static frontend ----------------
  app.use(
    express.static(config.frontendDir, {
      index: 'index.html',
      extensions: ['html'],
      maxAge: config.isProduction ? '1d' : 0,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        if (path.basename(filePath) === 'admin.html') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      },
    }),
  );

  app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {
      return res.status(404).sendFile(path.join(config.frontendDir, '404.html'));
    }
    return next();
  });

  app.use(notFound);
  app.use(errorHandler({ logger }));
  return app;
}
