import { Router } from 'express';

export function healthRouter({ db }) {
  const router = Router();

  router.get('/', async (req, res) => {
    let database = 'up';
    try {
      await db.query('SELECT 1');
    } catch {
      database = 'down';
    }
    const healthy = database === 'up';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      database,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
