/**
 * /artists — public artist directory.
 *
 * Grid of artist cards with photo, name, city, genre chips.
 * Genre + city filter dropdowns wired to GET /api/artists?city=…&genre=…
 * Cursor-based pagination ("Load more" button).
 *
 * Follow toggle (added later): each card shows a Follow/Following pill.
 * Signed-in users can toggle inline; guests are routed to /account/sign-in.
 * We fetch the caller's full follow list once on mount rather than one
 * status check per card (N cards → 1 request, not N).
 *
 * Per spec §4.1 (Artist Directory) and wireframe B.2.
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiDelete, apiGet, apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './artists.css';

// ─── Types ────────────────────────────────────────────────────────────

interface ArtistSummary {
  _id: string;
  slug: string;
  displayName: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  avatarUrl: string | null;
  followerCount: number;
  isFeatured: boolean;
}

interface ListResponse {
  items: ArtistSummary[];
  nextCursor: string | null;
}

// ─── Known filter options (expand as the db grows) ────────────────────

const GENRE_OPTIONS = [
  'rock',
  'indie',
  'folk',
  'jazz',
  'blues',
  'pop',
  'hip-hop',
  'electronic',
  'country',
  'metal',
  'punk',
  'r&b',
  'classical',
  'reggae',
];

// ─── Helpers ──────────────────────────────────────────────────────────

function buildQueryString(city: string, genre: string, cursor: string | null): string {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (genre) params.set('genre', genre);
  if (cursor) params.set('cursor', cursor);
  params.set('limit', '20');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Follow button ────────────────────────────────────────────────────

interface FollowButtonProps {
  artistId: string;
  isFollowing: boolean;
  isAuthenticated: boolean;
  isBusy: boolean;
  onToggle: (artistId: string, willFollow: boolean) => void;
}

function FollowButton({
  artistId,
  isFollowing,
  isAuthenticated,
  isBusy,
  onToggle,
}: FollowButtonProps) {
  const navigate = useNavigate();

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    // The card is a <Link>; without these the button click bubbles up
    // and navigates to the artist page instead of toggling.
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/account/sign-in');
      return;
    }
    onToggle(artistId, !isFollowing);
  }

  const label = !isAuthenticated ? 'Follow' : isFollowing ? 'Following' : 'Follow';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className={`artist-card__follow${isFollowing ? ' artist-card__follow--active' : ''}`}
      aria-pressed={isAuthenticated ? isFollowing : undefined}
      aria-label={
        !isAuthenticated
          ? 'Sign in to follow this artist'
          : isFollowing
            ? 'Unfollow this artist'
            : 'Follow this artist'
      }
    >
      {label}
    </button>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

interface ArtistCardProps {
  artist: ArtistSummary;
  isAuthenticated: boolean;
  isFollowing: boolean;
  isBusy: boolean;
  onToggleFollow: (artistId: string, willFollow: boolean) => void;
}

function ArtistCard({
  artist,
  isAuthenticated,
  isFollowing,
  isBusy,
  onToggleFollow,
}: ArtistCardProps) {
  return (
    <div className="artist-card-wrapper">
      <Link
        to={`/artists/${artist.slug}`}
        className="artist-card"
        aria-label={`View ${artist.displayName}'s page`}
      >
        {artist.avatarUrl ? (
          <img
            src={artist.avatarUrl}
            alt={`${artist.displayName} photo`}
            className="artist-card__photo"
            loading="lazy"
          />
        ) : (
          <div className="artist-card__photo-placeholder" aria-hidden="true">
            {initials(artist.displayName)}
          </div>
        )}

        <div className="artist-card__body">
          <p className="artist-card__name">{artist.displayName}</p>
          <p className="artist-card__location">
            {artist.homeCity}, {artist.homeState}
          </p>
          {artist.genreTags.length > 0 && (
            <div className="artist-card__genres">
              {artist.genreTags.slice(0, 3).map((g) => (
                <span key={g} className="genre-chip">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      <FollowButton
        artistId={artist._id}
        isFollowing={isFollowing}
        isAuthenticated={isAuthenticated}
        isBusy={isBusy}
        onToggle={onToggleFollow}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export function ArtistsPage() {
  const { isAuthenticated } = useAuth();
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [items, setItems] = useState<ArtistSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Followed artist IDs — one Set for O(1) lookups from every card.
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  // Artist IDs whose follow toggle is mid-flight, to disable double-clicks.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Track "known cities" collected from results for the city dropdown.
  const [knownCities, setKnownCities] = useState<string[]>([]);
  const citiesRef = useRef<Set<string>>(new Set());

  // Load the caller's follow list once. If the auth state changes (sign-in
  // or sign-out) we reload; signing out clears the set.
  useEffect(() => {
    if (!isAuthenticated) {
      setFollowingSet(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ artistIds: string[] }>('/api/follow');
        if (!cancelled) setFollowingSet(new Set(data.artistIds));
      } catch {
        // Non-fatal: cards fall back to showing "Follow" — user can retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);
      try {
        const qs = buildQueryString(city, genre, cursor);
        const data = await apiGet<ListResponse>(`/api/artists${qs}`);

        // Collect cities for the city dropdown.
        data.items.forEach((a) => {
          if (a.homeCity && !citiesRef.current.has(a.homeCity)) {
            citiesRef.current.add(a.homeCity);
          }
        });
        setKnownCities(Array.from(citiesRef.current).sort());

        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artists');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [city, genre],
  );

  // Re-fetch from page 1 when filters change.
  useEffect(() => {
    void fetchPage(null, false);
  }, [fetchPage]);

  const onToggleFollow = useCallback(async (artistId: string, willFollow: boolean) => {
    // Optimistic update, then reconcile with the server response.
    setPendingIds((prev) => new Set(prev).add(artistId));
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (willFollow) next.add(artistId);
      else next.delete(artistId);
      return next;
    });
    try {
      if (willFollow) {
        await apiPost('/api/follow', { artistId });
      } else {
        await apiDelete(`/api/follow/${artistId}`);
      }
    } catch {
      // Roll back on failure.
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (willFollow) next.delete(artistId);
        else next.add(artistId);
        return next;
      });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(artistId);
        return next;
      });
    }
  }, []);

  return (
    <div>
      <h1>Artists</h1>

      {/* ── Filter toolbar ─────────────────────────────────────────── */}
      <div className="artists-page__toolbar" role="search" aria-label="Filter artists">
        <div className="field">
          <label htmlFor="filter-city">City</label>
          <select id="filter-city" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {knownCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="filter-genre">Genre</label>
          <select id="filter-genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">All genres</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {(city || genre) && (
          <button
            type="button"
            className="btn-link"
            style={{ alignSelf: 'flex-end', paddingBottom: '10px' }}
            onClick={() => {
              setCity('');
              setGenre('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Grid ──────────────────────────────────────────────────── */}
      {error ? (
        <p className="form-error-banner" role="alert">
          {error}
        </p>
      ) : (
        <div className="artist-grid" aria-live="polite" aria-busy={isLoading}>
          {isLoading ? (
            <p className="artists-page__loading" role="status">
              Loading artists…
            </p>
          ) : items.length === 0 ? (
            <p className="artists-page__empty">
              No artists found{city || genre ? ' for these filters' : ''}.
            </p>
          ) : (
            items.map((artist) => (
              <ArtistCard
                key={artist._id}
                artist={artist}
                isAuthenticated={isAuthenticated}
                isFollowing={followingSet.has(artist._id)}
                isBusy={pendingIds.has(artist._id)}
                onToggleFollow={onToggleFollow}
              />
            ))
          )}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {nextCursor && (
        <div className="artists-page__pagination">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={() => void fetchPage(nextCursor, true)}
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
