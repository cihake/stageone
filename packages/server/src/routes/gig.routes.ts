/**
 * Gig routes.
 *
 * Public:
 *   GET  /api/gigs                         list upcoming gigs (city+genre filter)
 *   GET  /api/artists/:slug/gigs           artist-specific gig list
 *
 * Artist-owned (nested under artist slug):
 *   POST   /api/artists/:slug/gigs         create gig
 *   PATCH  /api/artists/:slug/gigs/:id     update gig
 *   DELETE /api/artists/:slug/gigs/:id     delete gig
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { listGigsQuerySchema, createGigSchema, updateGigSchema } from '../schemas/gig.schemas.js';
import {
  listGigs,
  listArtistGigs,
  createGig,
  updateGig,
  deleteGig,
} from '../services/gig.service.js';

// Merged params type for routes nested under /api/artists/:slug
type SlugParams = { slug: string };
type GigParams = { slug: string; gigId: string };

// Public top-level router: GET /api/gigs
export const gigPublicRouter = Router();

gigPublicRouter.get('/', async (req, res, next) => {
  try {
    const query = listGigsQuerySchema.parse(req.query);
    const result = await listGigs(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Artist-nested router: /api/artists/:slug/gigs
export const gigArtistRouter = Router({ mergeParams: true });

// Public: list this artist's upcoming gigs
gigArtistRouter.get('/', async (req, res, next) => {
  try {
    const { slug } = req.params as unknown as SlugParams;
    const gigs = await listArtistGigs(slug);
    res.json({ items: gigs });
  } catch (err) {
    next(err);
  }
});

// Artist: create gig
gigArtistRouter.post('/', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const { slug } = req.params as unknown as SlugParams;
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const input = createGigSchema.parse(req.body);
    const gig = await createGig(slug, req.user.id, input);
    res.status(201).json({ gig });
  } catch (err) {
    next(err);
  }
});

// Artist: update gig
gigArtistRouter.patch('/:gigId', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const { slug, gigId } = req.params as unknown as GigParams;
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const patch = updateGigSchema.parse(req.body);
    const gig = await updateGig(slug, gigId, req.user.id, patch);
    res.json({ gig });
  } catch (err) {
    next(err);
  }
});

// Artist: delete gig
gigArtistRouter.delete('/:gigId', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const { slug, gigId } = req.params as unknown as GigParams;
    if (!req.user) throw new HttpError(401, 'Authentication required');
    await deleteGig(slug, gigId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
