import { Router } from 'express';
import { HttpError } from '../utils/httpError.js';

const PUBLIC_CACHE = 'public, max-age=300';

export function portfolioRouter({ portfolio }) {
  const router = Router();

  router.get('/profile', async (req, res) => {
    const profile = await portfolio.getProfile();
    if (!profile) throw new HttpError(404, 'The profile has not been configured yet.');
    res.set('Cache-Control', PUBLIC_CACHE).json({ data: profile });
  });

  router.get('/skills', async (req, res) => {
    const skills = await portfolio.listSkills();
    const categories = [...new Set(skills.map((skill) => skill.category))];
    res.set('Cache-Control', PUBLIC_CACHE).json({ data: skills, meta: { categories } });
  });

  router.get('/achievements', async (req, res) => {
    const achievements = await portfolio.listAchievements();
    res.set('Cache-Control', PUBLIC_CACHE).json({ data: achievements });
  });

  return router;
}
