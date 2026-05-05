/**
 * Server entry point. Boots the DB connection, then binds the Express app
 * to the configured port. Handles graceful shutdown on SIGTERM/SIGINT so
 * Render can rotate instances cleanly during deploys.
 */
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

async function main(): Promise<void> {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[server] StageOne API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });

  // Connect to DB after the HTTP server is already accepting requests so that
  // liveness probes return 200 immediately. Readiness probes return 503 until
  // this resolves. Mongoose handles reconnection internally after first connect.
  connectDB().catch((err: unknown) => {
    console.error('[db] Initial connection failed — readiness will stay 503:', err);
  });

  const shutdown = (signal: string): void => {
    // eslint-disable-next-line no-console
    console.log(`[server] ${signal} received — shutting down gracefully…`);
    server.close((err) => {
      if (err) {
        console.error('[server] Error during shutdown:', err);
        process.exit(1);
      }
      process.exit(0);
    });
    // Force-exit after 10s if shutdown hangs (e.g., long-running request).
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[server] Fatal boot error:', err);
  process.exit(1);
});
