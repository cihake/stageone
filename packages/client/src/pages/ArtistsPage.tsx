/**
 * /artists — public artist directory.
 *
 * Grid of artist cards with photo, name, city, genre chips.
 * Genre + city filter dropdowns wired to GET /api/artists?city=…&genre=…
 * Cursor-based pagination ("Load more" button).
 *
 * Per spec §4.1 (Artist Directory) and wireframe B.2.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
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
  'rock', 'indie', 'folk', 'jazz', 'blues', 'pop', 'hip-hop',
  'electronic', 'country', 'metal', 'punk', 'r&b', 'classical', 'reggae',
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

// ─── Sub-components ───────────────────────────────────────────────────

function ArtistCard({ artist }: { artist: ArtistSummary }) {
  return (
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export function ArtistsPage() {
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [items, setItems] = useState<ArtistSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track "known cities" collected from results for the city dropdown.
  const [knownCities, setKnownCities] = useState<string[]>([]);
  const citiesRef = useRef<Set<string>>(new Set());

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

  return (
    <div>
      <h1>Artists</h1>

      {/* ── Filter toolbar ─────────────────────────────────────────── */}
      <div className="artists-page__toolbar" role="search" aria-label="Filter artists">
        <div className="field">
          <label htmlFor="filter-city">City</label>
          <select
            id="filter-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
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
          <select
            id="filter-genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
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
            items.map((artist) => <ArtistCard key={artist._id} artist={artist} />)
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
