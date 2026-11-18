import { Router } from 'express';
import { HttpError } from '../utils/httpError.js';
import { parseId } from '../utils/validation.js';

/** Public, read-only project endpoints. Writes live under /api/admin/projects. */
export function projectsRouter({ projects }) {
  const router = Router();

  router.get('/', async (req, res) => {
    const rows = await projects.list();
    res.set('Cache-Control', 'public, max-age=60').json({ data: rows, meta: { count: rows.length } });
  });

  router.get('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) throw new HttpError(400, 'Project id must be a positive integer.');
    const project = await projects.findById(id);
    if (!project) throw new HttpError(404, 'Project not found.');
    res.json({ data: project });
  });

  return router;
}
