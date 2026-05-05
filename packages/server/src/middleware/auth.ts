/**
 * Authentication and authorization middleware.
 *
 *   - requireAuth   → 401 if no valid access token; otherwise attaches req.user
 *   - requireRole   → 403 if req.user.role isn't in the allowed list
 *   - optionalAuth  → attaches req.user if a valid token is present, otherwise no-op
 *
 * Token source: the `so_at` httpOnly cookie (set by /api/auth/login). Falling
 * back to the `Authorization: Bearer <token>` header makes curl-based
 * debugging painless.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ACCESS_COOKIE } from '../lib/cookies.js';
import { verifyAccessJwt } from '../lib/tokens.js';
import { HttpError } from './error.js';
import type { UserRole } from '../models/User.js';

function readAccessToken(req: Request): string | null {
  // Cookie first (browser flow)
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const fromCookie = cookies?.[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;

  // Authorization header second (curl / Postman flow)
  const header = req.header('authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readAccessToken(req);
  if (!token) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  try {
    const claims = verifyAccessJwt(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = readAccessToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const claims = verifyAccessJwt(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
  } catch {
    // Ignore — caller decided this route is fine without auth.
  }
  next();
};

export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(new HttpError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
}
