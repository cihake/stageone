/**
 * Create two known test accounts (fan + approved artist) for previewing
 * and debugging role-specific UI. Idempotent — running it twice does not
 * duplicate users, and does not touch existing data.
 *
 * Run with:
 *   npm --workspace @stageone/server run create-test-users
 *
 * SAFETY: like seed.ts, this refuses to run against NODE_ENV=production
 * unless SEED_ALLOW_PROD=true. Unlike seed.ts it does NOT wipe the db —
 * it only creates missing test accounts.
 *
 * Credentials (fixed so we don't have to look them up in the DB):
 *   fan:     fan@stageone.test    /  TestFan!2026
 *   artist:  artist@stageone.test /  TestArtist!2026
 *
 * The @stageone.test TLD has no MX record, so these addresses never
 * receive real mail. That's fine — the app has no password-reset flow
 * anyway, and it keeps the accounts clearly separated from real users.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Artist, User } from '../models/index.js';

const TEST_FAN = {
  email: 'fan@stageone.test',
  password: 'TestFan!2026',
  displayName: 'Test Fan',
} as const;

const TEST_ARTIST_USER = {
  email: 'artist@stageone.test',
  password: 'TestArtist!2026',
  displayName: 'Test Artist',
} as const;

const TEST_ARTIST_PROFILE = {
  slug: 'test-artist' as string,
  displayName: 'Test Artist',
  bio: 'A placeholder artist account used for previewing artist-only features.',
  homeCity: 'Portland',
  homeState: 'OR',
  genreTags: ['indie', 'folk'],
  isApproved: true,
  isFeatured: false,
};

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PROD !== 'true') {
    throw new Error(
      'Refusing to run against production database. ' +
        'Set SEED_ALLOW_PROD=true to override.',
    );
  }

  await connectDB();

  // ─── Fan ────────────────────────────────────────────────────────────
  let fanUser = await User.findOne({ email: TEST_FAN.email });
  if (fanUser) {
    // eslint-disable-next-line no-console
    console.log(`[create-test-users] Fan already exists (${TEST_FAN.email}) — skipped.`);
  } else {
    fanUser = await User.create({
      email: TEST_FAN.email,
      password: TEST_FAN.password,
      displayName: TEST_FAN.displayName,
      role: 'fan',
      emailVerified: true,
    });
    // eslint-disable-next-line no-console
    console.log(`[create-test-users] Created fan: ${TEST_FAN.email}`);
  }

  // ─── Artist ─────────────────────────────────────────────────────────
  let artistUser = await User.findOne({ email: TEST_ARTIST_USER.email });
  if (artistUser) {
    // eslint-disable-next-line no-console
    console.log(
      `[create-test-users] Artist user already exists (${TEST_ARTIST_USER.email}) — skipped.`,
    );
  } else {
    artistUser = await User.create({
      email: TEST_ARTIST_USER.email,
      password: TEST_ARTIST_USER.password,
      displayName: TEST_ARTIST_USER.displayName,
      role: 'artist',
      emailVerified: true,
    });
    // eslint-disable-next-line no-console
    console.log(`[create-test-users] Created artist user: ${TEST_ARTIST_USER.email}`);
  }

  const existingArtist = await Artist.findOne({ userId: artistUser._id });
  if (existingArtist) {
    // eslint-disable-next-line no-console
    console.log(
      `[create-test-users] Artist profile already exists (${existingArtist.slug}) — skipped.`,
    );
  } else {
    // slug uniqueness: if a different artist already claims the slug (e.g. a
    // leftover from a partial run), append a short suffix so we never crash.
    let slug = TEST_ARTIST_PROFILE.slug;
    const clash = await Artist.findOne({ slug });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;

    await Artist.create({
      ...TEST_ARTIST_PROFILE,
      slug,
      userId: artistUser._id,
      followerCount: 0,
      socialLinks: {},
    });
    // eslint-disable-next-line no-console
    console.log(`[create-test-users] Created artist profile: /artists/${slug}`);
  }

  // eslint-disable-next-line no-console
  console.log('\n[create-test-users] Done. Test credentials:');
  // eslint-disable-next-line no-console
  console.log(`  fan     ${TEST_FAN.email}    /  ${TEST_FAN.password}`);
  // eslint-disable-next-line no-console
  console.log(`  artist  ${TEST_ARTIST_USER.email} /  ${TEST_ARTIST_USER.password}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[create-test-users] Failed:', err);
  process.exit(1);
});
