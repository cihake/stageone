/**
 * ProtectedRoute — redirects unauthenticated users to /account/sign-in
 * with a `returnTo` state so they bounce back after signing in.
 *
 * While the AuthProvider is still bootstrapping (initial /me call), we
 * render a spinner instead of either the protected content or the sign-in
 * page — otherwise legitimate users would briefly see the sign-in page on
 * every page load, which is jarring.
 *
 * Optional `roles` prop gates further: only users in the allowed list pass.
 */
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';

interface Props {
  roles?: readonly UserRole[];
  children?: ReactNode;
}

export function ProtectedRoute({ roles, children }: Props) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 'var(--space-8)',
          color: 'var(--text-secondary)',
        }}
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/account/sign-in"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <article style={{ padding: 'var(--space-7)' }}>
        <h1>Not authorized</h1>
        <p>You don&apos;t have access to this page.</p>
      </article>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
