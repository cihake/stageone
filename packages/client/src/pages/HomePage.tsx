/**
 * Home page placeholder for v0.1. Real layout (hero + featured artists + new
 * tracks strip + nearby gigs) lands in Phase 3 per spec wireframe B.1.
 */
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <article>
      <h1>Hear what&apos;s next.</h1>
      <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '60ch' }}>
        StageOne spotlights indie artists you haven&apos;t heard yet. Browse local musicians,
        stream their tracks, and find shows near you.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
        <Link
          to="/discover"
          style={{
            background: 'var(--accent)',
            color: 'var(--text-on-amber)',
            padding: 'var(--space-3) var(--space-5)',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Explore
        </Link>
        <Link
          to="/health"
          style={{
            background: 'transparent',
            color: 'var(--brand)',
            padding: 'var(--space-3) var(--space-5)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Smoke test (v0.1)
        </Link>
      </div>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2>v0.1 Skeleton release</h2>
        <p>
          You&apos;re looking at the foundation build. Visit <Link to="/health">/health</Link>{' '}
          to confirm the React app, the Express API, and MongoDB Atlas are all talking to each
          other. Featured artists, the AI assistant, and the rest of the feature set ship in
          later phases (see <code>StageOne_release_plan.pdf</code>).
        </p>
      </section>
    </article>
  );
}
