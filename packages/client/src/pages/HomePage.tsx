/**
 * Home page — updated for v0.3 (Content & discovery).
 * Wireframe B.1 hero with featured artists + gig strip ships in v1.0-rc.
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

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
        <Link
          to="/artists"
          style={{
            background: 'var(--accent)',
            color: 'var(--text-on-amber)',
            padding: 'var(--space-3) var(--space-5)',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Browse artists
        </Link>
        <Link
          to="/gigs"
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
          Upcoming gigs
        </Link>
      </div>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2>v0.3 — Content &amp; discovery</h2>
        <p>
          Artists can publish tracks and gigs. Fans can follow artists and get a personalised
          feed of new music and upcoming shows at <Link to="/account">/account</Link>. The
          artist directory is live at <Link to="/artists">/artists</Link> and the gig calendar
          at <Link to="/gigs">/gigs</Link>.
        </p>
        <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Coming in v1.0-rc: AI discovery assistant, accessibility audit, seed data, and
          production launch.
        </p>
      </section>
    </article>
  );
}
