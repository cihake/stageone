/**
 * API route mount point. Every feature router is mounted here under /api.
 */
import { Router } from 'express';
import { adminRouter } from './admin.routes.js';
import { artistRouter } from './artist.routes.js';
import { authRouter } from './auth.routes.js';
import { followRouter } from './follow.routes.js';
import { gigArtistRouter, gigPublicRouter } from './gig.routes.js';
import { healthRouter } from './health.routes.js';
import { trackRouter } from './track.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/artists', artistRouter);
apiRouter.use('/artists/:slug/tracks', trackRouter);
apiRouter.use('/artists/:slug/gigs', gigArtistRouter);
apiRouter.use('/gigs', gigPublicRouter);
apiRouter.use('/follow', followRouter);
apiRouter.use('/admin', adminRouter);
