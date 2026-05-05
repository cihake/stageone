/**
 * Artist business logic — separated from HTTP handlers so the rules are
 * testable in isolation.
 *
 * Conventions:
 *   - Public list/detail queries always filter for isApproved=true.
 *   - Artist-self queries (getMyArtist, updateMyArtist) bypass the
 *     approval filter so unapproved artists can still see/edit their work.
 *   - Slug derivation: if create() doesn't get a slug, we slugify the
 *     displayName, then suffix -2, -3, … until unique.
 */
import { Types } from 'mongoose';
import { Artist, type ArtistDocument, type IArtist } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { destroyAsset, uploadBuffer, type UploadOptions } from '../lib/cloudinary.js';
import type {
  CreateArtistInput,
  ListArtistsQuery,
  UpdateArtistInput,
} from '../schemas/artist.schemas.js';
import { env } from '../config/env.js';

const FOLDER_PREFIX = `stageone-${env.NODE_ENV}/artists`;

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  // Loop bounded by `maxlength: 60` on slug, so this terminates fast.
  while (await Artist.exists({ slug: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`.slice(0, 60);
  }
  return candidate;
}

export async function createArtist(
  userId: string,
  input: CreateArtistInput,
): Promise<ArtistDocument> {
  const existing = await Artist.findOne({ userId });
  if (existing) {
    throw new HttpError(409, 'You already have an artist profile');
  }

  const baseSlug = input.slug ?? Artist.slugify(input.displayName);
  if (!baseSlug) {
    throw new HttpError(400, 'Could not derive a slug from the display name');
  }
  const slug = await ensureUniqueSlug(baseSlug);

  const artist = await Artist.create({
    ...input,
    slug,
    userId: new Types.ObjectId(userId),
    isApproved: false, // admin moderation gate per spec §5.1.3
  });
  return artist;
}

export async function getMyArtist(userId: string): Promise<ArtistDocument | null> {
  return Artist.findOne({ userId });
}

export async function getArtistBySlug(slug: string): Promise<ArtistDocument | null> {
  return Artist.findOne({ slug: slug.toLowerCase(), isApproved: true });
}

export async function updateMyArtist(
  userId: string,
  patch: UpdateArtistInput,
): Promise<ArtistDocument> {
  const artist = await Artist.findOne({ userId });
  if (!artist) throw new HttpError(404, 'Artist profile not found');

  // If slug is being changed, ensure no collision with another artist.
  if (patch.slug && patch.slug !== artist.slug) {
    const collision = await Artist.findOne({ slug: patch.slug, _id: { $ne: artist._id } });
    if (collision) throw new HttpError(409, 'That slug is already taken');
  }

  Object.assign(artist, patch);
  await artist.save();
  return artist;
}

export async function listArtists(query: ListArtistsQuery): Promise<{
  items: IArtist[];
  nextCursor: string | null;
}> {
  const filter: Record<string, unknown> = { isApproved: true };
  if (query.city) filter.homeCity = new RegExp(`^${escapeRegex(query.city)}$`, 'i');
  if (query.genre) filter.genreTags = query.genre;
  if (query.featured !== undefined) filter.isFeatured = query.featured;

  if (query.cursor) {
    // Cursor is the createdAt ISO string of the last item from the previous page.
    filter.createdAt = { $lt: new Date(query.cursor) };
  }

  const items = await Artist.find(filter)
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(query.limit + 1) // fetch one extra to know if there's a next page
    .lean();

  const hasMore = items.length > query.limit;
  const trimmed = hasMore ? items.slice(0, query.limit) : items;
  const nextCursor =
    hasMore && trimmed.length > 0
      ? new Date(trimmed[trimmed.length - 1]!.createdAt).toISOString()
      : null;
  return { items: trimmed, nextCursor };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Image uploads ────────────────────────────────────────────────────

type ImageKind = 'avatar' | 'cover';

interface UploadImageInput {
  userId: string;
  buffer: Buffer;
  kind: ImageKind;
}

const TRANSFORMATIONS: Record<ImageKind, UploadOptions['transformation']> = {
  avatar: [
    { width: 512, height: 512, crop: 'fill', gravity: 'face' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
  cover: [
    { width: 1600, height: 600, crop: 'fill', gravity: 'auto' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
};

const FIELD_BY_KIND: Record<ImageKind, 'avatarUrl' | 'coverImageUrl'> = {
  avatar: 'avatarUrl',
  cover: 'coverImageUrl',
};

export async function uploadArtistImage({
  userId,
  buffer,
  kind,
}: UploadImageInput): Promise<ArtistDocument> {
  const artist = await Artist.findOne({ userId });
  if (!artist) {
    throw new HttpError(404, 'Create your artist profile before uploading images.');
  }

  // Cloudinary public_id includes the artist id so re-uploads replace cleanly.
  const result = await uploadBuffer(buffer, {
    folder: `${FOLDER_PREFIX}/${kind}`,
    publicId: String(artist._id),
    transformation: TRANSFORMATIONS[kind],
  });

  const field = FIELD_BY_KIND[kind];
  const previousUrl = artist[field];
  artist[field] = result.secure_url;
  await artist.save();

  // Best-effort cleanup of the old asset if its public_id differs.
  // Same public_id means Cloudinary already overwrote it.
  if (
    previousUrl &&
    typeof previousUrl === 'string' &&
    !previousUrl.includes(String(artist._id))
  ) {
    try {
      const oldPublicId = extractPublicId(previousUrl);
      if (oldPublicId) await destroyAsset(oldPublicId);
    } catch {
      // Cleanup is best-effort; don't block the user's response on it.
    }
  }

  return artist;
}

/** Extract the Cloudinary public_id from a delivery URL (rough — used for cleanup). */
function extractPublicId(url: string): string | null {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url);
  return match ? (match[1] ?? null) : null;
}
