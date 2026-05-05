/**
 * Follow model — a fan's subscription to an artist.
 *
 * Junction-style: one row per (User, Artist) pair. The compound unique
 * index prevents duplicate follows. Per spec §5.1.1 ("I want to follow an
 * artist so that I get notified the next time they release a track or
 * announce a gig").
 *
 * Counter consistency: when a Follow is created/deleted, bump
 * Artist.followerCount (denormalized for cheap reads on artist cards).
 * That's done in the Follow service in v0.3, not here.
 */
import type { Types } from 'mongoose';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface IFollow {
  userId: Types.ObjectId;
  artistId: Types.ObjectId;
  notifyOnNewTrack: boolean;
  notifyOnNewGig: boolean;
  createdAt: Date;
}

type FollowModel = Model<IFollow>;
export type FollowDocument = HydratedDocument<IFollow>;

const followSchema = new Schema<IFollow, FollowModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    artistId: {
      type: Schema.Types.ObjectId,
      ref: 'Artist',
      required: true,
      index: true,
    },
    notifyOnNewTrack: { type: Boolean, default: true },
    notifyOnNewGig: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Prevent duplicate follows; also speeds the "is fan X following artist Y?" check.
followSchema.index({ userId: 1, artistId: 1 }, { unique: true });

export const Follow = model<IFollow, FollowModel>('Follow', followSchema);
