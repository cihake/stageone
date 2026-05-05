/**
 * /artists/:slug — public artist detail page (spec wireframe B.3).
 *
 * Sections:
 *   1. Cover hero + overlapping avatar
 *   2. Press-kit band: name, city, genres, follower count, Follow toggle
 *   3. Social links
 *   4. About/Bio
 *   5. Tracks (live CRUD for owner)
 *   6. Upcoming Gigs (live CRUD for owner)
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useArtist } from '../hooks/useArtist';
import './artists.css';
import './artist-detail.css';
import './gigs.css';
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
  audioUrl: string;
  description: string;
  isPublished: boolean;
  releasedAt: string;
}

interface Gig {
  _id: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startsAt: string;
  ticketUrl: string | null;
  ticketPriceCents: number | null;
  status: 'scheduled' | 'cancelled' | 'postponed';
  isPublished: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatGigDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatPrice(cents: number | null): string {
  if (cents === null) return '';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Social links ─────────────────────────────────────────────────────

const SOCIAL_LABELS: Record<string, string> = {
  website: '🌐 Website',
  instagram: '📷 Instagram',
  spotify: '🎵 Spotify',
  bandcamp: '🎸 Bandcamp',
  youtube: '▶️ YouTube',
};

function SocialLinksStrip({ links }: { links: SocialLinks }) {
  const entries = Object.entries(links).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div className="artist-detail__socials" aria-label="Social links">
      {entries.map(([key, url]) => (
        <a key={key} href={url} target="_blank" rel="noopener noreferrer"
          className="artist-detail__social-link">
          {SOCIAL_LABELS[key] ?? key}
        </a>
      ))}
    </div>
  );
}

// ─── Track form ───────────────────────────────────────────────────────

interface TrackFormData {
  title: string; album: string; durationSeconds: string;
  audioUrl: string; description: string; isPublished: boolean;
}
const EMPTY_TRACK: TrackFormData = {
  title: '', album: '', durationSeconds: '', audioUrl: '', description: '', isPublished: false,
};
function fromTrack(t: Track): TrackFormData {
  return { title: t.title, album: t.album ?? '', durationSeconds: String(t.durationSeconds),
    audioUrl: t.audioUrl, description: t.description, isPublished: t.isPublished };
}

function TrackForm({ slug, editing, onSaved, onCancel }:
  { slug: string; editing: Track | null; onSaved(t: Track): void; onCancel(): void }) {
  const [form, setForm] = useState<TrackFormData>(editing ? fromTrack(editing) : EMPTY_TRACK);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  function set<K extends keyof TrackFormData>(k: K, v: TrackFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setFormError(null); setIsSaving(true);
    const payload = { title: form.title, album: form.album || null,
      durationSeconds: parseInt(form.durationSeconds, 10), audioUrl: form.audioUrl,
      description: form.description, isPublished: form.isPublished };
    try {
      if (editing) {
        const { track } = await apiPatch<{ track: Track }>(`/api/artists/${slug}/tracks/${editing._id}`, payload);
        onSaved(track);
      } else {
        const { track } = await apiPost<{ track: Track }>(`/api/artists/${slug}/tracks`, payload);
        onSaved(track);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save track');
    } finally { setIsSaving(false); }
  }
  return (
    <form className="track-form" onSubmit={onSubmit} noValidate>
      {formError && <div className="form-error-banner track-form__full" role="alert">{formError}</div>}
      <div className="field"><label htmlFor="t-title">Title *</label>
        <input id="t-title" type="text" required maxLength={120} value={form.title}
          onChange={(e) => set('title', e.target.value)} /></div>
      <div className="field"><label htmlFor="t-album">Album</label>
        <input id="t-album" type="text" maxLength={120} value={form.album}
          onChange={(e) => set('album', e.target.value)} placeholder="optional" /></div>
      <div className="field"><label htmlFor="t-dur">Duration (seconds) *</label>
        <input id="t-dur" type="number" required min={1} max={3600} value={form.durationSeconds}
          onChange={(e) => set('durationSeconds', e.target.value)} /></div>
      <div className="field"><label htmlFor="t-url">Audio URL *</label>
        <input id="t-url" type="url" required value={form.audioUrl}
          onChange={(e) => set('audioUrl', e.target.value)} />
        <span className="help">SoundCloud, Bandcamp, or any public audio URL.</span></div>
      <div className="field track-form__full"><label htmlFor="t-desc">Description</label>
        <textarea id="t-desc" rows={3} maxLength={1000} value={form.description}
          onChange={(e) => set('description', e.target.value)} /></div>
      <div className="field track-form__full">
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isPublished}
            onChange={(e) => set('isPublished', e.target.checked)} />
          Published (visible to fans)
        </label></div>
      <div className="track-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add track'}
        </button>
      </div>
    </form>
  );
}

// ─── Track list section ───────────────────────────────────────────────

function TrackListSection({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<{ items: Track[] }>(`/api/artists/${slug}/tracks?limit=50`);
      setTracks(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracks');
    } finally { setIsLoading(false); }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  function handleSaved(track: Track) {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t._id === track._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = track; return n; }
      return [track, ...prev];
    });
    setShowForm(false); setEditingTrack(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this track?')) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/artists/${slug}/tracks/${id}`);
      setTracks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to delete'); }
    finally { setDeletingId(null); }
  }

  const visible = isOwner ? tracks : tracks.filter((t) => t.isPublished);

  return (
    <section className="artist-detail__section" aria-labelledby="tracks-h">
      <h2 id="tracks-h">
        Tracks
        {isOwner && !showForm && !editingTrack && (
          <button type="button" className="btn-secondary"
            style={{ float: 'right', fontSize: '0.875rem', padding: 'var(--space-2) var(--space-4)' }}
            onClick={() => setShowForm(true)}>+ Add track</button>
        )}
      </h2>
      {error && <p className="form-error-banner">{error}</p>}
      {isLoading ? <p className="placeholder-section">Loading…</p>
        : visible.length === 0 && !showForm ? (
          <p className="placeholder-section">
            {isOwner ? 'No tracks yet. Add your first track above.' : 'No tracks yet.'}
          </p>
        ) : (
          <div className="track-list" role="list">
            {visible.map((track, idx) => (
              <div key={track._id} className="track-row" role="listitem">
                <span className="track-row__num">{idx + 1}</span>
                <div className="track-row__info">
                  <span className="track-row__title">
                    {track.title}
                    {isOwner && !track.isPublished && (
                      <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>(draft)</span>
                    )}
                  </span>
                  {track.album && <span className="track-row__album">{track.album}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="track-row__duration">{formatDuration(track.durationSeconds)}</span>
                  {isOwner && (
                    <div className="track-row__actions">
                      <button type="button" onClick={() => { setEditingTrack(track); setShowForm(false); }}>Edit</button>
                      <button type="button" className="danger" disabled={deletingId === track._id}
                        onClick={() => void handleDelete(track._id)}>
                        {deletingId === track._id ? '…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      {showForm && <TrackForm slug={slug} editing={null} onSaved={handleSaved} onCancel={() => setShowForm(false)} />}
      {editingTrack && <TrackForm slug={slug} editing={editingTrack} onSaved={handleSaved} onCancel={() => setEditingTrack(null)} />}
    </section>
  );
}

// ─── Gig form ─────────────────────────────────────────────────────────

interface GigFormData {
  title: string; venueName: string; city: string; state: string;
  startsAt: string; ticketUrl: string; ticketPriceCents: string;
  description: string; isPublished: boolean;
}
const EMPTY_GIG: GigFormData = {
  title: '', venueName: '', city: '', state: '',
  startsAt: '', ticketUrl: '', ticketPriceCents: '', description: '', isPublished: true,
};
function fromGig(g: Gig): GigFormData {
  return { title: g.title, venueName: g.venueName, city: g.city, state: g.state,
    startsAt: g.startsAt.slice(0, 16), ticketUrl: g.ticketUrl ?? '',
    ticketPriceCents: g.ticketPriceCents !== null ? String(g.ticketPriceCents) : '',
    description: '', isPublished: g.isPublished };
}

function GigForm({ slug, editing, onSaved, onCancel }:
  { slug: string; editing: Gig | null; onSaved(g: Gig): void; onCancel(): void }) {
  const [form, setForm] = useState<GigFormData>(editing ? fromGig(editing) : EMPTY_GIG);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  function set<K extends keyof GigFormData>(k: K, v: GigFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setFormError(null); setIsSaving(true);
    const payload = {
      title: form.title, venueName: form.venueName, city: form.city,
      state: form.state.toUpperCase(), startsAt: form.startsAt,
      ticketUrl: form.ticketUrl || null,
      ticketPriceCents: form.ticketPriceCents !== '' ? parseInt(form.ticketPriceCents, 10) : null,
      description: form.description, isPublished: form.isPublished,
    };
    try {
      if (editing) {
        const { gig } = await apiPatch<{ gig: Gig }>(`/api/artists/${slug}/gigs/${editing._id}`, payload);
        onSaved(gig);
      } else {
        const { gig } = await apiPost<{ gig: Gig }>(`/api/artists/${slug}/gigs`, payload);
        onSaved(gig);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save gig');
    } finally { setIsSaving(false); }
  }
  return (
    <form className="track-form" onSubmit={onSubmit} noValidate>
      {formError && <div className="form-error-banner track-form__full" role="alert">{formError}</div>}
      <div className="field track-form__full"><label htmlFor="g-title">Title *</label>
        <input id="g-title" type="text" required maxLength={140} value={form.title}
          onChange={(e) => set('title', e.target.value)} /></div>
      <div className="field track-form__full"><label htmlFor="g-venue">Venue *</label>
        <input id="g-venue" type="text" required maxLength={120} value={form.venueName}
          onChange={(e) => set('venueName', e.target.value)} /></div>
      <div className="field" style={{ flex: 2 }}><label htmlFor="g-city">City *</label>
        <input id="g-city" type="text" required maxLength={80} value={form.city}
          onChange={(e) => set('city', e.target.value)} /></div>
      <div className="field"><label htmlFor="g-state">State *</label>
        <input id="g-state" type="text" required minLength={2} maxLength={2} value={form.state}
          onChange={(e) => set('state', e.target.value.toUpperCase())} placeholder="PA" /></div>
      <div className="field"><label htmlFor="g-starts">Date &amp; Time *</label>
        <input id="g-starts" type="datetime-local" required value={form.startsAt}
          onChange={(e) => set('startsAt', e.target.value)} /></div>
      <div className="field"><label htmlFor="g-ticket">Ticket URL</label>
        <input id="g-ticket" type="url" value={form.ticketUrl}
          onChange={(e) => set('ticketUrl', e.target.value)} placeholder="https://…" /></div>
      <div className="field"><label htmlFor="g-price">Price (cents, 0 = free)</label>
        <input id="g-price" type="number" min={0} value={form.ticketPriceCents}
          onChange={(e) => set('ticketPriceCents', e.target.value)} placeholder="e.g. 1500 = $15" /></div>
      <div className="field track-form__full">
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isPublished}
            onChange={(e) => set('isPublished', e.target.checked)} />
          Published (visible on Gigs page)
        </label></div>
      <div className="track-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add gig'}
        </button>
      </div>
    </form>
  );
}

// ─── Gig list section ─────────────────────────────────────────────────

function GigListSection({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<{ items: Gig[] }>(`/api/artists/${slug}/gigs`);
      setGigs(data.items);
    } catch { /* silently ignore */ }
    finally { setIsLoading(false); }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  function handleSaved(gig: Gig) {
    setGigs((prev) => {
      const idx = prev.findIndex((g) => g._id === gig._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = gig; return n; }
      return [...prev, gig].sort((a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    });
    setShowForm(false); setEditingGig(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this gig?')) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/artists/${slug}/gigs/${id}`);
      setGigs((prev) => prev.filter((g) => g._id !== id));
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
    finally { setDeletingId(null); }
  }

  const visible = isOwner ? gigs : gigs.filter((g) => g.isPublished);

  return (
    <section className="artist-detail__section" aria-labelledby="gigs-h">
      <h2 id="gigs-h">
        Upcoming Gigs
        {isOwner && !showForm && !editingGig && (
          <button type="button" className="btn-secondary"
            style={{ float: 'right', fontSize: '0.875rem', padding: 'var(--space-2) var(--space-4)' }}
            onClick={() => setShowForm(true)}>+ Add gig</button>
        )}
      </h2>

      {isLoading ? <p className="placeholder-section">Loading…</p>
        : visible.length === 0 && !showForm ? (
          <p className="placeholder-section">
            {isOwner ? 'No gigs yet. Add one above.' : 'No upcoming gigs.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {visible.map((gig) => (
              <div key={gig._id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)',
                padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-default)',
                alignItems: 'start',
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {gig.title}
                    {isOwner && !gig.isPublished && (
                      <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>(draft)</span>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {gig.venueName} · {gig.city}, {gig.state}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>
                    {formatGigDate(gig.startsAt)}
                    {gig.ticketPriceCents !== null && ` · ${formatPrice(gig.ticketPriceCents)}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {gig.ticketUrl && (
                    <a href={gig.ticketUrl} target="_blank" rel="noopener noreferrer"
                      className="btn-ticket" style={{ fontSize: 'var(--fs-caption)' }}>
                      Tickets →
                    </a>
                  )}
                  {isOwner && (
                    <div className="track-row__actions">
                      <button type="button" onClick={() => { setEditingGig(gig); setShowForm(false); }}>Edit</button>
                      <button type="button" className="danger" disabled={deletingId === gig._id}
                        onClick={() => void handleDelete(gig._id)}>
                        {deletingId === gig._id ? '…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      {showForm && <GigForm slug={slug} editing={null} onSaved={handleSaved} onCancel={() => setShowForm(false)} />}
      {editingGig && <GigForm slug={slug} editing={editingGig} onSaved={handleSaved} onCancel={() => setEditingGig(null)} />}
    </section>
  );
}

// ─── Follow button ────────────────────────────────────────────────────

function FollowButton({ artistId, initialCount, isAuthenticated }:
  { artistId: string; initialCount: number; isAuthenticated: boolean }) {
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || checked) return;
    setChecked(true);
    apiGet<{ isFollowing: boolean; followerCount: number }>(`/api/follow/${artistId}`)
      .then(({ isFollowing: f, followerCount: c }) => { setIsFollowing(f); setCount(c); })
      .catch(() => setIsFollowing(false));
  }, [artistId, isAuthenticated, checked]);

  async function toggle() {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      if (isFollowing) {
        const res = await apiDelete<{ followerCount: number }>(`/api/follow/${artistId}`);
        setIsFollowing(false);
        setCount(res.followerCount);
      } else {
        const res = await apiPost<{ followerCount: number }>('/api/follow', { artistId });
        setIsFollowing(true);
        setCount(res.followerCount);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update follow');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="artist-detail__presskit-right">
      <div className="artist-detail__followers">
        <strong>{count.toLocaleString()}</strong>
        followers
      </div>
      {isAuthenticated ? (
        <button type="button" className="btn-follow"
          disabled={isLoading || isFollowing === null}
          onClick={() => void toggle()}
          style={isFollowing ? { background: 'var(--bg-surface)', color: 'var(--brand)', border: '1px solid var(--brand)' } : {}}>
          {isLoading ? '…' : isFollowing ? 'Following ✓' : 'Follow'}
        </button>
      ) : (
        <Link to="/account/sign-in" className="btn-follow" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          Follow
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export function ArtistDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const { artist: myArtist } = useArtist();

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true); setError(null);
    apiGet<{ artist: ArtistDetail }>(`/api/artists/${slug}`)
      .then(({ artist: a }) => setArtist(a))
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404
          ? 'Artist not found.'
          : err instanceof Error ? err.message : 'Failed to load artist');
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) return <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading…</p>;
  if (error || !artist) return (
    <div>
      <p className="form-error-banner">{error ?? 'Artist not found.'}</p>
      <Link to="/artists" className="btn-link" style={{ marginTop: 'var(--space-4)', display: 'inline-block' }}>← Back to Artists</Link>
    </div>
  );

  const isOwner = isAuthenticated && myArtist?.slug === artist.slug;

  return (
    <article aria-label={`${artist.displayName} artist page`}>
      {/* Hero */}
      <div className="artist-detail__hero">
        {artist.coverImageUrl
          ? <img src={artist.coverImageUrl} alt={`${artist.displayName} cover`} className="artist-detail__cover" />
          : <div className="artist-detail__cover-placeholder" aria-hidden="true" />}
        <div className="artist-detail__avatar-wrap">
          {artist.avatarUrl
            ? <img src={artist.avatarUrl} alt={`${artist.displayName} avatar`} className="artist-detail__avatar" />
            : <div className="artist-detail__avatar-placeholder" aria-hidden="true">{initials(artist.displayName)}</div>}
        </div>
      </div>

      {/* Press-kit band */}
      <div className="artist-detail__presskit">
        <div className="artist-detail__presskit-left">
          <h1 className="artist-detail__name">{artist.displayName}</h1>
          <div className="artist-detail__meta">
            <span>{artist.homeCity}, {artist.homeState}</span>
            {artist.genreTags.length > 0 && (
              <>
                <span className="artist-detail__meta-sep" aria-hidden="true">·</span>
                <div className="artist-detail__genres" aria-label="Genres">
                  {artist.genreTags.map((g) => <span key={g} className="genre-chip">{g}</span>)}
                </div>
              </>
            )}
          </div>
        </div>

        {isOwner ? (
          <div className="artist-detail__presskit-right">
            <div className="artist-detail__followers">
              <strong>{artist.followerCount.toLocaleString()}</strong>followers
            </div>
            <Link to="/account/artist" className="btn-secondary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Edit profile
            </Link>
          </div>
        ) : (
          <FollowButton
            artistId={artist._id}
            initialCount={artist.followerCount}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>

      {/* Socials */}
      <SocialLinksStrip links={artist.socialLinks} />

      {/* Bio */}
      {artist.bio && (
        <section className="artist-detail__section" aria-labelledby="bio-h">
          <h2 id="bio-h">About</h2>
          <p className="artist-detail__bio">{artist.bio}</p>
        </section>
      )}

      {/* Tracks */}
      {slug && <TrackListSection slug={slug} isOwner={isOwner} />}

      {/* Gigs */}
      {slug && <GigListSection slug={slug} isOwner={isOwner} />}
    </article>
  );
}
