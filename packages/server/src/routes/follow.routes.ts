/**
 * Follow routes.
 *
 *   POST   /api/follow              follow an artist  { artistId }
 *   DELETE /api/follow/:artistId    unfollow
 *   GET    /api/follow              list my followed artist IDs
 *   GET    /api/follow/feed/me      fan feed: recent tracks + upcoming gigs
 *   GET    /api/follow/:artistId    check follow status + live follower count
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  followArtist,
  unfollowArtist,
  getFollowedArtistIds,
  getFollowStatus,
  getFanFeed,
} from '../services/follow.service.js';
import { z } from 'zod';

export const followRouter = Router();

// All follow routes require authentication.
followRouter.use(requireAuth);

const followBodySchema = z.object({
  artistId: z.string().min(1),
});

// POST /api/follow
followRouter.post('/', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const { artistId } = followBodySchema.parse(req.body);
    const follow = await followArtist(req.user.id, artistId);
    const status = await getFollowStatus(req.user.id, artistId);
    res.status(201).json({ follow, followerCount: status.followerCount });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/follow/:artistId
followRouter.delete('/:artistId', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const { artistId } = req.params;
    if (!artistId) throw new HttpError(400, 'Missing artistId');
    await unfollowArtist(req.user.id, artistId);
    const status = await getFollowStatus(req.user.id, artistId);
    res.json({ followerCount: status.followerCount });
  } catch (err) {
    next(err);
  }
});

// GET /api/follow
followRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const artistIds = await getFollowedArtistIds(req.user.id);
    res.json({ artistIds });
  } catch (err) {
    next(err);
  }
});

// GET /api/follow/feed/me
// Must be before /:artistId so Express does not match "feed" as artistId.
followRouter.get('/feed/me', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const feed = await getFanFeed(req.user.id);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

// GET /api/follow/:artistId
followRouter.get('/:artistId', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const { artistId } = req.params;
    if (!artistId) throw new HttpError(400, 'Missing artistId');
    const status = await getFollowStatus(req.user.id, artistId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});
