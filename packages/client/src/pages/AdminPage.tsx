/**
 * /admin — simple admin console for approving pending artist profiles.
 *
 * Only accessible to users with role=admin (enforced by ProtectedRoute).
 * Fetches GET /api/admin/artists (pending list) and calls
 * PATCH /api/admin/artists/:id/approve for each approval.
 *
 * Per spec §5.1.3 (admin user stories) and the approve-workflow design
 * decision from the session plan.
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, apiPatch } from '../lib/api';
import '../styles/forms.css';
import './artists.css';

// ─── Types ────────────────────────────────────────────────────────────

interface PendingArtist {
  _id: string;
  slug: string;
  displayName: string;
  homeCity: string;
  homeState: string;
  genreTags: string[];
  bio: string;
  createdAt: string;
}

interface PendingListResponse {
  items: PendingArtist[];
  total: number;
}

// ─── Page ─────────────────────────────────────────────────────────────

export function AdminPage() {
  const [artists, setArtists] = useState<PendingArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<PendingListResponse>('/api/admin/artists');
      setArtists(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pending artists');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string, name: string) {
    setApprovingId(id);
    try {
      await apiPatch(`/api/admin/artists/${id}/approve`);
      setArtists((prev) => prev.filter((a) => a._id !== id));
      setFlashMsg(`✓ ${name} approved and is now live.`);
      setTimeout(() => setFlashMsg(null), 4000);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>Admin — Pending Artist Approvals</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Artists register with <em>isApproved=false</em>. Approve them here to make
        their profiles visible on the public Artists directory.
      </p>

      {flashMsg && (
        <div
          role="status"
          style={{
            background: 'rgb(21 128 61 / 0.1)',
            border: '1px solid rgb(21 128 61 / 0.3)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-5)',
          }}
        >
          {flashMsg}
        </div>
      )}

      {error && (
        <p className="form-error-banner" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : artists.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-8)',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          🎉 No pending artists — the queue is empty.
        </div>
      ) : (
        <table
          style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
        >
          <thead>
            <tr style={{ background: 'var(--bg-page)', borderBottom: '2px solid var(--border-default)' }}>
              <th style={thStyle}>Artist</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Genres</th>
              <th style={thStyle}>Submitted</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((a, idx) => (
              <tr
                key={a._id}
                style={{
                  borderBottom: idx < artists.length - 1 ? '1px solid var(--border-default)' : 'none',
                }}
              >
                <td style={tdStyle}>
                  <strong>{a.displayName}</strong>
                  <br />
                  <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>
                    /artists/{a.slug}
                  </span>
                </td>
                <td style={tdStyle}>
                  {a.homeCity}, {a.homeState}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {a.genreTags.length > 0
                      ? a.genreTags.map((g) => (
                          <span key={g} className="genre-chip">
                            {g}
                          </span>
                        ))
                      : <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-caption)' }}>—</span>}
                  </div>
                </td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    disabled={approvingId === a._id}
                    onClick={() => void approve(a._id, a.displayName)}
                    style={{
                      background: 'var(--color-success)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-2) var(--space-4)',
                      cursor: approvingId === a._id ? 'not-allowed' : 'pointer',
                      font: 'inherit',
                      fontWeight: 600,
                      opacity: approvingId === a._id ? 0.6 : 1,
                      minHeight: '36px',
                    }}
                  >
                    {approvingId === a._id ? 'Approving…' : 'Approve'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 'var(--space-5)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {artists.length} pending artist{artists.length !== 1 ? 's' : ''} in queue.
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 'var(--fs-caption)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-4)',
  verticalAlign: 'middle',
};
