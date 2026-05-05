/**
 * Express app factory. Builds the app without binding a port so it can be
 * exercised by tests in a future phase without spinning up a real server.
 */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isDev } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { notFoundHandler } from './middleware/notFound.js';
import { apiRouter } from './routes/index.js';

export function createApp(): express.Express {
  const app = express();

  // ─── Security headers ───────────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ───────────────────────────────────────────────────────────
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  // ─── Body + cookie parsing ──────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ─── Logging ────────────────────────────────────────────────────────
  app.use(morgan(isDev ? 'dev' : 'combined'));

  // ─── Global rate limit (per spec §6.2) ──────────────────────────────
  // Per-route stricter limits will be added on /api/auth and /api/ai.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 200,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  // ─── Routes ─────────────────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ─── 404 + error handlers (must be last) ────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
