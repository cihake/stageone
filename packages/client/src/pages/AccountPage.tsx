/**
 * /account — landing for an authenticated user.
 * - Artists -> link to their dashboard
 * - Fans    -> fan feed: recent tracks + upcoming gigs from followed artists
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './account.css';

interface FeedTrack {
  _id: string;
  title: string;
  durationSecs?: number;
  audioUrl?: string;
  releasedAt?: string;
  artist: { slug: string; displayName: string } | null;
}

interface FeedGig {
  _id: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startsAt: string;
  ticketUrl?: string | null;
  artist: { slug: string; displayName: string } | null;
}

interface FanFeed {
  tracks: FeedTrack[];
  gigs: FeedGig[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDuration(secs?: number) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TrackRow({ track }: { track: FeedTrack }) {
  return (
    <li className="feed-row">
      <div className="feed-row__main">
        <span className="feed-row__title">{track.title}</span>
        {track.artist && (
          <Link to={`/artists/${track.artist.slug}`} className="feed-row__artist">
            {track.artist.displayName}
          </Link>
        )}
      </div>
      <div className="feed-row__meta">
        {track.durationSecs ? (
          <span className="feed-row__duration">{fmtDuration(track.durationSecs)}</span>
        ) : null}
        {track.releasedAt && (
          <span className="feed-row__date">{fmtDate(track.releasedAt)}</span>
        )}
        {track.audioUrl && (
          <a
            href={track.audioUrl}
            target="_blank"
            rel="noreferrer"
            className="feed-row__action"
            aria-label={`Listen to ${track.title}`}
          >
            Listen
          </a>
        )}
      </div>
    </li>
  );
}

function GigRow({ gig }: { gig: FeedGig }) {
  const date = new Date(gig.startsAt);
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  return (
    <li className="feed-row feed-row--gig">
      <div className="feed-row__date-badge">
        <span className="feed-row__month">{month}</span>
        <span className="feed-row__day">{day}</span>
      </div>
      <div className="feed-row__main">
        <span className="feed-row__title">{gig.title}</span>
        <span className="feed-row__venue">
          {gig.venueName} · {gig.city}, {gig.state}
        </span>
        {gig.artist && (
          <Link to={`/artists/${gig.artist.slug}`} className="feed-row__artist">
            {gig.artist.displayName}
          </Link>
        )}
      </div>
      <div className="feed-row__meta">
        {gig.ticketUrl && (
          <a href={gig.ticketUrl} target="_blank" rel="noreferrer" className="btn-ticket">
            Tickets
          </a>
        )}
      </div>
    </li>
  );
}

function FanFeedSection() {
  const [feed, setFeed] = useState<FanFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/follow/feed/me', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FanFeed;
      setFeed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading your feed...</p>;
  if (error) return <p style={{ color: 'var(--color-error, #c0392b)' }}>Error: {error}</p>;
  if (!feed) return null;

  const isEmpty = feed.tracks.length === 0 && feed.gigs.length === 0;
  if (isEmpty) {
    return (
      <div className="feed-empty">
        <p>Your feed is empty — follow some artists to see their latest tracks and gigs here.</p>
        <Link
          to="/artists"
          className="btn-primary"
          style={{ display: 'inline-flex', maxWidth: 220, textDecoration: 'none' }}
        >
          Browse artists
        </Link>
      </div>
    );
  }

  return (
    <div className="fan-feed">
      {feed.tracks.length > 0 && (
        <section className="feed-section">
          <h3 className="feed-section__heading">Recent tracks</h3>
          <ul className="feed-list">
            {feed.tracks.map((t) => (
              <TrackRow key={t._id} track={t} />
            ))}
          </ul>
        </section>
      )}
      {feed.gigs.length > 0 && (
        <section className="feed-section">
          <h3 className="feed-section__heading">Upcoming gigs</h3>
          <ul className="feed-list">
            {feed.gigs.map((g) => (
              <GigRow key={g._id} gig={g} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <article>
      <h1>Hi, {user.displayName}.</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
        You are signed in as <strong>{user.email}</strong> with the{' '}
        <strong>{user.role}</strong> role.
      </p>

      {user.role === 'artist' ? (
        <section
          style={{
            marginTop: 'var(--space-6)',
            padding: 'var(--space-5)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <h2>Your artist dashboard</h2>
          <p>Edit your profile, upload an avatar and cover image, and manage your work.</p>
          <Link
            to="/account/artist"
            className="btn-primary"
            style={{ display: 'inline-flex', maxWidth: 240, textDecoration: 'none' }}
          >
            Open dashboard
          </Link>
        </section>
      ) : (
        <section style={{ marginTop: 'var(--space-6)' }}>
          <h2>Your feed</h2>
          <FanFeedSection />
        </section>
      )}
    </article>
  );
}
