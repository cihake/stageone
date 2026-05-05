/**
 * Health endpoints — used by uptime monitor (UptimeRobot, per release plan §6.5)
 * and by the client smoke page to confirm full-stack connectivity.
 *
 *   GET /api/health        →  liveness  — process is up
 *   GET /api/health/ready  →  readiness — DB is connected too
 */
import { Router } from 'express';
import { dbStatus } from '../config/db.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'stageone-api',
    env: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', (_req, res) => {
  const db = dbStatus();
  const ready = db.state === 'connected';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    db,
    timestamp: new Date().toISOString(),
  });
});
