/**
 * Track model — a single playable audio release belonging to an Artist.
 *
 * Per spec §5.1.2 ("upload a track with cover art, genre, and an optional
 * lyric sheet") and wireframe B.3 (track list on artist page) / B.4 (upload
 * form on artist dashboard).
 *
 * Storage: `audioUrl` and `coverArtUrl` will point at Cloudinary CDN URLs
 * once the media pipeline lands in Phase 2 (release plan WP8).
 */
import type { Types } from 'mongoose';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface ITrack {
  artistId: Types.ObjectId;
  title: string;
  album: string | null;
  durationSeconds: number;
  genreTags: string[];
  audioUrl: string; // Cloudinary URL (or external for v0.3)
  coverArtUrl: string | null;
  description: string;
  lyrics: string | null;
  isPublished: boolean;
  playCount: number;
  releasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ITrackMethods {
  registerPlay(): Promise<TrackDocument>;
}

type TrackModel = Model<ITrack, Record<string, never>, ITrackMethods>;
export type TrackDocument = HydratedDocument<ITrack, ITrackMethods>;

const trackSchema = new Schema<ITrack, TrackModel, ITrackMethods>(
  {
    artistId: {
      type: Schema.Types.ObjectId,
      ref: 'Artist',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    album: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
      max: 60 * 60, // 1 hour cap — keeps free-tier storage sane
    },
    genreTags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 8,
        message: 'Up to 8 genre tags allowed',
      },
      index: true,
    },
    audioUrl: {
      type: String,
      required: true,
      trim: true,
    },
    coverArtUrl: { type: String, default: null, trim: true },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    lyrics: {
      type: String,
      default: null,
      trim: true,
      maxlength: 10_000,
    },
    isPublished: { type: Boolean, default: false, index: true },
    playCount: { type: Number, default: 0, min: 0 },
    releasedAt: { type: Date, default: () => new Date() },
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

// "All published tracks for this artist, newest first" — drives the artist
// page track list and the home-page "new this week" strip.
trackSchema.index({ artistId: 1, isPublished: 1, releasedAt: -1 });

// "All recently published tracks across the whole catalog" — drives Discover
// when no filter is applied.
trackSchema.index({ isPublished: 1, releasedAt: -1 });

trackSchema.methods.registerPlay = async function registerPlay(
  this: TrackDocument,
): Promise<TrackDocument> {
  this.playCount += 1;
  return this.save();
};

export const Track = model<ITrack, TrackModel>('Track', trackSchema);
