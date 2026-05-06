/**
 * /search — full-text search across artists, tracks, and upcoming gigs.
 *
 * Submit-on-enter to keep DB load low.
 * An "AI Search" tab is shown as a disabled stub, reserved for v1.0-rc.
 */
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet } from '../lib/api';
import './search.css';

// ─── Types ────────────────────────────────────────────────────────────

interface ArtistResult {
  _id: string;
  slug: string;
  displayName: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  avatarUrl: string | null;
  followerCount: number;
}

interface TrackResult {
  _id: string;
  title: string;
  album: string | null;
  durationSeconds: number;
  audioUrl: string | null;
  releasedAt: string;
  artist: { slug: string; displayName: string } | null;
}

interface GigResult {
  _id: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startsAt: string;
  ticketUrl: string | null;
  artist: { slug: string; displayName: string } | null;
}

interface SearchResults {
  artists: ArtistResult[];
  tracks: TrackResult[];
  gigs: GigResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

// ─── Result rows ──────────────────────────────────────────────────────

function ArtistRow({ artist }: { artist: ArtistResult }) {
  return (
    <Link to={`/artists/${artist.slug}`} className="search-row search-row--artist">
      <div className="search-row__avatar" aria-hidden="true">
        {artist.avatarUrl
          ? <img src={artist.avatarUrl} alt="" className="search-row__avatar-img" />
          : <span>{initials(artist.displayName)}</span>}
      </div>
      <div className="search-row__body">
        <span className="search-row__title">{artist.displayName}</span>
        <span className="search-row__sub">
          {artist.homeCity}, {artist.homeState}
          {artist.genreTags.length > 0 && (
            <> &middot; {artist.genreTags.slice(0, 3).join(', ')}</>
          )}
        </span>
      </div>
      <span className="search-row__meta">{artist.followerCount.toLocaleString()} followers</span>
    </Link>
  );
}

function TrackRow({ track }: { track: TrackResult }) {
  return (
    <div className="search-row">
      <div className="search-row__body">
        <span className="search-row__title">{track.title}</span>
        <span className="search-row__sub">
          {track.artist
            ? <Link to={`/artists/${track.artist.slug}`} className="search-row__link">{track.artist.displayName}</Link>
            : null}
          {track.album && <> &middot; {track.album}</>}
        </span>
      </div>
      <div className="search-row__meta">
        {track.durationSeconds ? <span>{fmtDuration(track.durationSeconds)}</span> : null}
        {track.audioUrl && (
          <a href={track.audioUrl} target="_blank" rel="noreferrer" className="search-row__action">
            Listen
          </a>
        )}
      </div>
    </div>
  );
}

function GigRow({ gig }: { gig: GigResult }) {
  const d = new Date(gig.startsAt);
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  return (
    <div className="search-row search-row--gig">
      <div className="search-row__date-badge" aria-label={fmtDate(gig.startsAt)}>
        <span className="search-row__month">{month}</span>
        <span className="search-row__day">{day}</span>
      </div>
      <div className="search-row__body">
        <span className="search-row__title">{gig.title}</span>
        <span className="search-row__sub">
          {gig.venueName} &middot; {gig.city}, {gig.state}
          {gig.artist && (
            <> &middot; <Link to={`/artists/${gig.artist.slug}`} className="search-row__link">{gig.artist.displayName}</Link></>
          )}
        </span>
      </div>
      {gig.ticketUrl && (
        <a href={gig.ticketUrl} target="_blank" rel="noreferrer" className="btn-ticket">
          Tickets
        </a>
      )}
    </div>
  );
}

// ─── Results section ──────────────────────────────────────────────────

function ResultSection<T>({
  heading, items, renderRow, browseHref, browseLabel,
}: {
  heading: string;
  items: T[];
  renderRow: (item: T) => React.ReactNode;
  browseHref: string;
  browseLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="search-section">
      <h2 className="search-section__heading">{heading}</h2>
      <div className="search-list">
        {items.map((item) => renderRow(item))}
      </div>
      <Link to={browseHref} className="search-section__more">
        {browseLabel} →
      </Link>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

type Tab = 'keyword' | 'ai';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('keyword');
  const [input, setInput] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Run search when ?q= is present on load
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      void runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(q: string) {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiGet<SearchResults>(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setSearchParams({ q });
    void runSearch(q);
  }

  const hasResults = results && (
    results.artists.length > 0 || results.tracks.length > 0 || results.gigs.length > 0
  );
  const noResults = results && !hasResults;

  return (
    <article className="search-page">
      <h1>Search</h1>

      {/* Tab bar */}
      <div className="search-tabs" role="tablist" aria-label="Search mode">
        <button
          role="tab"
          type="button"
          aria-selected={tab === 'keyword'}
          className={`search-tab${tab === 'keyword' ? ' search-tab--active' : ''}`}
          onClick={() => setTab('keyword')}
        >
          Keyword
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={false}
          aria-disabled="true"
          disabled
          className="search-tab search-tab--disabled"
          title="AI Search is coming in v1.0-rc"
        >
          AI Search
          <span className="search-tab__badge" aria-hidden="true">Soon</span>
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="search-form" role="search">
        <div className="search-form__row">
          <label htmlFor="search-input" className="sr-only">Search artists, tracks, and gigs</label>
          <input
            id="search-input"
            ref={inputRef}
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search artists, tracks, gigs…"
            className="search-input"
            autoFocus
            autoComplete="off"
          />
          <button type="submit" className="search-submit" disabled={isLoading}>
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {/* States */}
      {error && <p className="form-error-banner" role="alert">{error}</p>}

      {isLoading && (
        <p className="search-status" role="status">Searching…</p>
      )}

      {noResults && (
        <div className="search-empty">
          <p>No results for <strong>&ldquo;{searchParams.get('q')}&rdquo;</strong>.</p>
          <p className="search-empty__hint">Try a different spelling, a genre tag, or a city name.</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="search-results">
          <ResultSection
            heading="Artists"
            items={results.artists}
            renderRow={(a) => <ArtistRow key={a._id} artist={a} />}
            browseHref="/artists"
            browseLabel="Browse all artists"
          />
          <ResultSection
            heading="Tracks"
            items={results.tracks}
            renderRow={(t) => <TrackRow key={t._id} track={t} />}
            browseHref="/artists"
            browseLabel="Browse artist pages for more tracks"
          />
          <ResultSection
            heading="Upcoming gigs"
            items={results.gigs}
            renderRow={(g) => <GigRow key={g._id} gig={g} />}
            browseHref="/gigs"
            browseLabel="Browse full gig calendar"
          />
        </div>
      )}

      {/* Prompt state — nothing searched yet */}
      {!results && !isLoading && (
        <div className="search-prompt">
          <p>Find artists, tracks, and shows on StageOne.</p>
          <p className="search-prompt__hint">
            Try searching a name, city, genre, or venue.
          </p>
        </div>
      )}
    </article>
  );
}
