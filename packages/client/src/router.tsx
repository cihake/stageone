/**
 * App router — v0.3.
 *
 * /discover removed (duplicates /artists).
 * /search live with keyword search; AI tab is a stub for v1.0-rc.
 */
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { ArtistDashboardPage } from './pages/ArtistDashboardPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { GigsPage } from './pages/GigsPage';
import { HealthPage } from './pages/HealthPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SearchPage } from './pages/SearchPage';
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

      { path: 'artists', element: <ArtistsPage /> },
      { path: 'artists/:slug', element: <ArtistDetailPage /> },

      { path: 'gigs', element: <GigsPage /> },

      { path: 'search', element: <SearchPage /> },

      { path: 'account/sign-in', element: <SignInPage /> },
      { path: 'account/sign-up', element: <SignUpPage /> },

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

      {
        path: 'admin',
        element: <ProtectedRoute roles={['admin']} />,
        children: [{ index: true, element: <AdminPage /> }],
      },
    ],
  },
]);
