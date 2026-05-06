/**
 * Search routes.
 *
 *   GET /api/search?q=…&limit=…   public, no auth required
 */
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/error.js';
import { search } from '../services/search.service.js';

export const searchRouter = Router();

const querySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
});

searchRouter.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Missing or invalid query parameter "q"');
    }
    const { q, limit } = parsed.data;
    const results = await search(q, limit);
    res.json(results);
  } catch (err) {
    next(err);
  }
});
