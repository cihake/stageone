/**
 * /account — landing for an authenticated user. Placeholder for v0.2;
 * the real fan dashboard (followed artists, upcoming gigs) and artist
 * dashboard (My Tracks, My Gigs, Messages) ship in Phase 3.
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

      <section
        style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-5)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h2>Coming in Phase 3</h2>
        <p>
          {user.role === 'artist' ? (
            <>
              Your artist dashboard will land here — profile editor, track upload, gig
              publishing, and a messages inbox. See spec wireframe B.4.
            </>
          ) : (
            <>
              Your fan feed will land here — recent tracks from artists you follow, upcoming
              gigs near you, and your saved searches.
            </>
          )}
        </p>
        <p>
          In the meantime, the v0.1 smoke test is still useful as a sanity check — see{' '}
          <Link to="/health">/health</Link>.
        </p>
      </section>
    </article>
  );
}
