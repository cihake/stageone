/**
 * Zod request validators for /api/artists.
 *
 * Slug rules mirror the Mongoose `match` regex on the Artist schema. We
 * accept either an explicit slug from the client or auto-generate it from
 * displayName via Artist.slugify in the service layer.
 */
import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const URL_PATTERN = /^https?:\/\//;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug must be at least 2 characters')
  .max(60, 'Slug must be at most 60 characters')
  .regex(SLUG_PATTERN, 'Slug must be lowercase letters, digits, and hyphens');

const optionalUrl = z
  .string()
  .trim()
  .regex(URL_PATTERN, 'Must be a full URL starting with http:// or https://')
  .max(500)
  .optional()
  .or(z.literal(''));

const socialLinksSchema = z
  .object({
    website: optionalUrl,
    instagram: optionalUrl,
    spotify: optionalUrl,
    bandcamp: optionalUrl,
    youtube: optionalUrl,
  })
  .partial();

const genreTagsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(10, 'Up to 10 genre tags allowed');

export const createArtistSchema = z.object({
  slug: slugSchema.optional(), // service will derive from displayName if absent
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(2000).default(''),
  homeCity: z.string().trim().min(1).max(80),
  homeState: z.string().trim().toUpperCase().length(2, 'State must be a 2-letter postal code'),
  genreTags: genreTagsSchema.default([]),
  socialLinks: socialLinksSchema.default({}),
});
export type CreateArtistInput = z.infer<typeof createArtistSchema>;

/** All fields optional — caller sends only what changed. */
export const updateArtistSchema = z.object({
  slug: slugSchema.optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(2000).optional(),
  homeCity: z.string().trim().min(1).max(80).optional(),
  homeState: z.string().trim().toUpperCase().length(2).optional(),
  genreTags: genreTagsSchema.optional(),
  socialLinks: socialLinksSchema.optional(),
});
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;

export const listArtistsQuerySchema = z.object({
  city: z.string().trim().min(1).max(80).optional(),
  genre: z.string().trim().toLowerCase().min(1).max(30).optional(),
  featured: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().optional(),
});
export type ListArtistsQuery = z.infer<typeof listArtistsQuerySchema>;
