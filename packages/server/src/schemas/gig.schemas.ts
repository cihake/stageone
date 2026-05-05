/**
 * Zod validators for Gig routes.
 *
 * Routes:
 *   GET    /api/gigs                           public  list upcoming gigs
 *   GET    /api/artists/:slug/gigs             public  list artist gigs
 *   POST   /api/artists/:slug/gigs             artist  create gig
 *   PATCH  /api/artists/:slug/gigs/:id         artist  update gig
 *   DELETE /api/artists/:slug/gigs/:id         artist  delete gig
 */
import { z } from 'zod';

export const createGigSchema = z.object({
  title: z.string().trim().min(1).max(140),
  venueName: z.string().trim().min(1).max(120),
  venueAddress: z.string().trim().max(200).default(''),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().toUpperCase().length(2, 'State must be 2-letter postal code'),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
  ticketUrl: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .max(500)
    .optional()
    .nullable(),
  ticketPriceCents: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().trim().max(1000).default(''),
  status: z.enum(['scheduled', 'cancelled', 'postponed']).default('scheduled'),
  isPublished: z.boolean().default(true),
});
export type CreateGigInput = z.infer<typeof createGigSchema>;

export const updateGigSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  venueName: z.string().trim().min(1).max(120).optional(),
  venueAddress: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  state: z.string().trim().toUpperCase().length(2).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional().nullable(),
  ticketUrl: z.string().trim().url().max(500).optional().nullable(),
  ticketPriceCents: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(['scheduled', 'cancelled', 'postponed']).optional(),
  isPublished: z.boolean().optional(),
});
export type UpdateGigInput = z.infer<typeof updateGigSchema>;

export const listGigsQuerySchema = z.object({
  city: z.string().trim().min(1).max(80).optional(),
  genre: z.string().trim().toLowerCase().min(1).max(30).optional(),
  upcoming: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .default('true'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().optional(),
});
export type ListGigsQuery = z.infer<typeof listGigsQuerySchema>;
