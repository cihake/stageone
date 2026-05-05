/**
 * Auth business logic — separated from the Express handlers so the rules
 * are testable in isolation and reusable from non-HTTP contexts (e.g., a
 * future CLI for resetting a user's password).
 *
 * Core operations:
 *   register   — create User; reject duplicate emails.
 *   login      — verify credentials; issue access + refresh; touch lastLoginAt.
 *   refresh    — rotate refresh token; revoke old; issue new pair.
 *   logout     — revoke current refresh token.
 *
 * Refresh-token rotation w/ replay defense: every /refresh issues a brand-new
 * refresh token and revokes the old one. If a *previously-revoked* token is
 * presented, that's a strong signal it was stolen and replayed; we react by
 * revoking every active token in that user's chain.
 */
import type { Types } from 'mongoose';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import { RefreshToken, User, type UserDocument, type UserRole } from '../models/index.js';
import {
  generateRefreshToken,
  hashToken,
  parseDurationMs,
  signAccessJwt,
} from '../lib/tokens.js';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

interface IssueOpts {
  user: UserDocument;
  createdByIp: string | null;
  replacedFromId?: Types.ObjectId | null;
}

async function issueTokenPair({
  user,
  createdByIp,
  replacedFromId = null,
}: IssueOpts): Promise<{
  accessToken: string;
  refreshToken: string;
  refreshId: Types.ObjectId;
}> {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

  const record = await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    createdByIp,
  });

  if (replacedFromId) {
    await RefreshToken.updateOne(
      { _id: replacedFromId },
      { $set: { replacedById: record._id } },
    );
  }

  const accessToken = signAccessJwt({
    sub: String(user._id),
    role: user.role,
    email: user.email,
  });
  return { accessToken, refreshToken, refreshId: record._id };
}

function publicUser(user: UserDocument) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole; // already narrowed to fan|artist by Zod
  createdByIp: string | null;
}): Promise<AuthResult> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new HttpError(409, 'An account with that email already exists');
  }

  const user = new User({
    email: input.email,
    displayName: input.displayName,
    role: input.role,
  });
  user.set('password', input.password); // virtual setter → bcrypt in pre-save
  await user.save();

  const { accessToken, refreshToken } = await issueTokenPair({
    user,
    createdByIp: input.createdByIp,
  });
  return { user: publicUser(user), accessToken, refreshToken };
}

export async function loginUser(input: {
  email: string;
  password: string;
  createdByIp: string | null;
}): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) throw new HttpError(401, 'Invalid email or password');
  if (user.isSuspended) throw new HttpError(403, 'Account suspended');

  const valid = await user.comparePassword(input.password);
  if (!valid) throw new HttpError(401, 'Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokenPair({
    user,
    createdByIp: input.createdByIp,
  });
  return { user: publicUser(user), accessToken, refreshToken };
}

export async function refreshSession(input: {
  presentedToken: string;
  createdByIp: string | null;
}): Promise<AuthResult> {
  const tokenHash = hashToken(input.presentedToken);
  const record = await RefreshToken.findOne({ tokenHash });
  if (!record) throw new HttpError(401, 'Invalid refresh token');

  // Replay-attack defense: a revoked token being re-presented means it was
  // stolen and replayed. Burn every still-active token for that user.
  if (record.revokedAt) {
    await RefreshToken.updateMany(
      { userId: record.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    throw new HttpError(401, 'Refresh token already used; sessions revoked');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, 'Refresh token expired');
  }

  const user = await User.findById(record.userId);
  if (!user) throw new HttpError(401, 'User not found');
  if (user.isSuspended) throw new HttpError(403, 'Account suspended');

  // Mark the old token revoked and chain it to the new one.
  record.revokedAt = new Date();
  await record.save();

  const { accessToken, refreshToken } = await issueTokenPair({
    user,
    createdByIp: input.createdByIp,
    replacedFromId: record._id,
  });
  return { user: publicUser(user), accessToken, refreshToken };
}

export async function logoutSession(presentedToken: string | null): Promise<void> {
  if (!presentedToken) return; // idempotent; nothing to do
  const tokenHash = hashToken(presentedToken);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}
