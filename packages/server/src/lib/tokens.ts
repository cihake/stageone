/**
 * Token primitives for StageOne auth.
 *
 *   - Access token: short-lived JWT (15m). Stateless, verified per request.
 *     Carries `sub`, `role`, and `email` claims so middleware never has to
 *     hit the database to know who's calling.
 *
 *   - Refresh token: opaque random string (32 bytes hex). Stored in the DB
 *     as sha256(token) so a DB leak doesn't surrender live sessions.
 *     Rotated on every /refresh per release-plan §3.1 security depth.
 */
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../models/User.js';

export interface AccessTokenClaims {
	sub: string; // User _id
	role: UserRole;
	email: string;
}

export function signAccessJwt(claims: AccessTokenClaims): string {
	const opts: SignOptions = {
		expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
	};
	return jwt.sign(claims, env.JWT_SECRET, opts);
}

export function verifyAccessJwt(token: string): AccessTokenClaims {
	const decoded = jwt.verify(token, env.JWT_SECRET);
	if (typeof decoded !== 'object' || decoded === null) {
		throw new Error('Malformed access token payload');
	}
	const { sub, role, email } = decoded as Record<string, unknown>;
	if (typeof sub !== 'string' || typeof role !== 'string' || typeof email !== 'string') {
		throw new Error('Access token missing required claims');
	}
	return { sub, role: role as UserRole, email };
}

/**
 * Generate an opaque, cryptographically-random refresh token.
 * 32 bytes = 64 hex chars = 256 bits of entropy.
 */
export function generateRefreshToken(): string {
	return crypto.randomBytes(32).toString('hex');
}

/** sha256 hex digest of an opaque token. Used as the stored DB key. */
export function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse a duration string like "7d" or "15m" into milliseconds.
 * Used to compute refresh-token DB expiresAt mirroring the cookie's max-age.
 */
export function parseDurationMs(duration: string): number {
	const match = /^(\d+)\s*([smhd])$/.exec(duration.trim());
	if (!match) throw new Error(`Invalid duration: ${duration}`);
	const value = Number.parseInt(match[1] ?? '0', 10);
	const unit = match[2];
	const multipliers: Record<string, number> = {
		s: 1_000,
		m: 60_000,
		h: 3_600_000,
		d: 86_400_000,
	};
	const factor = unit ? multipliers[unit] : undefined;
	if (factor === undefined) throw new Error(`Invalid duration unit: ${duration}`);
	return value * factor;
}
