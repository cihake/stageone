/**
 * Search business logic.
 *
 * GET /api/search?q=…&limit=…
 *
 * Returns up to `limit` results per type (default 6, max 20).
 * Only approved artists and published content surface.
 * Results are enriched with a minimal artist snapshot to avoid
 * N+1 round-trips on the client.
 */
import { Artist, Gig, Track } from '../models/index.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ArtistResult {
  _id: string;
  slug: string;
  displayName: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  avatarUrl: string | null;
  followerCount: number;
}

export interface TrackResult {
  _id: string;
  title: string;
  album: string | null;
  durationSeconds: number;
  audioUrl: string | null;
  releasedAt: string;
  artist: { slug: string; displayName: string } | null;
}

export interface GigResult {
  _id: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startsAt: string;
  ticketUrl: string | null;
  artist: { slug: string; displayName: string } | null;
}

export interface SearchResults {
  artists: ArtistResult[];
  tracks: TrackResult[];
  gigs: GigResult[];
}

export async function search(
  query: string,
  limit = 6,
): Promise<SearchResults> {
  const cap = Math.min(limit, 20);
  const rx = new RegExp(escapeRegex(query), 'i');

  const [artists, tracks, gigs] = await Promise.all([
    // ── Artists ────────────────────────────────────────────────────
    Artist.find({
      isApproved: true,
      $or: [
        { displayName: rx },
        { bio: rx },
        { homeCity: rx },
        { genreTags: rx },
      ],
    })
      .select('slug displayName homeCity homeState genreTags avatarUrl followerCount')
      .limit(cap)
      .lean(),

    // ── Tracks ─────────────────────────────────────────────────────
    Track.find({
      isPublished: true,
      $or: [{ title: rx }, { album: rx }],
    })
      .select('title album durationSeconds audioUrl releasedAt artistId')
      .limit(cap)
      .lean(),

    // ── Gigs ───────────────────────────────────────────────────────
    Gig.find({
      isPublished: true,
      status: 'scheduled',
      startsAt: { $gte: new Date() },
      $or: [{ title: rx }, { venueName: rx }, { city: rx }],
    })
      .select('title venueName city state startsAt ticketUrl artistId')
      .sort({ startsAt: 1 })
      .limit(cap)
      .lean(),
  ]);

  // ── Batch-fetch artist snapshots for tracks + gigs ──────────────
  const artistIds = [
    ...new Set([
      ...tracks.map((t) => String(t.artistId)),
      ...gigs.map((g) => String(g.artistId)),
    ]),
  ];

  const artistDocs =
    artistIds.length > 0
      ? await Artist.find({ _id: { $in: artistIds }, isApproved: true })
          .select('slug displayName')
          .lean()
      : [];

  const artistMap = new Map(artistDocs.map((a) => [String(a._id), a]));

  return {
    artists: artists.map((a) => ({
      _id: String(a._id),
      slug: a.slug,
      displayName: a.displayName,
      homeCity: a.homeCity,
      homeState: a.homeState,
      genreTags: a.genreTags,
      avatarUrl: a.avatarUrl ?? null,
      followerCount: a.followerCount,
    })),
    tracks: tracks.map((t) => ({
      _id: String(t._id),
      title: t.title,
      album: t.album ?? null,
      durationSeconds: t.durationSeconds,
      audioUrl: t.audioUrl ?? null,
      releasedAt: String(t.releasedAt),
      artist: artistMap.get(String(t.artistId)) ?? null,
    })),
    gigs: gigs.map((g) => ({
      _id: String(g._id),
      title: g.title,
      venueName: g.venueName,
      city: g.city,
      state: g.state,
      startsAt: String(g.startsAt),
      ticketUrl: g.ticketUrl ?? null,
      artist: artistMap.get(String(g.artistId)) ?? null,
    })),
  };
}
