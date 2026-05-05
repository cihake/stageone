/**
 * Zod request validators for /api/auth.
 *
 * Password rules (spec §6.2): minimum 10 characters, at least one digit and
 * one letter, no whitespace. We additionally require ≥ 1 uppercase + ≥ 1
 * lowercase to push users toward stronger passwords without going full
 * 4-of-4 character class. zxcvbn-grade scoring lives in v0.3 if needed.
 *
 * Note: registration accepts only `fan` or `artist` from the client. The
 * `admin` role is set manually in DB / via the seed script — never via the
 * public API.
 */
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a digit')
  .refine((v) => !/\s/.test(v), 'Password must not contain whitespace');

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: passwordSchema,
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(60, 'Display name must be at most 60 characters'),
  role: z.enum(['fan', 'artist'], {
    errorMap: () => ({ message: 'Role must be fan or artist' }),
  }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;
