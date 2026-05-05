/**
 * Zod validators for Track routes.
 *
 * Routes:
 *   GET    /api/artists/:slug/tracks          public  list published tracks
 *   POST   /api/artists/:slug/tracks          artist  create track
 *   PATCH  /api/artists/:slug/tracks/:id      artist  update own track
 *   DELETE /api/artists/:slug/tracks/:id      artist  delete own track
 */
import { z } from 'zod';

const genreTagsSchema = z
	.array(z.string().trim().toLowerCase().min(1).max(30))
	.max(8, 'Up to 8 genre tags allowed');

export const createTrackSchema = z.object({
	title: z.string().trim().min(1).max(120),
	album: z.string().trim().max(120).optional().nullable(),
	durationSeconds: z.coerce.number().int().min(1).max(3600),
	genreTags: genreTagsSchema.default([]),
	audioUrl: z.string().trim().url('audioUrl must be a valid URL'),
	coverArtUrl: z.string().trim().url().optional().nullable(),
	description: z.string().trim().max(1000).default(''),
	lyrics: z.string().trim().max(10_000).optional().nullable(),
	isPublished: z.boolean().default(false),
	releasedAt: z.coerce.date().optional(),
});
export type CreateTrackInput = z.infer<typeof createTrackSchema>;

export const updateTrackSchema = z.object({
	title: z.string().trim().min(1).max(120).optional(),
	album: z.string().trim().max(120).optional().nullable(),
	durationSeconds: z.coerce.number().int().min(1).max(3600).optional(),
	genreTags: genreTagsSchema.optional(),
	audioUrl: z.string().trim().url().optional(),
	coverArtUrl: z.string().trim().url().optional().nullable(),
	description: z.string().trim().max(1000).optional(),
	lyrics: z.string().trim().max(10_000).optional().nullable(),
	isPublished: z.boolean().optional(),
	releasedAt: z.coerce.date().optional(),
});
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;

export const listTracksQuerySchema = z.object({
	published: z
		.union([z.literal('true'), z.literal('false')])
		.transform((v) => v === 'true')
		.optional(),
	limit: z.coerce.number().int().min(1).max(50).default(20),
	cursor: z.string().trim().optional(),
});
export type ListTracksQuery = z.infer<typeof listTracksQuerySchema>;
