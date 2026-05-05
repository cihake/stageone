/**
 * RefreshToken model — server-side record of every issued refresh token.
 *
 * Why a model and not a stateless JWT? Two reasons:
 *   1. Logout has to actually invalidate the session. With pure JWTs you'd
 *      have to wait for the token's natural expiry, or maintain a deny-list
 *      anyway — at which point you might as well track tokens directly.
 *   2. Refresh-token rotation with replay-attack detection: when the client
 *      presents a refresh token that has already been revoked, that's a
 *      strong signal it was stolen and replayed. We respond by revoking
 *      every still-active token in the user's chain.
 *
 * What we store: a sha256 hash of the actual token, never the token itself.
 * The token (a 32-byte hex string) lives only in the user's httpOnly cookie.
 * If the DB leaks, the attacker can't use the hashes to authenticate.
 *
 * Per spec §6.2 (auth depth) and release plan §3.1 (Auth & RBAC, WP3).
 */
import type { Types } from 'mongoose';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface IRefreshToken {
  userId: Types.ObjectId;
  tokenHash: string; // sha256 hex of the opaque refresh-token string
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: Types.ObjectId | null; // points at the token that replaced this one (rotation chain)
  createdByIp: string | null;
  createdAt: Date;
}

type RefreshTokenModel = Model<IRefreshToken>;
export type RefreshTokenDocument = HydratedDocument<IRefreshToken>;

const refreshTokenSchema = new Schema<IRefreshToken, RefreshTokenModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true, // unique hash → unique lookup
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL: Mongo automatically deletes documents after expiresAt is reached.
      // 0 = exactly at expiresAt, no grace.
      index: { expireAfterSeconds: 0 },
    },
    revokedAt: { type: Date, default: null },
    replacedById: {
      type: Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null,
    },
    createdByIp: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const RefreshToken = model<IRefreshToken, RefreshTokenModel>(
  'RefreshToken',
  refreshTokenSchema,
);
