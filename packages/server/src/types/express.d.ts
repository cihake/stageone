/**
 * Augment Express's Request type so middleware can attach the authenticated
 * user without TypeScript complaining. Imported via tsconfig "include" /
 * "files" — no explicit import needed in consumer files.
 */
import type { UserRole } from '../models/User.js';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
