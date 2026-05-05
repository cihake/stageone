/**
 * App router. Mirrors the provisional site map in spec §4 / Appendix A.
 *
 * v0.3 additions:
 *   /artists          public artist directory
 *   /artists/:slug    public artist detail page (wireframe B.3)
 *   /admin            admin console — approve pending artists (role=admin)
 */
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { ArtistDashboardPage } from './pages/ArtistDashboardPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { HealthPage } from './pages/HealthPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'health', element: <HealthPage /> },

      // ── Public artist directory ─────────────────────────────────
      { path: 'artists', element: <ArtistsPage /> },
      { path: 'artists/:slug', element: <ArtistDetailPage /> },

      // ── Public account routes ───────────────────────────────────
      { path: 'account/sign-in', element: <SignInPage /> },
      { path: 'account/sign-up', element: <SignUpPage /> },

      // ── Authenticated account routes ────────────────────────────
      {
        path: 'account',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <AccountPage /> },
          {
            path: 'artist',
            element: <ProtectedRoute roles={['artist']} />,
            children: [{ index: true, element: <ArtistDashboardPage /> }],
          },
        ],
      },

      // ── Admin console (role=admin required) ─────────────────────
      {
        path: 'admin',
        element: <ProtectedRoute roles={['admin']} />,
        children: [{ index: true, element: <AdminPage /> }],
      },

      // Placeholder branches per spec §4.1 (wire up in later sessions):
      //   { path: 'discover', … }
      //   { path: 'gigs', … }
      //   { path: 'search', … }
    ],
  },
]);
