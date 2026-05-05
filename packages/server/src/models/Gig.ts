/**
 * Gig model — an upcoming (or past) live performance by an Artist.
 *
 * Per spec §5.1.2 ("publish a gig with date, time, venue, city, and optional
 * ticket URL"), §4.1 ("Past gigs are archived but not deleted") and wireframe
 * B.3 (gig list on artist page).
 *
 * Money: `ticketPriceCents` stored as integer cents to avoid float issues.
 * `null` means "free" or "price not specified" — disambiguate at the UI.
 */
import type { Types } from 'mongoose';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export const GIG_STATUSES = ['scheduled', 'cancelled', 'postponed'] as const;
export type GigStatus = (typeof GIG_STATUSES)[number];

export interface IGig {
  artistId: Types.ObjectId;
  title: string;
  venueName: string;
  venueAddress: string;
  city: string;
  state: string;
  startsAt: Date;
  endsAt: Date | null;
  ticketUrl: string | null;
  ticketPriceCents: number | null;
  description: string;
  status: GigStatus;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IGigMethods {
  isPast(): boolean;
}

type GigModel = Model<IGig, Record<string, never>, IGigMethods>;
export type GigDocument = HydratedDocument<IGig, IGigMethods>;

const gigSchema = new Schema<IGig, GigModel, IGigMethods>(
  {
    artistId: {
      type: Schema.Types.ObjectId,
      ref: 'Artist',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 140,
    },
    venueName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    venueAddress: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
      uppercase: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      default: null,
      validate: {
        validator(this: GigDocument, end: Date | null): boolean {
          return end == null || end > this.startsAt;
        },
        message: 'endsAt must be after startsAt',
      },
    },
    ticketUrl: {
      type: String,
      default: null,
      trim: true,
    },
    ticketPriceCents: {
      type: Number,
      default: null,
      min: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: GIG_STATUSES,
      default: 'scheduled',
      index: true,
    },
    isPublished: { type: Boolean, default: true },
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

// "Upcoming scheduled gigs in date order" — drives the public Gigs page.
gigSchema.index({ status: 1, isPublished: 1, startsAt: 1 });

// "Upcoming gigs in this city" — drives the home-page 'near you' strip.
gigSchema.index({ city: 1, startsAt: 1 });

gigSchema.methods.isPast = function isPast(this: GigDocument): boolean {
  return this.startsAt.getTime() < Date.now();
};

export const Gig = model<IGig, GigModel>('Gig', gigSchema);
