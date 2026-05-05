/**
 * API route mount point. Every feature router is mounted here under /api.
 * Keep this file small — feature routes live in their own files.
 */
import { Router } from 'express';
import { adminRouter } from './admin.routes.js';
import { artistRouter } from './artist.routes.js';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { trackRouter } from './track.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/artists', artistRouter);
apiRouter.use('/artists/:slug/tracks', trackRouter);
apiRouter.use('/admin', adminRouter);

// Future mounts (added in later phases per release plan):
//   apiRouter.use('/gigs', gigRouter);         // v0.3
//   apiRouter.use('/ai', aiRouter);            // v0.4
