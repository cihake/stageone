/**
 * /account — landing for an authenticated user.
 * - Artists → link to their dashboard
 * - Fans    → link to their fan feed at /feed
 *
 * The fan feed used to live inline here as a FanFeedSection component,
 * but /feed is now the canonical page for that content. Keeping a
 * duplicate would drift over time and force fetching the feed twice for
 * any fan who visits both pages.
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './account.css';

export function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <article>
      <h1>Hi, {user.displayName}.</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
        You are signed in as <strong>{user.email}</strong> with the{' '}
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
            Open dashboard
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
          <h2>Your feed</h2>
          <p>See recent tracks and upcoming gigs from artists you follow.</p>
          <Link
            to="/feed"
            className="btn-primary"
            style={{ display: 'inline-flex', maxWidth: 240, textDecoration: 'none' }}
          >
            Open your feed
          </Link>
        </section>
      )}
    </article>
  );
}
