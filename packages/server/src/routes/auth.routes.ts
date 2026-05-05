/**
 * /api/auth/* — registration, login, refresh, logout, me.
 *
 * Handler responsibility = thin: validate input, call service, set/clear
 * cookies, format response. All business rules live in services/auth.service.
 *
 * Per spec §5.1.1 (fan signup), §5.1.2 (artist signup), §6.2 (auth security),
 * release plan §3.1 (WP3 Auth & RBAC).
 */
import { Router, type Request, type RequestHandler } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
	setAccessCookie,
	setRefreshCookie,
	clearAuthCookies,
	REFRESH_COOKIE,
} from '../lib/cookies.js';
import { loginSchema, registerSchema } from '../schemas/auth.schemas.js';
import {
	loginUser,
	logoutSession,
	refreshSession,
	registerUser,
	type AuthResult,
} from '../services/auth.service.js';
import { User } from '../models/index.js';

export const authRouter = Router();

authRouter.use(authLimiter);

function readRefreshCookie(req: Request): string | null {
	const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
	return cookies?.[REFRESH_COOKIE] ?? null;
}

function applyAuthCookies(res: Parameters<RequestHandler>[1], result: AuthResult): void {
	setAccessCookie(res, result.accessToken);
	setRefreshCookie(res, result.refreshToken);
}

// POST /api/auth/register — create a new fan or artist account, log them in.
authRouter.post('/register', async (req, res, next) => {
	try {
		const input = registerSchema.parse(req.body);
		const result = await registerUser({
			...input,
			createdByIp: req.ip ?? null,
		});
		applyAuthCookies(res, result);
		res.status(201).json({ user: result.user });
	} catch (err) {
		next(err);
	}
});

// POST /api/auth/login — exchange credentials for a session.
authRouter.post('/login', async (req, res, next) => {
	try {
		const input = loginSchema.parse(req.body);
		const result = await loginUser({
			...input,
			createdByIp: req.ip ?? null,
		});
		applyAuthCookies(res, result);
		res.json({ user: result.user });
	} catch (err) {
		next(err);
	}
});

// POST /api/auth/refresh — rotate the refresh token; issue a new access token.
authRouter.post('/refresh', async (req, res, next) => {
	try {
		const presentedToken = readRefreshCookie(req);
		if (!presentedToken) throw new HttpError(401, 'Missing refresh token');

		const result = await refreshSession({
			presentedToken,
			createdByIp: req.ip ?? null,
		});
		applyAuthCookies(res, result);
		res.json({ user: result.user });
	} catch (err) {
		next(err);
	}
});

// POST /api/auth/logout — revoke the current refresh token; clear cookies.
authRouter.post('/logout', async (req, res, next) => {
	try {
		await logoutSession(readRefreshCookie(req));
		clearAuthCookies(res);
		res.status(204).end();
	} catch (err) {
		next(err);
	}
});

// GET /api/auth/me — return the authenticated user.
authRouter.get('/me', requireAuth, async (req, res, next) => {
	try {
		if (!req.user) throw new HttpError(401, 'Authentication required');
		const user = await User.findById(req.user.id);
		if (!user) throw new HttpError(404, 'User not found');
		res.json({
			user: {
				id: String(user._id),
				email: user.email,
				displayName: user.displayName,
				role: user.role,
				bio: user.bio,
				avatarUrl: user.avatarUrl,
				emailVerified: user.emailVerified,
				lastLoginAt: user.lastLoginAt,
			},
		});
	} catch (err) {
		next(err);
	}
});
