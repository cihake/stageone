/**
 * API route mount point. Every feature router is mounted here under /api.
 * Keep this file small — feature routes live in their own files.
 */
import { Router } from 'express';
import { artistRouter } from './artist.routes.js';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/artists', artistRouter);

// Future mounts (added in later phases per release plan):
//   apiRouter.use('/tracks', trackRouter);     // v0.3
//   apiRouter.use('/gigs', gigRouter);         // v0.3
//   apiRouter.use('/ai', aiRouter);            // v1.0-rc
