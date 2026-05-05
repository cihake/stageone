/**
 * /account — landing for an authenticated user. Routes artists to their
 * dashboard, fans to a placeholder feed (real fan dashboard ships in a
 * later v0.3 session).
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AccountPage() {
  const { user } = useAuth();
  if (!user) return null; // ProtectedRoute guarantees we don't get here

  return (
    <article>
      <h1>Hi, {user.displayName}.</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
        You&apos;re signed in as <strong>{user.email}</strong> with the{' '}
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
            Open dashboard →
          </Link>
        </section>
      ) : (
        <section
          style={{
            marginTop: 'var(--space-6)',
            padding: 'var(--space-5)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <h2>Coming soon</h2>
          <p>
            Your fan feed will land here — recent tracks from artists you follow, upcoming gigs
            near you, and your saved searches. In the meantime, the v0.1 smoke test is still
            useful as a sanity check — see <Link to="/health">/health</Link>.
          </p>
        </section>
      )}
    </article>
  );
}
