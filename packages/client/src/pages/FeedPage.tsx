/**
 * /feed — signed-in users see recent tracks and upcoming gigs from the
 * artists they follow. Backed by GET /api/follow/feed/me, which already
 * returns tracks + gigs pre-joined with artist snapshots so there's no
 * N+1 fetch on the client.
 *
 * Design: two labelled sections rather than one merged timeline. Tracks
 * and gigs are different kinds of things ("something to listen to" vs
 * "something to attend"), and mixing them into one chronological stream
 * would bury one or the other depending on the follow set.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import './feed.css';

interface ArtistSnap {
  slug: string;
  displayName: string;
}

interface FeedTrack {
  _id: string;
  title: string;
  album: string | null;
  durationSeconds: number;
  audioUrl: string;
  releasedAt: string;
  artist: ArtistSnap | null;
}

interface FeedGig {
  _id: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startsAt: string;
  ticketUrl: string | null;
  artist: ArtistSnap | null;
}

interface FeedResponse {
  tracks: FeedTrack[];
  gigs: FeedGig[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FeedPage() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const player = usePlayer();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<FeedResponse>('/api/follow/feed/me');
        if (!cancelled) setFeed(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your feed');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <p style={{ color: 'var(--text-secondary)' }} role="status">
        Loading your feed…
      </p>
    );
  }
  if (error) {
    return (
      <p className="form-error-banner" role="alert">
        {error}
      </p>
    );
  }
  if (!feed) return null;

  const isEmpty = feed.tracks.length === 0 && feed.gigs.length === 0;

  return (
    <div className="feed-page">
      <h1>Your Feed</h1>

      {isEmpty ? (
        <div className="feed-empty">
          <p>Nothing here yet.</p>
          <p>
            <Link to="/artists">Discover artists</Link> and follow the ones you like — their
            new tracks and upcoming gigs will show up here.
          </p>
        </div>
      ) : (
        <>
          <section className="feed-section" aria-labelledby="feed-tracks-heading">
            <h2 id="feed-tracks-heading">New tracks</h2>
            {feed.tracks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                No new tracks from artists you follow.
              </p>
            ) : (
              <div className="feed-list" role="list">
                {feed.tracks.map((track) => {
                  const isCurrent = player.currentTrack?._id === track._id;
                  const isCurrentPlaying = isCurrent && player.isPlaying;
                  const canPlay = Boolean(track.artist);
                  return (
                    <div
                      key={track._id}
                      className={`feed-row feed-row--track${
                        isCurrent ? ' feed-row--playing' : ''
                      }`}
                      role="listitem"
                    >
                      <button
                        type="button"
                        className="feed-row__play"
                        onClick={() =>
                          canPlay &&
                          player.play({
                            _id: track._id,
                            title: track.title,
                            album: track.album,
                            durationSeconds: track.durationSeconds,
                            audioUrl: track.audioUrl,
                            artistName: track.artist!.displayName,
                            artistSlug: track.artist!.slug,
                          })
                        }
                        disabled={!canPlay}
                        aria-label={
                          isCurrentPlaying ? `Pause ${track.title}` : `Play ${track.title}`
                        }
                        title={isCurrentPlaying ? 'Pause' : 'Play'}
                      >
                        {isCurrentPlaying ? '❚❚' : '▶'}
                      </button>
                      <div className="feed-row__info">
                        <p className="feed-row__title">{track.title}</p>
                        <p className="feed-row__meta">
                          {track.artist ? (
                            <Link to={`/artists/${track.artist.slug}`}>
                              {track.artist.displayName}
                            </Link>
                          ) : (
                            'Unknown artist'
                          )}
                          {track.album && ` · ${track.album}`}
                          {' · '}
                          <span>{formatDate(track.releasedAt)}</span>
                        </p>
                      </div>
                      <span className="feed-row__side">
                        {formatDuration(track.durationSeconds)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="feed-section" aria-labelledby="feed-gigs-heading">
            <h2 id="feed-gigs-heading">Upcoming gigs</h2>
            {feed.gigs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                No upcoming gigs from artists you follow.
              </p>
            ) : (
              <div className="feed-list" role="list">
                {feed.gigs.map((gig) => (
                  <div key={gig._id} className="feed-row feed-row--gig" role="listitem">
                    <span className="feed-row__date">{formatDate(gig.startsAt)}</span>
                    <div className="feed-row__info">
                      <p className="feed-row__title">{gig.title}</p>
                      <p className="feed-row__meta">
                        {gig.artist ? (
                          <Link to={`/artists/${gig.artist.slug}`}>
                            {gig.artist.displayName}
                          </Link>
                        ) : (
                          'Unknown artist'
                        )}
                        {' · '}
                        {gig.venueName}, {gig.city}, {gig.state}
                      </p>
                    </div>
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
                      <span className="feed-row__side">No tickets yet</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
