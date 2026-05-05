/**
 * Artist model — the public-facing artist profile.
 *
 * Relationship: 1:1 with User (one User account → at most one Artist profile).
 * The User holds identity + auth; the Artist holds the press-kit content
 * shown on the public artist page (spec wireframe B.3).
 *
 * Per spec §5.1.2 (artist user stories) and §3.1 (artist priorities).
 *
 * Moderation: new Artists land with `isApproved=false` so admins review them
 * before they appear in public listings (spec §5.1.3 admin user stories).
 */
import type { Types } from 'mongoose';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export interface ISocialLinks {
  website?: string;
  instagram?: string;
  spotify?: string;
  bandcamp?: string;
  youtube?: string;
}

export interface IArtist {
  userId: Types.ObjectId;
  slug: string;
  displayName: string;
  bio: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  socialLinks: ISocialLinks;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  pressKitUrl: string | null;
  isApproved: boolean;
  isFeatured: boolean;
  followerCount: number; // denormalized; updated by Follow create/delete
  createdAt: Date;
  updatedAt: Date;
}

interface IArtistMethods {
  publicUrl(): string;
}

interface IArtistStatics {
  findBySlug(slug: string): Promise<HydratedDocument<IArtist, IArtistMethods> | null>;
  slugify(input: string): string;
}

type ArtistModel = Model<IArtist, Record<string, never>, IArtistMethods> & IArtistStatics;
export type ArtistDocument = HydratedDocument<IArtist, IArtistMethods>;

const socialLinksSchema = new Schema<ISocialLinks>(
  {
    website: { type: String, trim: true },
    instagram: { type: String, trim: true },
    spotify: { type: String, trim: true },
    bandcamp: { type: String, trim: true },
    youtube: { type: String, trim: true },
  },
  { _id: false },
);

const artistSchema = new Schema<IArtist, ArtistModel, IArtistMethods>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // 1:1 with User
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
      match: [SLUG_PATTERN, 'Slug must be lowercase letters, digits, and hyphens'],
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    homeCity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    homeState: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
      uppercase: true,
    },
    genreTags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 10,
        message: 'Up to 10 genre tags allowed',
      },
      index: true,
    },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },
    avatarUrl: { type: String, default: null, trim: true },
    coverImageUrl: { type: String, default: null, trim: true },
    pressKitUrl: { type: String, default: null, trim: true },
    isApproved: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    followerCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound index for the Discover featured-grid query: featured first, then newest.
artistSchema.index({ isFeatured: -1, createdAt: -1 });

artistSchema.methods.publicUrl = function publicUrl(this: ArtistDocument): string {
  return `/artists/${this.slug}`;
};

artistSchema.statics.findBySlug = function findBySlug(this: ArtistModel, slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Convert a free-form display name into a URL-safe slug.
 * Caller is responsible for ensuring uniqueness — Mongo's unique index will
 * reject duplicates at insert time.
 */
artistSchema.statics.slugify = function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
};

export const Artist = model<IArtist, ArtistModel>('Artist', artistSchema);
