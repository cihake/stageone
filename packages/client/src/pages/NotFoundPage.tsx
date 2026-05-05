/**
 * Custom 404 page — pre-launch checklist item #33 (release plan §7).
 * The release-plan version will get a polished design in Phase 4.
 */
import { Link, useRouteError } from 'react-router-dom';

export function NotFoundPage() {
  const error = useRouteError();

  if (error) console.error('[router]', error);

  return (
    <article style={{ textAlign: 'center', paddingBlock: 'var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--fs-display)' }}>404</h1>
      <p style={{ color: 'var(--text-secondary)' }}>That page isn&apos;t on the setlist.</p>
      <p>
        <Link to="/">← Back to home</Link>
      </p>
    </article>
  );
}
