/**
 * User model — the root identity for fans, artists, and admins.
 *
 * One User → may own one Artist profile (1:0..1, established in v0.2).
 * Per spec §5.1 (user stories) and Needs Assessment Part 2 (Functionality).
 *
 * Security notes:
 *   - Password hashed with bcrypt (cost 12) per spec §6.2.
 *   - `passwordHash` is `select: false` so it never leaks in default queries.
 *   - `comparePassword` is the only sanctioned read path.
 */
import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export const USER_ROLES = ['fan', 'artist', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const BCRYPT_COST = 12;

export interface IUser {
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  bio: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  isSuspended: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Lightweight email check — full validation lives in the Zod request schema.
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned by default `find()` calls.
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'fan',
      required: true,
      index: true,
    },
    bio: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    avatarUrl: {
      type: String,
      default: null,
      trim: true,
    },
    emailVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

/**
 * Convenience: callers pass `password` (plaintext) and we hash it transparently.
 * Use `User.create({ email, password, displayName })` — the virtual setter below
 * routes the plaintext into a fresh bcrypt hash before save.
 */
userSchema.virtual('password').set(function setPassword(this: UserDocument, plain: string) {
  // Defer the hash to the pre-save hook so we don't block in the setter.
  this.set('passwordHash', `__plain__:${plain}`);
});

userSchema.pre('save', async function hashIfNeeded(next) {
  const stored = this.get('passwordHash') as string | undefined;
  if (stored && stored.startsWith('__plain__:')) {
    const plain = stored.slice('__plain__:'.length);
    this.passwordHash = await bcrypt.hash(plain, BCRYPT_COST);
  }
  next();
});

userSchema.methods.comparePassword = async function comparePassword(
  this: UserDocument,
  candidate: string,
): Promise<boolean> {
  // `passwordHash` is select:false, so callers must `.select('+passwordHash')`
  // before calling this method.
  if (!this.passwordHash) {
    throw new Error(
      'comparePassword called on a User without passwordHash loaded. ' +
        "Use `.select('+passwordHash')` in the query.",
    );
  }
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<IUser, UserModel>('User', userSchema);
