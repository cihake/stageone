/**
 * /account/artist — artist self-service dashboard.
 *
 * Two states:
 *   1. No artist profile yet → render the create form.
 *   2. Profile exists → render the editor (text fields + image uploaders).
 *
 * Per spec wireframe B.4 (artist dashboard) — this is the v0.3 shell.
 * Tracks/Gigs/Messages tabs come in subsequent v0.3 sessions.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { GenreTagsInput } from '../components/GenreTagsInput';
import { ImageUploader } from '../components/ImageUploader';
import { ApiError, apiPatch, apiPost } from '../lib/api';
import { useArtist, type Artist, type SocialLinks } from '../hooks/useArtist';
import '../styles/forms.css';
import './artist-dashboard.css';

interface FormState {
  slug: string;
  displayName: string;
  bio: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  socialLinks: SocialLinks;
}

const EMPTY_FORM: FormState = {
  slug: '',
  displayName: '',
  bio: '',
  homeCity: '',
  homeState: '',
  genreTags: [],
  socialLinks: {},
};

function fromArtist(artist: Artist): FormState {
  return {
    slug: artist.slug,
    displayName: artist.displayName,
    bio: artist.bio,
    homeCity: artist.homeCity,
    homeState: artist.homeState,
    genreTags: [...artist.genreTags],
    socialLinks: { ...artist.socialLinks },
  };
}

export function ArtistDashboardPage() {
  const { artist, isLoading, error, refresh, setArtist } = useArtist();

  if (isLoading) {
    return (
      <p role="status" style={{ color: 'var(--text-secondary)' }}>
        Loading artist profile…
      </p>
    );
  }

  if (error) {
    return <p className="form-error-banner">{error}</p>;
  }

  if (!artist) {
    return <CreateArtistForm onCreated={(a) => setArtist(a)} />;
  }

  return (
    <EditArtistForm
      artist={artist}
      onUpdated={(a) => setArtist(a)}
      onImageReplaced={() => void refresh()}
    />
  );
}

// ─── Create flow ──────────────────────────────────────────────────────

function CreateArtistForm({ onCreated }: { onCreated(artist: Artist): void }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      // Drop empty social-link strings so server treats them as unset.
      const cleanedLinks = Object.fromEntries(
        Object.entries(form.socialLinks).filter(([, v]) => v && v.trim()),
      );
      const { artist } = await apiPost<{ artist: Artist }>('/api/artists', {
        ...form,
        slug: form.slug || undefined,
        socialLinks: cleanedLinks,
      });
      onCreated(artist);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not create profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form artist-form" onSubmit={onSubmit} noValidate>
      <h1>Create your artist profile</h1>
      <p>This is what fans will see on your public page.</p>

      {formError && (
        <div className="form-error-banner" role="alert">
          {formError}
        </div>
      )}

      <ProfileFields form={form} onChange={setForm} mode="create" />

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create profile'}
      </button>

      <p className="form-footer">
        Profiles start as <em>pending review</em>. An admin approves before you appear on the
        public Artists page.
      </p>
    </form>
  );
}

// ─── Edit flow ────────────────────────────────────────────────────────

interface EditProps {
  artist: Artist;
  onUpdated(artist: Artist): void;
  onImageReplaced(): void;
}

function EditArtistForm({ artist, onUpdated, onImageReplaced }: EditProps) {
  const [form, setForm] = useState<FormState>(() => fromArtist(artist));
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep form in sync if the artist object is replaced from above
  // (e.g., after an image upload returns the updated artist).
  useEffect(() => {
    setForm(fromArtist(artist));
  }, [artist]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const cleanedLinks = Object.fromEntries(
        Object.entries(form.socialLinks).filter(([, v]) => v && v.trim()),
      );
      const { artist: updated } = await apiPatch<{ artist: Artist }>('/api/artists/me', {
        ...form,
        socialLinks: cleanedLinks,
      });
      onUpdated(updated);
      setSavedAt(new Date());
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="artist-dashboard">
      <header className="artist-dashboard__header">
        <div>
          <h1>{artist.displayName}</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            <code>/artists/{artist.slug}</code> ·{' '}
            {artist.isApproved ? (
              <span style={{ color: 'var(--color-success)' }}>Approved</span>
            ) : (
              <span style={{ color: 'var(--color-danger)' }}>Pending review</span>
            )}{' '}
            · {artist.followerCount} followers
          </p>
        </div>
        {artist.isApproved && (
          <Link to={`/artists/${artist.slug}`} className="btn-link">
            View public page →
          </Link>
        )}
      </header>

      <section className="artist-dashboard__panel">
        <h2>Images</h2>
        <div className="artist-dashboard__uploaders">
          <ImageUploader
            endpoint="/api/artists/me/avatar"
            currentUrl={artist.avatarUrl}
            aspect="square"
            label="Avatar"
            maxSizeMb={5}
            onUploaded={onImageReplaced}
          />
          <ImageUploader
            endpoint="/api/artists/me/cover"
            currentUrl={artist.coverImageUrl}
            aspect="wide"
            label="Cover image"
            maxSizeMb={10}
            onUploaded={onImageReplaced}
          />
        </div>
      </section>

      <form className="artist-dashboard__panel" onSubmit={onSubmit} noValidate>
        <h2>Profile</h2>

        {formError && (
          <div className="form-error-banner" role="alert">
            {formError}
          </div>
        )}

        <ProfileFields form={form} onChange={setForm} mode="edit" />

        <div className="artist-dashboard__footer">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
          {savedAt && (
            <span style={{ color: 'var(--color-success)', fontSize: '0.875rem' }}>
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Shared field block ───────────────────────────────────────────────

interface FieldProps {
  form: FormState;
  onChange(next: FormState): void;
  mode: 'create' | 'edit';
}

function ProfileFields({ form, onChange, mode }: FieldProps) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }
  function setSocial<K extends keyof SocialLinks>(key: K, value: string) {
    onChange({ ...form, socialLinks: { ...form.socialLinks, [key]: value } });
  }

  return (
    <>
      <div className="field">
        <label htmlFor="displayName">Artist name</label>
        <input
          id="displayName"
          type="text"
          required
          maxLength={80}
          value={form.displayName}
          onChange={(e) => set('displayName', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="slug">URL slug{mode === 'create' ? ' (optional)' : ''}</label>
        <input
          id="slug"
          type="text"
          value={form.slug}
          onChange={(e) => set('slug', e.target.value)}
          placeholder={mode === 'create' ? 'auto-generated from name' : ''}
        />
        <span className="help">
          Lowercase letters, digits, and hyphens. Your public page lives at{' '}
          <code>/artists/{form.slug || '…'}</code>.
        </span>
      </div>

      <div className="field">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          rows={5}
          maxLength={2000}
          value={form.bio}
          onChange={(e) => set('bio', e.target.value)}
        />
        <span className="help">{form.bio.length}/2000 characters</span>
      </div>

      <div className="artist-form__row">
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="homeCity">Home city</label>
          <input
            id="homeCity"
            type="text"
            required
            maxLength={80}
            value={form.homeCity}
            onChange={(e) => set('homeCity', e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="homeState">State</label>
          <input
            id="homeState"
            type="text"
            required
            minLength={2}
            maxLength={2}
            value={form.homeState}
            onChange={(e) => set('homeState', e.target.value.toUpperCase())}
            placeholder="PA"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="genres">Genre tags</label>
        <GenreTagsInput
          id="genres"
          value={form.genreTags}
          onChange={(tags) => set('genreTags', tags)}
        />
      </div>

      <details className="artist-form__details">
        <summary>Social links (optional)</summary>
        <div className="field">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="url"
            value={form.socialLinks.website ?? ''}
            onChange={(e) => setSocial('website', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="instagram">Instagram</label>
          <input
            id="instagram"
            type="url"
            value={form.socialLinks.instagram ?? ''}
            onChange={(e) => setSocial('instagram', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="bandcamp">Bandcamp</label>
          <input
            id="bandcamp"
            type="url"
            value={form.socialLinks.bandcamp ?? ''}
            onChange={(e) => setSocial('bandcamp', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="spotify">Spotify</label>
          <input
            id="spotify"
            type="url"
            value={form.socialLinks.spotify ?? ''}
            onChange={(e) => setSocial('spotify', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="youtube">YouTube</label>
          <input
            id="youtube"
            type="url"
            value={form.socialLinks.youtube ?? ''}
            onChange={(e) => setSocial('youtube', e.target.value)}
          />
        </div>
      </details>
    </>
  );
}
