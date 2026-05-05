/**
 * Thin fetch wrapper for talking to the StageOne API.
 *
 * In dev, VITE_API_URL is empty and Vite proxies /api/* to the Express server
 * at localhost:4000 (see vite.config.ts). In staging/production the env var
 * holds the full origin of the deployed API.
 *
 * Auto-refresh: when an authenticated request returns 401, we transparently
 * call POST /api/auth/refresh once and replay the original request. This
 * keeps the 15-minute access-token expiry invisible to users for as long as
 * their refresh token (7 days) is still valid.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

interface ApiFetchOptions extends RequestInit {
  /** When true, skip the auto-refresh-on-401 retry. Used by /auth routes. */
  skipAuthRefresh?: boolean;
}

// Single in-flight refresh promise so concurrent 401s don't trigger N refresh
// calls. The first 401 kicks off /refresh, all others await the same promise.
let inflightRefresh: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Allow the next 401 to trigger another refresh attempt later.
        setTimeout(() => {
          inflightRefresh = null;
        }, 0);
      }
    })();
  }
  return inflightRefresh;
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    credentials: 'include',
  });
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { skipAuthRefresh, ...fetchInit } = init;

  let res = await rawFetch(path, fetchInit);

  // If the access token expired, try one transparent refresh + retry.
  if (res.status === 401 && !skipAuthRefresh && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await rawFetch(path, fetchInit);
    }
  }

  const contentType = res.headers.get('content-type') ?? '';
  const body: unknown =
    res.status === 204
      ? null
      : contentType.includes('application/json')
        ? await res.json()
        : await res.text();

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Request failed: ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  return body as T;
}

// ─── Convenience wrappers ─────────────────────────────────────────────

export function apiGet<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...init, method: 'GET' });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  init: ApiFetchOptions = {},
): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
