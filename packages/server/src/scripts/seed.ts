/**
 * Dev seed script — populates a fresh database with a small, realistic set of
 * users, artists, tracks, gigs, and follows so the UI has something to show.
 *
 * Run with:
 *   npm --workspace @stageone/server run seed
 *
 * SAFETY: This script clears every collection before inserting. It refuses to
 * run if NODE_ENV=production. Run only against dev or staging clusters.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
  Artist,
  Follow,
  Gig,
  Track,
  User,
  type ArtistDocument,
  type IArtist,
} from '../models/index.js';

/** Shape of an artist seed before slug/follower-count/timestamps are filled in. */
type ArtistSeed = Omit<IArtist, 'slug' | 'followerCount' | 'createdAt' | 'updatedAt'>;

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run seed against production database.');
  }

  await connectDB();

  // eslint-disable-next-line no-console
  console.log('[seed] Clearing existing data…');
  await Promise.all([
    User.deleteMany({}),
    Artist.deleteMany({}),
    Track.deleteMany({}),
    Gig.deleteMany({}),
    Follow.deleteMany({}),
  ]);

  // ─── Users ──────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[seed] Creating users…');
  const adminUser = await User.create({
    email: 'admin@stageone.app',
    password: 'AdminPassw0rd!',
    displayName: 'StageOne Admin',
    role: 'admin',
    emailVerified: true,
  });

  const fanUsers = await Promise.all([
    User.create({
      email: 'jess@example.com',
      password: 'FanPassw0rd!',
      displayName: 'Jess B.',
      role: 'fan',
      emailVerified: true,
      bio: 'Indie folk evangelist; will travel for a good show.',
    }),
    User.create({
      email: 'marco@example.com',
      password: 'FanPassw0rd!',
      displayName: 'Marco K.',
      role: 'fan',
      emailVerified: true,
    }),
    User.create({
      email: 'priya@example.com',
      password: 'FanPassw0rd!',
      displayName: 'Priya R.',
      role: 'fan',
      emailVerified: true,
    }),
  ]);

  const artistUsersData = [
    { email: 'wren@example.com', displayName: 'Wren Hollow' },
    { email: 'callbox@example.com', displayName: 'Callbox' },
    { email: 'ada@example.com', displayName: 'Ada Marin' },
    { email: 'highway@example.com', displayName: 'Highway Bell' },
    { email: 'siv@example.com', displayName: 'Siv & The Margins' },
  ];

  const artistUsers = await Promise.all(
    artistUsersData.map((a) =>
      User.create({
        email: a.email,
        password: 'ArtistPassw0rd!',
        displayName: a.displayName,
        role: 'artist',
        emailVerified: true,
      }),
    ),
  );

  // ─── Artists ────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[seed] Creating artists…');
  const artistSeeds: ArtistSeed[] = [
    {
      userId: artistUsers[0]!._id,
      displayName: 'Wren Hollow',
      avatarUrl: null,
      coverImageUrl: null,
      pressKitUrl: null,
      bio: 'Lo-fi indie folk from the Susquehanna valley. Acoustic guitar, banjo, and a four-track recorder.',
      homeCity: 'Harrisburg',
      homeState: 'PA',
      genreTags: ['indie', 'folk', 'acoustic'],
      socialLinks: { instagram: 'https://instagram.com/wren.hollow' },
      isApproved: true,
      isFeatured: true,
    },
    {
      userId: artistUsers[1]!._id,
      displayName: 'Callbox',
      avatarUrl: null,
      coverImageUrl: null,
      pressKitUrl: null,
      bio: 'Synthpop trio. Loud melodies, louder feelings.',
      homeCity: 'Lancaster',
      homeState: 'PA',
      genreTags: ['indie', 'synthpop', 'electronic'],
      socialLinks: { website: 'https://callbox.example' },
      isApproved: true,
      isFeatured: true,
    },
    {
      userId: artistUsers[2]!._id,
      displayName: 'Ada Marin',
      avatarUrl: null,
      coverImageUrl: null,
      pressKitUrl: null,
      bio: 'Solo singer-songwriter. Piano-led ballads about leaving small towns.',
      homeCity: 'York',
      homeState: 'PA',
      genreTags: ['indie', 'singer-songwriter', 'piano'],
      socialLinks: {},
      isApproved: true,
      isFeatured: false,
    },
    {
      userId: artistUsers[3]!._id,
      displayName: 'Highway Bell',
      avatarUrl: null,
      coverImageUrl: null,
      pressKitUrl: null,
      bio: 'Four-piece alt-country band. Pedal steel for days.',
      homeCity: 'Carlisle',
      homeState: 'PA',
      genreTags: ['alt-country', 'americana'],
      socialLinks: { bandcamp: 'https://highwaybell.bandcamp.com' },
      isApproved: true,
      isFeatured: false,
    },
    {
      userId: artistUsers[4]!._id,
      displayName: 'Siv & The Margins',
      avatarUrl: null,
      coverImageUrl: null,
      pressKitUrl: null,
      bio: 'Post-punk five-piece. Chasing the wall-of-sound circa 1985.',
      homeCity: 'Hershey',
      homeState: 'PA',
      genreTags: ['post-punk', 'indie', 'rock'],
      socialLinks: { instagram: 'https://instagram.com/sivmargins' },
      isApproved: false, // pending moderation — gives admins something to triage
      isFeatured: false,
    },
  ];

  const artists: ArtistDocument[] = await Promise.all(
    artistSeeds.map(async (seed) => {
      const slug = Artist.slugify(seed.displayName);
      return Artist.create({ ...seed, slug });
    }),
  );

  // ─── Tracks ─────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[seed] Creating tracks…');
  const trackSeeds = [
    {
      artistIdx: 0,
      title: 'Letters from the Valley',
      album: 'Unlit',
      durationSeconds: 222,
      genreTags: ['indie', 'folk'],
    },
    {
      artistIdx: 0,
      title: 'Cold Stove Morning',
      album: 'Unlit',
      durationSeconds: 198,
      genreTags: ['indie', 'folk'],
    },
    {
      artistIdx: 0,
      title: 'Hollow Bones',
      album: null,
      durationSeconds: 245,
      genreTags: ['indie', 'acoustic'],
    },
    {
      artistIdx: 1,
      title: 'Run the Block',
      album: 'Lights Out',
      durationSeconds: 215,
      genreTags: ['synthpop'],
    },
    {
      artistIdx: 1,
      title: 'Static',
      album: 'Lights Out',
      durationSeconds: 188,
      genreTags: ['synthpop', 'electronic'],
    },
    {
      artistIdx: 2,
      title: 'Train to Anywhere',
      album: null,
      durationSeconds: 263,
      genreTags: ['singer-songwriter'],
    },
    {
      artistIdx: 2,
      title: 'Smaller Houses',
      album: null,
      durationSeconds: 232,
      genreTags: ['singer-songwriter', 'piano'],
    },
    {
      artistIdx: 3,
      title: 'Old Route 11',
      album: 'Mile Marker',
      durationSeconds: 254,
      genreTags: ['alt-country', 'americana'],
    },
    {
      artistIdx: 3,
      title: 'Coffee in the Cab',
      album: 'Mile Marker',
      durationSeconds: 198,
      genreTags: ['alt-country'],
    },
    {
      artistIdx: 4,
      title: 'Margin Note (Demo)',
      album: null,
      durationSeconds: 312,
      genreTags: ['post-punk'],
    },
  ];

  await Promise.all(
    trackSeeds.map((t, i) =>
      Track.create({
        artistId: artists[t.artistIdx]!._id,
        title: t.title,
        album: t.album,
        durationSeconds: t.durationSeconds,
        genreTags: t.genreTags,
        audioUrl: `https://placehold.co/audio/track-${i + 1}.mp3`,
        coverArtUrl: `https://placehold.co/600x600/png?text=${encodeURIComponent(t.title)}`,
        description: '',
        isPublished: true,
        releasedAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
      }),
    ),
  );

  // ─── Gigs ───────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[seed] Creating gigs…');
  const today = new Date();
  const daysFromNow = (d: number): Date => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    dt.setHours(20, 0, 0, 0); // 8 pm local
    return dt;
  };

  const gigSeeds = [
    {
      artistIdx: 0,
      title: 'Wren Hollow at The Capitol Room',
      venueName: 'The Capitol Room',
      city: 'Harrisburg',
      state: 'PA',
      startsAt: daysFromNow(3),
      ticketUrl: 'https://tickets.example/wren-cap',
      ticketPriceCents: 1500,
    },
    {
      artistIdx: 0,
      title: 'Wren Hollow — house show',
      venueName: 'TBA',
      city: 'Lancaster',
      state: 'PA',
      startsAt: daysFromNow(11),
      ticketUrl: null,
      ticketPriceCents: null,
    },
    {
      artistIdx: 1,
      title: 'Callbox — album release',
      venueName: 'Federal Taphouse',
      city: 'Lancaster',
      state: 'PA',
      startsAt: daysFromNow(7),
      ticketUrl: 'https://tickets.example/callbox-release',
      ticketPriceCents: 2000,
    },
    {
      artistIdx: 2,
      title: 'Ada Marin solo set',
      venueName: 'The Pressroom',
      city: 'York',
      state: 'PA',
      startsAt: daysFromNow(5),
      ticketUrl: null,
      ticketPriceCents: 1000,
    },
    {
      artistIdx: 3,
      title: 'Highway Bell at the Farmers Market',
      venueName: 'Farmers on Hanover',
      city: 'Carlisle',
      state: 'PA',
      startsAt: daysFromNow(14),
      ticketUrl: null,
      ticketPriceCents: 0,
    },
    {
      artistIdx: 0,
      title: 'Wren Hollow — past show',
      venueName: 'The Capitol Room',
      city: 'Harrisburg',
      state: 'PA',
      startsAt: daysFromNow(-30),
      ticketUrl: null,
      ticketPriceCents: 1500,
    },
  ];

  await Promise.all(
    gigSeeds.map((g) =>
      Gig.create({
        artistId: artists[g.artistIdx]!._id,
        title: g.title,
        venueName: g.venueName,
        venueAddress: '',
        city: g.city,
        state: g.state,
        startsAt: g.startsAt,
        ticketUrl: g.ticketUrl,
        ticketPriceCents: g.ticketPriceCents,
        description: '',
        status: 'scheduled',
        isPublished: true,
      }),
    ),
  );

  // ─── Follows ────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[seed] Creating follows…');
  const followPairs: Array<[number, number]> = [
    [0, 0], // Jess  → Wren Hollow
    [0, 2], // Jess  → Ada Marin
    [1, 1], // Marco → Callbox
    [1, 3], // Marco → Highway Bell
    [2, 0], // Priya → Wren Hollow
    [2, 1], // Priya → Callbox
  ];

  await Promise.all(
    followPairs.map(([fanIdx, artistIdx]) =>
      Follow.create({
        userId: fanUsers[fanIdx]!._id,
        artistId: artists[artistIdx]!._id,
      }),
    ),
  );

  // Update denormalized counters.
  for (const artist of artists) {
    const count = await Follow.countDocuments({ artistId: artist._id });
    artist.followerCount = count;
    await artist.save();
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed] Done. ${1 + fanUsers.length + artistUsers.length} users / ` +
      `${artists.length} artists / ${trackSeeds.length} tracks / ` +
      `${gigSeeds.length} gigs / ${followPairs.length} follows.`,
  );
  // eslint-disable-next-line no-console
  console.log(`[seed] Admin login: ${adminUser.email} / AdminPassw0rd!`);
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
