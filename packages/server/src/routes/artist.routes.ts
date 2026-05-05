/**
 * /api/artists/* — public list/detail + artist-self CRUD + image uploads.
 *
 * Routes (auth column shows what role the route needs):
 *   GET    /api/artists                  public        list (filterable)
 *   GET    /api/artists/me               artist        current user's profile
 *   GET    /api/artists/:slug            public        single artist by slug
 *   POST   /api/artists                  artist        create profile
 *   PATCH  /api/artists/me               artist        update own profile
 *   POST   /api/artists/me/avatar        artist        upload avatar (multipart)
 *   POST   /api/artists/me/cover         artist        upload cover (multipart)
 *
 * Per spec §5.1.2 (artist user stories) and §4.1 (Artist directory).
 */
import { Router, type Request } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { avatarUpload, coverUpload } from '../middleware/upload.js';
import {
  createArtistSchema,
  listArtistsQuerySchema,
  updateArtistSchema,
} from '../schemas/artist.schemas.js';
import {
  createArtist,
  getArtistBySlug,
  getMyArtist,
  listArtists,
  updateMyArtist,
  uploadArtistImage,
} from '../services/artist.service.js';

export const artistRouter = Router();

// ─── Public list ──────────────────────────────────────────────────────
artistRouter.get('/', async (req, res, next) => {
  try {
    const query = listArtistsQuerySchema.parse(req.query);
    const result = await listArtists(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Artist-self: current user's artist (must come before :slug route) ─
artistRouter.get('/me', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const artist = await getMyArtist(req.user.id);
    res.json({ artist });
  } catch (err) {
    next(err);
  }
});

// ─── Public detail by slug ────────────────────────────────────────────
artistRouter.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug) throw new HttpError(400, 'Missing slug');
    const artist = await getArtistBySlug(slug);
    if (!artist) throw new HttpError(404, 'Artist not found');
    res.json({ artist });
  } catch (err) {
    next(err);
  }
});

// ─── Create artist profile ────────────────────────────────────────────
artistRouter.post('/', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const input = createArtistSchema.parse(req.body);
    const artist = await createArtist(req.user.id, input);
    res.status(201).json({ artist });
  } catch (err) {
    next(err);
  }
});

// ─── Update own profile ───────────────────────────────────────────────
artistRouter.patch('/me', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const patch = updateArtistSchema.parse(req.body);
    const artist = await updateMyArtist(req.user.id, patch);
    res.json({ artist });
  } catch (err) {
    next(err);
  }
});

// ─── Image uploads (multipart/form-data) ──────────────────────────────

function requireUploadedFile(req: Request): Express.Multer.File {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) throw new HttpError(400, 'No file uploaded under field name "image"');
  return file;
}

artistRouter.post(
  '/me/avatar',
  requireAuth,
  requireRole('artist'),
  avatarUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      const file = requireUploadedFile(req);
      const artist = await uploadArtistImage({
        userId: req.user.id,
        buffer: file.buffer,
        kind: 'avatar',
      });
      res.json({ avatarUrl: artist.avatarUrl, artist });
    } catch (err) {
      next(err);
    }
  },
);

artistRouter.post(
  '/me/cover',
  requireAuth,
  requireRole('artist'),
  coverUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      const file = requireUploadedFile(req);
      const artist = await uploadArtistImage({
        userId: req.user.id,
        buffer: file.buffer,
        kind: 'cover',
      });
      res.json({ coverImageUrl: artist.coverImageUrl, artist });
    } catch (err) {
      next(err);
    }
  },
);
