/**
 * /gigs — public gig directory.
 *
 * Upcoming gigs sorted by date, filterable by city and genre.
 * Artist info is populated server-side (slug + displayName) so no
 * second fetch is needed per card.
 *
 * Per spec §4.1 (Gig listings page).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import './gigs.css';
import './artists.css'; // genre-chip

// ─── Types ────────────────────────────────────────────────────────────

interface ArtistSnap {
  slug: string;
  displayName: string;
}

interface GigSummary {
  _id: string;
  artistId: string;
  artist: ArtistSnap | null;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startsAt: string;
  ticketUrl: string | null;
  ticketPriceCents: number | null;
  status: 'scheduled' | 'cancelled' | 'postponed';
}

interface GigListResponse {
  items: GigSummary[];
  nextCursor: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────

const GENRE_OPTIONS = [
  'rock','indie','folk','jazz','blues','pop','hip-hop',
  'electronic','country','metal','punk','r&b','classical','reggae',
];

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDateBadge(iso: string) {
  const d = new Date(iso);
  return {
    month: d.toLocaleString('en-US', { month: 'short' }),
    day: String(d.getDate()),
    year: String(d.getFullYear()),
  };
}

function formatPrice(cents: number | null): string {
  if (cents === null) return '';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Gig card ─────────────────────────────────────────────────────────

function GigCard({ gig }: { gig: GigSummary }) {
  const { month, day, year } = formatDateBadge(gig.startsAt);

  return (
    <article className="gig-card">
      <div className="gig-card__date" aria-label={new Date(gig.startsAt).toLocaleDateString()}>
        <span className="gig-card__date-month">{month}</span>
        <span className="gig-card__date-day">{day}</span>
        <span className="gig-card__date-year">{year}</span>
      </div>

      <div className="gig-card__info">
        <h2 className="gig-card__title">{gig.title}</h2>
        {gig.artist && (
          <p className="gig-card__artist">
            by <Link to={`/artists/${gig.artist.slug}`}>{gig.artist.displayName}</Link>
          </p>
        )}
        <p className="gig-card__venue">{gig.venueName}</p>
        <p className="gig-card__location">
          {gig.city}, {gig.state}
          {gig.status !== 'scheduled' && (
            <span className={`gig-card__status gig-card__status--${gig.status}`}>
              {' '}{gig.status}
            </span>
          )}
        </p>
      </div>

      <div className="gig-card__actions">
        {gig.ticketPriceCents !== null && (
          <span className="gig-card__price">{formatPrice(gig.ticketPriceCents)}</span>
        )}
        {gig.ticketUrl ? (
          <a
            href={gig.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ticket"
          >
            Tickets →
          </a>
        ) : (
          <span className="gig-card__price" style={{ fontStyle: 'italic' }}>No tickets</span>
        )}
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export function GigsPage() {
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const citiesRef = useRef<Set<string>>(new Set());
  const [knownCities, setKnownCities] = useState<string[]>([]);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '20', upcoming: 'true' });
        if (city) params.set('city', city);
        if (genre) params.set('genre', genre);
        if (cursor) params.set('cursor', cursor);

        const data = await apiGet<GigListResponse>(`/api/gigs?${params}`);

        data.items.forEach((g) => {
          if (!citiesRef.current.has(g.city)) citiesRef.current.add(g.city);
        });
        setKnownCities(Array.from(citiesRef.current).sort());

        setGigs((prev) => (append ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gigs');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [city, genre],
  );

  useEffect(() => { void fetchPage(null, false); }, [fetchPage]);

  return (
    <div>
      <h1>Gigs</h1>

      <div className="gigs-page__toolbar" role="search" aria-label="Filter gigs">
        <div className="field">
          <label htmlFor="gig-city">City</label>
          <select id="gig-city" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {knownCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="gig-genre">Genre</label>
          <select id="gig-genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">All genres</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>
        </div>

        {(city || genre) && (
          <button type="button" className="btn-link"
            style={{ alignSelf: 'flex-end', paddingBottom: '10px' }}
            onClick={() => { setCity(''); setGenre(''); }}>
            Clear filters
          </button>
        )}
      </div>

      {error ? (
        <p className="form-error-banner" role="alert">{error}</p>
      ) : isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }} role="status">Loading gigs…</p>
      ) : gigs.length === 0 ? (
        <div className="gigs-page__empty">
          <p>No upcoming gigs{city || genre ? ' matching these filters' : ''}.</p>
        </div>
      ) : (
        <div className="gig-list" aria-live="polite">
          {gigs.map((gig) => <GigCard key={gig._id} gig={gig} />)}
        </div>
      )}

      {nextCursor && (
        <div className="gigs-page__pagination">
          <button type="button" disabled={isLoadingMore}
            onClick={() => void fetchPage(nextCursor, true)}>
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
