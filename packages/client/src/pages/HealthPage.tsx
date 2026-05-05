/**
 * v0.1 smoke-test page. Hits /api/health and /api/health/ready and renders
 * the response. Lets us verify the full stack (React → Vite proxy → Express
 * → Mongoose → Atlas) end-to-end before moving on to v0.2.
 */
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../lib/api';

interface LivenessResponse {
  status: 'ok';
  service: string;
  env: string;
  uptimeSeconds: number;
  timestamp: string;
}

interface ReadinessResponse {
  status: 'ready' | 'not-ready';
  db: { state: string; host: string | null; name: string | null };
  timestamp: string;
}

type FetchState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; data: T }
  | { kind: 'error'; message: string };

export function HealthPage() {
  const [liveness, setLiveness] = useState<FetchState<LivenessResponse>>({ kind: 'idle' });
  const [readiness, setReadiness] = useState<FetchState<ReadinessResponse>>({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;

    setLiveness({ kind: 'loading' });
    setReadiness({ kind: 'loading' });

    apiFetch<LivenessResponse>('/api/health')
      .then((data) => !cancelled && setLiveness({ kind: 'ok', data }))
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError || err instanceof Error ? err.message : String(err);
        setLiveness({ kind: 'error', message: msg });
      });

    apiFetch<ReadinessResponse>('/api/health/ready')
      .then((data) => !cancelled && setReadiness({ kind: 'ok', data }))
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError || err instanceof Error ? err.message : String(err);
        setReadiness({ kind: 'error', message: msg });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article>
      <h1>v0.1 smoke test</h1>
      <p>
        This page calls the StageOne API. If both panels say <strong>ok</strong>, the React
        client, the Express server, and MongoDB Atlas are all wired up correctly.
      </p>

      <section
        style={{
          marginTop: 'var(--space-5)',
          padding: 'var(--space-5)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h2>
          Liveness — <code>/api/health</code>
        </h2>
        <pre
          style={{
            background: 'var(--color-cream)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(liveness, null, 2)}
        </pre>
      </section>

      <section
        style={{
          marginTop: 'var(--space-5)',
          padding: 'var(--space-5)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h2>
          Readiness — <code>/api/health/ready</code>
        </h2>
        <pre
          style={{
            background: 'var(--color-cream)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(readiness, null, 2)}
        </pre>
      </section>
    </article>
  );
}
