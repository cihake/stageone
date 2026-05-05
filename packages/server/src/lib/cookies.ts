/**
 * Auth-cookie helpers. Per spec §6.4: httpOnly + SameSite=Lax. Secure flag
 * is on in staging/production (HTTPS) and off in dev (so browsers attach
 * the cookie over plain http://localhost).
 */
import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env.js';
import { parseDurationMs } from './tokens.js';

export const ACCESS_COOKIE = 'so_at';
export const REFRESH_COOKIE = 'so_rt';

function baseCookie(): CookieOptions {
	return {
		httpOnly: true,
		sameSite: 'lax',
		secure: isProd, // HTTPS-only in prod; plain http in dev so localhost works
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
