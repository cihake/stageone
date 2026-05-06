/**
 * Follow business logic.
 *
 * Follow: one (userId, artistId) pair. Denormalized counter on Artist.
 * Fan feed: most-recent tracks + upcoming gigs from all followed artists.
 */
import { Types } from 'mongoose';
import { Artist, Follow, Gig, Track } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import type { IFollow } from '../models/Follow.js';
import type { ITrack } from '../models/Track.js';
import type { IGig } from '../models/Gig.js';

// Follow / unfollow

export async function followArtist(
  userId: string,
  artistId: string,
): Promise<IFollow> {
  const artist = await Artist.findById(artistId);
  if (!artist) throw new HttpError(404, 'Artist not found');
  if (!artist.isApproved) throw new HttpError(403, 'Artist is not yet approved');

  try {
    const follow = await Follow.create({
      userId: new Types.ObjectId(userId),
      artistId: new Types.ObjectId(artistId),
    });
    await Artist.findByIdAndUpdate(artistId, { $inc: { followerCount: 1 } });
    return follow.toJSON() as unknown as IFollow;
  } catch (err: unknown) {
    // Duplicate key = already following
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      throw new HttpError(409, 'You are already following this artist');
    }
    throw err;
  }
}

export async function unfollowArtist(
  userId: string,
  artistId: string,
): Promise<void> {
  const result = await Follow.deleteOne({
    userId: new Types.ObjectId(userId),
    artistId: new Types.ObjectId(artistId),
  });
  if (result.deletedCount === 0) {
    throw new HttpError(404, 'You are not following this artist');
  }
  // Use an aggregation-pipeline update to decrement with a floor of 0.
  // A plain { $inc: ..., $max: ... } on the same field is a MongoDB path
  // conflict that throws a server error.
  await Artist.findByIdAndUpdate(artistId, [
    {
      $set: {
        followerCount: { $max: [0, { $subtract: ['$followerCount', 1] }] },
      },
    },
  ]);
}

export async function getFollowedArtistIds(userId: string): Promise<string[]> {
  const follows = await Follow.find({ userId: new Types.ObjectId(userId) })
    .select('artistId')
    .lean();
  return follows.map((f) => String(f.artistId));
}

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
}

export async function getFollowStatus(
  userId: string,
  artistId: string,
): Promise<FollowStatus> {
  const [follow, artist] = await Promise.all([
    Follow.exists({
      userId: new Types.ObjectId(userId),
      artistId: new Types.ObjectId(artistId),
    }),
    Artist.findById(artistId).select('followerCount').lean(),
  ]);
  return {
    isFollowing: Boolean(follow),
    followerCount: artist?.followerCount ?? 0,
  };
}

// Fan feed

/** Artist snapshot attached to each feed item to avoid N+1 on the client. */
export interface ArtistSnapshot {
  slug: string;
  displayName: string;
}

export type FeedTrack = ITrack & { artist: ArtistSnapshot | null };
export type FeedGig = IGig & { artist: ArtistSnapshot | null };

export async function getFanFeed(
  userId: string,
  limit = 30,
): Promise<{ tracks: FeedTrack[]; gigs: FeedGig[] }> {
  const artistIds = await getFollowedArtistIds(userId);
  if (artistIds.length === 0) return { tracks: [], gigs: [] };

  const ids = artistIds.map((id) => new Types.ObjectId(id));

  const [tracks, gigs, artists] = await Promise.all([
    Track.find({ artistId: { $in: ids }, isPublished: true })
      .sort({ releasedAt: -1 })
      .limit(limit)
      .lean(),
    Gig.find({
      artistId: { $in: ids },
      isPublished: true,
      status: 'scheduled',
      startsAt: { $gte: new Date() },
    })
      .sort({ startsAt: 1 })
      .limit(limit)
      .lean(),
    Artist.find({ _id: { $in: ids }, isApproved: true })
      .select('slug displayName')
      .lean(),
  ]);

  // Build a lookup map: artistId string -> snapshot
  const artistMap = new Map<string, ArtistSnapshot>();
  for (const a of artists) {
    artistMap.set(String(a._id), { slug: a.slug, displayName: a.displayName });
  }

  const enrichedTracks: FeedTrack[] = tracks.map((t) => ({
    ...t,
    artist: artistMap.get(String(t.artistId)) ?? null,
  }));

  const enrichedGigs: FeedGig[] = gigs.map((g) => ({
    ...g,
    artist: artistMap.get(String(g.artistId)) ?? null,
  }));

  return { tracks: enrichedTracks, gigs: enrichedGigs };
}
