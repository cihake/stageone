/**
 * /artists/:slug — public artist detail page (spec wireframe B.3).
 *
 * Layout:
 *   1. Cover image hero with avatar overlapping the bottom edge.
 *   2. Press-kit band: display name, city + state, genre chips,
 *      follower count, Follow button (stub — v0.3 part 3).
 *   3. Social links strip.
 *   4. About / Bio section.
 *   5. Track list — live CRUD if the viewer is the artist owner.
 *   6. Gigs section — placeholder until Gigs CRUD lands.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useArtist } from '../hooks/useArtist';
import './artists.css';
import './artist-detail.css';
import '../styles/forms.css';

// ─── Types ────────────────────────────────────────────────────────────

interface SocialLinks {
  website?: string;
  instagram?: string;
  spotify?: string;
  bandcamp?: string;
  youtube?: string;
}

interface ArtistDetail {
  _id: string;
  slug: string;
  displayName: string;
  bio: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  socialLinks: SocialLinks;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  followerCount: number;
  isFeatured: boolean;
  isApproved: boolean;
}

interface Track {
  _id: string;
  title: string;
  album: string | null;
  durationSeconds: number;
  genreTags: string[];
  audioUrl: string;
  coverArtUrl: string | null;
  description: string;
  isPublished: boolean;
  releasedAt: string;
}

interface TrackListResponse {
  items: Track[];
  nextCursor: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Track form ───────────────────────────────────────────────────────

interface TrackFormData {
  title: string;
  album: string;
  durationSeconds: string;
  audioUrl: string;
  description: string;
  isPublished: boolean;
}

const EMPTY_TRACK_FORM: TrackFormData = {
  title: '',
  album: '',
  durationSeconds: '',
  audioUrl: '',
  description: '',
  isPublished: false,
};

function fromTrack(t: Track): TrackFormData {
  return {
    title: t.title,
    album: t.album ?? '',
    durationSeconds: String(t.durationSeconds),
    audioUrl: t.audioUrl,
    description: t.description,
    isPublished: t.isPublished,
  };
}

interface TrackFormProps {
  slug: string;
  editing: Track | null;
  onSaved(track: Track): void;
  onCancel(): void;
}

function TrackForm({ slug, editing, onSaved, onCancel }: TrackFormProps) {
  const [form, setForm] = useState<TrackFormData>(
    editing ? fromTrack(editing) : EMPTY_TRACK_FORM,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function set<K extends keyof TrackFormData>(key: K, value: TrackFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    const payload = {
      title: form.title,
      album: form.album || null,
      durationSeconds: parseInt(form.durationSeconds, 10),
      audioUrl: form.audioUrl,
      description: form.description,
      isPublished: form.isPublished,
    };
    try {
      if (editing) {
        const { track } = await apiPatch<{ track: Track }>(
          `/api/artists/${slug}/tracks/${editing._id}`,
          payload,
        );
        onSaved(track);
      } else {
        const { track } = await apiPost<{ track: Track }>(
          `/api/artists/${slug}/tracks`,
          payload,
        );
        onSaved(track);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save track');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="track-form" onSubmit={onSubmit} noValidate>
      {formError && (
        <div className="form-error-banner track-form__full" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="track-title">Title *</label>
        <input
          id="track-title"
          type="text"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="track-album">Album</label>
        <input
          id="track-album"
          type="text"
          maxLength={120}
          value={form.album}
          onChange={(e) => set('album', e.target.value)}
          placeholder="optional"
        />
      </div>

      <div className="field">
        <label htmlFor="track-duration">Duration (seconds) *</label>
        <input
          id="track-duration"
          type="number"
          required
          min={1}
          max={3600}
          value={form.durationSeconds}
          onChange={(e) => set('durationSeconds', e.target.value)}
          placeholder="e.g. 213"
        />
      </div>

      <div className="field">
        <label htmlFor="track-audio">Audio URL *</label>
        <input
          id="track-audio"
          type="url"
          required
          value={form.audioUrl}
          onChange={(e) => set('audioUrl', e.target.value)}
          placeholder="https://…"
        />
        <span className="help">Link to SoundCloud, Bandcamp, or any public audio URL.</span>
      </div>

      <div className="field track-form__full">
        <label htmlFor="track-desc">Description</label>
        <textarea
          id="track-desc"
          rows={3}
          maxLength={1000}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      <div className="field track-form__full">
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => set('isPublished', e.target.checked)}
          />
          Published (visible to fans)
        </label>
      </div>

      <div className="track-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add track'}
        </button>
      </div>
    </form>
  );
}

// ─── Track list section ───────────────────────────────────────────────

interface TrackListSectionProps {
  slug: string;
  isOwner: boolean;
}

function TrackListSection({ slug, isOwner }: TrackListSectionProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<TrackListResponse>(
        `/api/artists/${slug}/tracks?limit=50`,
      );
      setTracks(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  function handleSaved(track: Track) {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t._id === track._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = track;
        return next;
      }
      return [track, ...prev];
    });
    setShowForm(false);
    setEditingTrack(null);
  }

  async function handleDelete(trackId: string) {
    if (!confirm('Delete this track? This cannot be undone.')) return;
    setDeletingId(trackId);
    try {
      await apiDelete(`/api/artists/${slug}/tracks/${trackId}`);
      setTracks((prev) => prev.filter((t) => t._id !== trackId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete track');
    } finally {
      setDeletingId(null);
    }
  }

  const visibleTracks = isOwner ? tracks : tracks.filter((t) => t.isPublished);

  return (
    <section className="artist-detail__section" aria-labelledby="tracks-heading">
      <h2 id="tracks-heading">
        Tracks
        {isOwner && !showForm && !editingTrack && (
          <button
            type="button"
            className="btn-secondary"
            style={{ float: 'right', fontSize: '0.875rem', padding: 'var(--space-2) var(--space-4)' }}
            onClick={() => setShowForm(true)}
          >
            + Add track
          </button>
        )}
      </h2>

      {error && (
        <p className="form-error-banner" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="placeholder-section">Loading tracks…</p>
      ) : visibleTracks.length === 0 && !showForm ? (
        <p className="placeholder-section">
          {isOwner ? 'No tracks yet. Add your first track above.' : 'No tracks yet.'}
        </p>
      ) : (
        <div className="track-list" role="list">
          {visibleTracks.map((track, idx) => (
            <div key={track._id} className="track-row" role="listitem">
              <span className="track-row__num">{idx + 1}</span>
              <div className="track-row__info">
                <span className="track-row__title">
                  {track.title}
                  {isOwner && !track.isPublished && (
                    <span
                      style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}
                    >
                      (draft)
                    </span>
                  )}
                </span>
                {track.album && (
                  <span className="track-row__album">{track.album}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="track-row__duration">
                  {formatDuration(track.durationSeconds)}
                </span>
                {isOwner && (
                  <div className="track-row__actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTrack(track);
                        setShowForm(false);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      disabled={deletingId === track._id}
                      onClick={() => void handleDelete(track._id)}
                    >
                      {deletingId === track._id ? '…' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <TrackForm
          slug={slug}
          editing={null}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form */}
      {editingTrack && (
        <TrackForm
          slug={slug}
          editing={editingTrack}
          onSaved={handleSaved}
          onCancel={() => setEditingTrack(null)}
        />
      )}
    </section>
  );
}

