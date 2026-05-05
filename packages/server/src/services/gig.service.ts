/**
 * Gig business logic.
 *
 * listGigs populates a minimal artist snapshot (slug + displayName) so
 * the public Gigs page can render artist links without a second round-trip.
 */
import { Types } from 'mongoose';
import { Artist, Gig } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import type { CreateGigInput, ListGigsQuery, UpdateGigInput } from '../schemas/gig.schemas.js';
import type { GigDocument, IGig } from '../models/Gig.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveArtist(slug: string, userId?: string) {
  const artist = await Artist.findOne({ slug: slug.toLowerCase() });
  if (!artist) throw new HttpError(404, 'Artist not found');
  if (userId && String(artist.userId) !== userId) {
    throw new HttpError(403, 'You do not own this artist profile');
  }
  return artist;
}

export interface GigWithArtist extends IGig {
  artist: { slug: string; displayName: string } | null;
}

export async function listGigs(
  query: ListGigsQuery,
): Promise<{ items: GigWithArtist[]; nextCursor: string | null }> {
  const filter: Record<string, unknown> = {
    isPublished: true,
    status: 'scheduled',
  };

  if (query.upcoming) {
    filter.startsAt = { $gte: new Date() };
  }

  if (query.city) {
    filter.city = new RegExp(`^${escapeRegex(query.city)}$`, 'i');
  }

  if (query.cursor) {
    const cursorDate = new Date(query.cursor);
    const existingStartsAt = filter.startsAt as Record<string, unknown> | undefined;
    filter.startsAt = { ...(existingStartsAt ?? {}), $gt: cursorDate };
  }

  // Genre filter — two-step: find matching artists, then filter gigs.
  if (query.genre) {
    const matchingArtists = await Artist.find({
      genreTags: query.genre,
      isApproved: true,
    }).select('_id');
    filter.artistId = { $in: matchingArtists.map((a) => a._id) };
  }

  const rawGigs = await Gig.find(filter)
    .sort({ startsAt: 1 })
    .limit(query.limit + 1)
    .lean();

  const hasMore = rawGigs.length > query.limit;
  const trimmed = hasMore ? rawGigs.slice(0, query.limit) : rawGigs;

  // Batch-fetch artist snapshots for the page.
  const artistIds = [...new Set(trimmed.map((g) => String(g.artistId)))];
  const artistDocs = await Artist.find({ _id: { $in: artistIds } })
    .select('slug displayName')
    .lean();
  const artistMap = new Map(artistDocs.map((a) => [String(a._id), a]));

  const items: GigWithArtist[] = trimmed.map((g) => ({
    ...(g as unknown as IGig),
    artist: artistMap.get(String(g.artistId)) ?? null,
  }));

  const nextCursor =
    hasMore && trimmed.length > 0
      ? new Date(trimmed[trimmed.length - 1]!.startsAt).toISOString()
      : null;

  return { items, nextCursor };
}

export async function listArtistGigs(
  slug: string,
  onlyUpcoming = true,
): Promise<IGig[]> {
  const artist = await Artist.findOne({ slug: slug.toLowerCase() });
  if (!artist) throw new HttpError(404, 'Artist not found');

  const filter: Record<string, unknown> = {
    artistId: artist._id,
    isPublished: true,
  };
  if (onlyUpcoming) {
    filter.startsAt = { $gte: new Date() };
    filter.status = 'scheduled';
  }

  return Gig.find(filter).sort({ startsAt: 1 }).lean();
}

export async function createGig(
  slug: string,
  userId: string,
  input: CreateGigInput,
): Promise<GigDocument> {
  const artist = await resolveArtist(slug, userId);
  return Gig.create({ ...input, artistId: artist._id });
}

export async function updateGig(
  slug: string,
  gigId: string,
  userId: string,
  patch: UpdateGigInput,
): Promise<GigDocument> {
  const artist = await resolveArtist(slug, userId);
  const gig = await Gig.findOne({
    _id: new Types.ObjectId(gigId),
    artistId: artist._id,
  });
  if (!gig) throw new HttpError(404, 'Gig not found');
  Object.assign(gig, patch);
  await gig.save();
  return gig;
}

export async function deleteGig(
  slug: string,
  gigId: string,
  userId: string,
): Promise<void> {
  const artist = await resolveArtist(slug, userId);
  const result = await Gig.deleteOne({
    _id: new Types.ObjectId(gigId),
    artistId: artist._id,
  });
  if (result.deletedCount === 0) throw new HttpError(404, 'Gig not found');
}
