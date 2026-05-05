/**
 * Mongoose connection helper with retry-on-boot semantics.
 *
 * Atlas free-tier clusters can be slow to wake up from idle, so we retry the
 * initial connection a few times before giving up. After the first connect,
 * Mongoose handles its own reconnection internally.
 */
import mongoose from 'mongoose';
import { env, isProd } from './env.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;

mongoose.set('strictQuery', true);

export async function connectDB(): Promise<typeof mongoose> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10_000,
        autoIndex: !isProd, // Build indexes automatically in dev/staging only.
      });

      // eslint-disable-next-line no-console
      console.log(
        `[db] Connected to MongoDB (host=${conn.connection.host}, db=${conn.connection.name})`,
      );
      return conn;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      console.error(`[db] Connect attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  // Unreachable, but satisfies TS control flow.
  throw new Error('connectDB exhausted retries');
}

export type DbState =
  | 'disconnected'
  | 'connected'
  | 'connecting'
  | 'disconnecting'
  | 'uninitialized'
  | 'unknown';

// Mongoose's readyState codes: 0=disconnected, 1=connected, 2=connecting,
// 3=disconnecting, 99=uninitialized (its own internal sentinel).
const STATE_NAMES: Record<number, DbState> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export interface DbStatus {
  state: DbState;
  host: string | null;
  name: string | null;
}

export function dbStatus(): DbStatus {
  const code = mongoose.connection.readyState;
  return {
    state: STATE_NAMES[code] ?? 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
}
