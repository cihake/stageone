/**
 * Real AuthContext — replaces the v0.1 stub.
 *
 * Bootstraps on mount by calling GET /api/auth/me. If the user has a valid
 * httpOnly cookie from a previous visit, they're transparently logged back
 * in. Otherwise we settle into the unauthenticated state.
 *
 * Talks to the auth backend at:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useMemo,
  type ReactNode,
} from 'react';
import { apiGet, apiPost, ApiError } from '../lib/api';

export type UserRole = 'fan' | 'artist' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: 'fan' | 'artist';
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true during the initial /me bootstrap
  isSubmitting: boolean; // true during a signIn/signUp/signOut call
  signIn(input: SignInInput): Promise<void>;
  signUp(input: RegisterInput): Promise<void>;
  signOut(): Promise<void>;
  refreshUser(): Promise<void>; // re-fetch /me; useful after profile edits
}

// ─── Reducer ──────────────────────────────────────────────────────────

type State = {
  user: AuthUser | null;
  isLoading: boolean;
  isSubmitting: boolean;
};

type Action =
  | { type: 'bootstrap/start' }
  | { type: 'bootstrap/done'; user: AuthUser | null }
  | { type: 'submit/start' }
  | { type: 'submit/done'; user: AuthUser | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'bootstrap/start':
      return { ...state, isLoading: true };
    case 'bootstrap/done':
      return { user: action.user, isLoading: false, isSubmitting: false };
    case 'submit/start':
      return { ...state, isSubmitting: true };
    case 'submit/done':
      return { ...state, user: action.user, isSubmitting: false };
    default:
      return state;
  }
}

const initialState: State = {
  user: null,
  isLoading: true,
  isSubmitting: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────

interface MeResponse {
  user: AuthUser & {
    bio?: string | null;
    avatarUrl?: string | null;
    emailVerified?: boolean;
    lastLoginAt?: string | null;
  };
}

interface AuthResponse {
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Initial bootstrap: do we have a live session already?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: 'bootstrap/start' });
      try {
        const { user } = await apiGet<MeResponse>('/api/auth/me');
        if (!cancelled) {
          dispatch({
            type: 'bootstrap/done',
            user: {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              role: user.role,
            },
          });
        }
      } catch {
        // 401 = no live session. That's expected — proceed unauthenticated.
        if (!cancelled) dispatch({ type: 'bootstrap/done', user: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (input: SignInInput): Promise<void> => {
      dispatch({ type: 'submit/start' });
      try {
        const { user } = await apiPost<AuthResponse>('/api/auth/login', input, {
          skipAuthRefresh: true,
        });
        dispatch({ type: 'submit/done', user });
      } catch (err) {
        dispatch({ type: 'submit/done', user: state.user });
        throw err;
      }
    },
    [state.user],
  );

  const signUp = useCallback(
    async (input: RegisterInput): Promise<void> => {
      dispatch({ type: 'submit/start' });
      try {
        const { user } = await apiPost<AuthResponse>('/api/auth/register', input, {
          skipAuthRefresh: true,
        });
        dispatch({ type: 'submit/done', user });
      } catch (err) {
        dispatch({ type: 'submit/done', user: state.user });
        throw err;
      }
    },
    [state.user],
  );

  const signOut = useCallback(async (): Promise<void> => {
    dispatch({ type: 'submit/start' });
    try {
      await apiPost<null>('/api/auth/logout', undefined, { skipAuthRefresh: true });
    } catch (err) {
      // Even if the server call fails, clear the client-side user — the
      // cookies will time out on their own. Surface non-network errors only.
      if (err instanceof ApiError && err.status >= 500) {
        dispatch({ type: 'submit/done', user: state.user });
        throw err;
      }
    }
    dispatch({ type: 'submit/done', user: null });
  }, [state.user]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const { user } = await apiGet<MeResponse>('/api/auth/me');
      dispatch({
        type: 'submit/done',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
      });
    } catch {
      dispatch({ type: 'submit/done', user: null });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      isAuthenticated: state.user !== null,
      isLoading: state.isLoading,
      isSubmitting: state.isSubmitting,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [state, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}