// ─── Social links strip ───────────────────────────────────────────────

const SOCIAL_LABELS: Record<string, string> = {
  website: '🌐 Website',
  instagram: '📷 Instagram',
  spotify: '🎵 Spotify',
  bandcamp: '🎸 Bandcamp',
  youtube: '▶️ YouTube',
};

function SocialLinks({ links }: { links: SocialLinks }) {
  const entries = Object.entries(links).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div className="artist-detail__socials" aria-label="Social links">
      {entries.map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="artist-detail__social-link"
        >
          {SOCIAL_LABELS[key] ?? key}
        </a>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export function ArtistDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const { artist: myArtist } = useArtist(); // may be null / loading

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    apiGet<{ artist: ArtistDetail }>(`/api/artists/${slug}`)
      .then(({ artist: a }) => setArtist(a))
      .catch((err) => {
        const msg =
          err instanceof ApiError && err.status === 404
            ? 'Artist not found.'
            : err instanceof Error
              ? err.message
              : 'Failed to load artist';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <p role="status" style={{ color: 'var(--text-secondary)' }}>
        Loading…
      </p>
    );
  }

  if (error || !artist) {
    return (
      <div>
        <p className="form-error-banner">{error ?? 'Artist not found.'}</p>
        <Link to="/artists" className="btn-link" style={{ marginTop: 'var(--space-4)', display: 'inline-block' }}>
          ← Back to Artists
        </Link>
      </div>
    );
  }

  // Determine if the logged-in user is the owner of this artist profile.
  const isOwner = isAuthenticated && myArtist?.slug === artist.slug;

  return (
    <article aria-label={`${artist.displayName} artist page`}>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="artist-detail__hero">
        {artist.coverImageUrl ? (
          <img
            src={artist.coverImageUrl}
            alt={`${artist.displayName} cover`}
            className="artist-detail__cover"
          />
        ) : (
          <div className="artist-detail__cover-placeholder" aria-hidden="true" />
        )}

        <div className="artist-detail__avatar-wrap">
          {artist.avatarUrl ? (
            <img
              src={artist.avatarUrl}
              alt={`${artist.displayName} avatar`}
              className="artist-detail__avatar"
            />
          ) : (
            <div className="artist-detail__avatar-placeholder" aria-hidden="true">
              {initials(artist.displayName)}
            </div>
          )}
        </div>
      </div>

      {/* ── Press-kit band ─────────────────────────────────────────── */}
      <div className="artist-detail__presskit">
        <div className="artist-detail__presskit-left">
          <h1 className="artist-detail__name">{artist.displayName}</h1>

          <div className="artist-detail__meta">
            <span>
              {artist.homeCity}, {artist.homeState}
            </span>
            {artist.genreTags.length > 0 && (
              <>
                <span className="artist-detail__meta-sep" aria-hidden="true">·</span>
                <div className="artist-detail__genres" aria-label="Genres">
                  {artist.genreTags.map((g) => (
                    <span key={g} className="genre-chip">
                      {g}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="artist-detail__presskit-right">
          <div className="artist-detail__followers">
            <strong>{artist.followerCount.toLocaleString()}</strong>
            followers
          </div>
          {isOwner ? (
            <Link to="/account/artist" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Edit profile
            </Link>
          ) : (
            <button
              type="button"
              className="btn-follow"
              disabled={!isAuthenticated}
              title={isAuthenticated ? 'Follow this artist' : 'Sign in to follow artists'}
              onClick={() => {
                // Follow logic comes in v0.3 part 3
                alert('Follow functionality coming soon!');
              }}
            >
              Follow
            </button>
          )}
        </div>
      </div>

      {/* ── Social links ────────────────────────────────────────────── */}
      <SocialLinks links={artist.socialLinks} />

      {/* ── Bio ─────────────────────────────────────────────────────── */}
      {artist.bio && (
        <section className="artist-detail__section" aria-labelledby="bio-heading">
          <h2 id="bio-heading">About</h2>
          <p className="artist-detail__bio">{artist.bio}</p>
        </section>
      )}

      {/* ── Tracks ──────────────────────────────────────────────────── */}
      {slug && <TrackListSection slug={slug} isOwner={isOwner} />}

      {/* ── Gigs (placeholder) ──────────────────────────────────────── */}
      <section className="artist-detail__section" aria-labelledby="gigs-heading">
        <h2 id="gigs-heading">Upcoming Gigs</h2>
        <p className="placeholder-section">
          Gig listings coming soon.
        </p>
      </section>
    </article>
  );
}
