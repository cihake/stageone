/**
 * useArtist — fetches the authenticated user's Artist profile (or null
 * if they haven't created one yet). Wraps GET /api/artists/me.
 *
 * Returns refresh() so callers can force a re-fetch after a mutation
 * (create / update / image upload).
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet } from '../lib/api';

export type SocialLinks = {
  website?: string;
  instagram?: string;
  spotify?: string;
  bandcamp?: string;
  youtube?: string;
};

export interface Artist {
  _id: string;
  userId: string;
  slug: string;
  displayName: string;
  bio: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  socialLinks: SocialLinks;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  pressKitUrl: string | null;
  isApproved: boolean;
  isFeatured: boolean;
  followerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MeResponse {
  artist: Artist | null;
}

export interface UseArtistResult {
  artist: Artist | null;
  isLoading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  setArtist(next: Artist | null): void;
}

export function useArtist(): UseArtistResult {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { artist: fetched } = await apiGet<MeResponse>('/api/artists/me');
      setArtist(fetched);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setArtist(null);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to load artist profile';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { artist, isLoading, error, refresh, setArtist };
}
