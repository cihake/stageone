/**
 * /api/artists/:slug/tracks — Track CRUD nested under an artist.
 *
 * Routes:
 *   GET    /api/artists/:slug/tracks           public   list tracks
 *   POST   /api/artists/:slug/tracks           artist   create track
 *   PATCH  /api/artists/:slug/tracks/:id       artist   update track
 *   DELETE /api/artists/:slug/tracks/:id       artist   delete track
 */
import { Router } from 'express';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { createTrackSchema, updateTrackSchema, listTracksQuerySchema } from '../schemas/track.schemas.js';
import { createTrack, deleteTrack, listTracks, updateTrack } from '../services/track.service.js';

// Mounted at /api/artists/:slug/tracks (note: uses mergeParams to access :slug)
export const trackRouter = Router({ mergeParams: true });

// ─── List tracks (public, but owner can see unpublished too) ──────────
trackRouter.get('/', optionalAuth, async (req, res, next) => {
	try {
		const slug = req.params.slug;
		if (!slug) throw new HttpError(400, 'Missing slug');

		const query = listTracksQuerySchema.parse(req.query);

		// Check ownership: user is authenticated AND owns this artist profile.
		// We'll let the service resolve that; pass userId so service can check.
		const userId = req.user?.id;

		// Actually for GET, let's only show unpublished to the owner.
		// We need to know if req.user is actually the artist owner — the service
		// handles this by checking userId against the artist record.
		let actuallyOwner = false;
		if (userId) {
			const { Artist } = await import('../models/index.js');
			const artist = await Artist.findOne({ slug: slug.toLowerCase() });
			if (artist && String(artist.userId) === userId) actuallyOwner = true;
		}

		const result = await listTracks(slug, query, actuallyOwner);
		res.json(result);
	} catch (err) {
		next(err);
	}
});

// ─── Create track ─────────────────────────────────────────────────────
trackRouter.post('/', requireAuth, requireRole('artist'), async (req, res, next) => {
	try {
		const slug = req.params.slug;
		if (!slug) throw new HttpError(400, 'Missing slug');
		if (!req.user) throw new HttpError(401, 'Authentication required');

		const input = createTrackSchema.parse(req.body);
		const track = await createTrack(slug, req.user.id, input);
		res.status(201).json({ track });
	} catch (err) {
		next(err);
	}
});

// ─── Update track ─────────────────────────────────────────────────────
trackRouter.patch('/:trackId', requireAuth, requireRole('artist'), async (req, res, next) => {
	try {
		const { slug, trackId } = req.params;
		if (!slug || !trackId) throw new HttpError(400, 'Missing slug or trackId');
		if (!req.user) throw new HttpError(401, 'Authentication required');

		const patch = updateTrackSchema.parse(req.body);
		const track = await updateTrack(slug, trackId, req.user.id, patch);
		res.json({ track });
	} catch (err) {
		next(err);
	}
});

// ─── Delete track ─────────────────────────────────────────────────────
trackRouter.delete('/:trackId', requireAuth, requireRole('artist'), async (req, res, next) => {
	try {
		const { slug, trackId } = req.params;
		if (!slug || !trackId) throw new HttpError(400, 'Missing slug or trackId');
		if (!req.user) throw new HttpError(401, 'Authentication required');

		await deleteTrack(slug, trackId, req.user.id);
		res.status(204).send();
	} catch (err) {
		next(err);
	}
});
