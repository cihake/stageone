/**
 * Auth-cookie helpers.
 *
 * SameSite:
 *   dev  — 'lax'.  Client and API are same-origin via the Vite proxy
 *          (both localhost:5173), so lax works and gives us extra CSRF
 *          protection.
 *   prod — 'none'. Client (vercel.app) and API (onrender.com) are on
 *          different registrable domains, i.e. cross-site by browser rules.
 *          Any cookie the browser needs to send with cross-site fetch
 *          requests (login, /me, /refresh, /logout) MUST be SameSite=None.
 *          Requires Secure=true, which we already have in prod.
 *
 * Secure: on in prod (HTTPS everywhere), off in dev so browsers attach the
 * cookie over plain http://localhost.
 */
import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env.js';
import { parseDurationMs } from './tokens.js';

export const ACCESS_COOKIE = 'so_at';
export const REFRESH_COOKIE = 'so_rt';

function baseCookie(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  };
}

export function setAccessCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseCookie(),
    maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseCookie(),
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
    // Scope refresh-cookie to /api/auth so it's not sent on every request.
    path: '/api/auth',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie() });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: '/api/auth' });
}
