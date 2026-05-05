/**
 * ImageUploader — file picker + preview + multipart POST.
 *
 * Talks to a server endpoint that accepts a single file under field name
 * "image" (the convention our /api/artists/me/avatar and /cover routes
 * follow). On success, calls onUploaded with the new URL.
 *
 * Renders a circular preview for avatars, a wide preview for covers —
 * controlled by the `aspect` prop.
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError } from '../lib/api';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

interface Props {
  endpoint: string; // e.g., '/api/artists/me/avatar'
  currentUrl: string | null;
  aspect: 'square' | 'wide';
  label: string;
  maxSizeMb: number;
  onUploaded(payload: { url: string }): void;
}

export function ImageUploader({
  endpoint,
  currentUrl,
  aspect,
  label,
  maxSizeMb,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = preview ?? currentUrl;

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File is too large (max ${maxSizeMb} MB).`);
      event.target.value = '';
      return;
    }

    // Local preview while the upload is in flight.
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: unknown }).message)
            : `Upload failed: ${res.status}`;
        throw new ApiError(res.status, message, body);
      }

      const url =
        body && typeof body === 'object' && 'avatarUrl' in body
          ? String((body as { avatarUrl: string }).avatarUrl)
          : body && typeof body === 'object' && 'coverImageUrl' in body
            ? String((body as { coverImageUrl: string }).coverImageUrl)
            : null;

      if (!url) throw new Error('Server did not return an image URL');
      onUploaded({ url });
      URL.revokeObjectURL(localPreview);
      setPreview(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      URL.revokeObjectURL(localPreview);
      setPreview(null);
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = ''; // allow re-picking same file
    }
  }

  const previewClass =
    aspect === 'square' ? 'image-uploader__preview--square' : 'image-uploader__preview--wide';

  return (
    <div className="image-uploader">
      <label className="field">
        <span>{label}</span>
        <div className={`image-uploader__preview ${previewClass}`}>
          {display ? (
            <img src={display} alt="" />
          ) : (
            <span className="image-uploader__placeholder">No image yet</span>
          )}
          {isUploading && <div className="image-uploader__overlay">Uploading…</div>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          onChange={onPick}
          disabled={isUploading}
        />
        <span className="help">PNG / JPG / WebP / AVIF, up to {maxSizeMb} MB.</span>
        {error && <span className="error">{error}</span>}
      </label>
    </div>
  );
}
