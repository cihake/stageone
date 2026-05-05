/**
 * Track business logic.
 *
 * Ownership model: a Track belongs to an Artist. Only the artist who owns
 * the profile (matched via req.user.id → Artist.userId) may create/edit/delete
 * their tracks. Public reads are restricted to isPublished=true.
 */
import { Types } from 'mongoose';
import { Artist, Track } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import type { CreateTrackInput, ListTracksQuery, UpdateTrackInput } from '../schemas/track.schemas.js';
import type { TrackDocument, ITrack } from '../models/Track.js';

/** Resolve slug → artistId, optionally checking ownership. */
async function resolveArtist(slug: string, userId?: string) {
	const artist = await Artist.findOne({ slug: slug.toLowerCase() });
	if (!artist) throw new HttpError(404, 'Artist not found');
	if (userId && String(artist.userId) !== userId) {
		throw new HttpError(403, 'You do not own this artist profile');
	}
	return artist;
}

export async function listTracks(
	slug: string,
	query: ListTracksQuery,
	isOwner: boolean,
): Promise<{ items: ITrack[]; nextCursor: string | null }> {
	const artist = await Artist.findOne({ slug: slug.toLowerCase() });
	if (!artist) throw new HttpError(404, 'Artist not found');

	const filter: Record<string, unknown> = { artistId: artist._id };
	// Non-owners can only see published tracks.
	if (!isOwner) filter.isPublished = true;
	else if (query.published !== undefined) filter.isPublished = query.published;

	if (query.cursor) {
		filter.releasedAt = { $lt: new Date(query.cursor) };
	}

	const items = await Track.find(filter)
		.sort({ releasedAt: -1 })
		.limit(query.limit + 1)
		.lean();

	const hasMore = items.length > query.limit;
	const trimmed = hasMore ? items.slice(0, query.limit) : items;
	const nextCursor =
		hasMore && trimmed.length > 0
			? new Date(trimmed[trimmed.length - 1]!.releasedAt).toISOString()
			: null;

	return { items: trimmed, nextCursor };
}

export async function createTrack(
	slug: string,
	userId: string,
	input: CreateTrackInput,
): Promise<TrackDocument> {
	const artist = await resolveArtist(slug, userId);
	const track = await Track.create({
		...input,
		artistId: artist._id,
	});
	return track;
}

export async function updateTrack(
	slug: string,
	trackId: string,
	userId: string,
	patch: UpdateTrackInput,
): Promise<TrackDocument> {
	const artist = await resolveArtist(slug, userId);
	const track = await Track.findOne({ _id: new Types.ObjectId(trackId), artistId: artist._id });
	if (!track) throw new HttpError(404, 'Track not found');

	Object.assign(track, patch);
	await track.save();
	return track;
}

export async function deleteTrack(
	slug: string,
	trackId: string,
	userId: string,
): Promise<void> {
	const artist = await resolveArtist(slug, userId);
	const result = await Track.deleteOne({ _id: new Types.ObjectId(trackId), artistId: artist._id });
	if (result.deletedCount === 0) throw new HttpError(404, 'Track not found');
}
