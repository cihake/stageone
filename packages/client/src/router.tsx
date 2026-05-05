/**
 * App router. Mirrors the provisional site map in spec §4 / Appendix A.
 * v0.2 wires up the public Account routes (sign-in / sign-up) and the
 * protected /account branch. Phase 3 fills in Discover, Artists, Gigs.
 */
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccountPage } from './pages/AccountPage';
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

      // Public account routes
      { path: 'account/sign-in', element: <SignInPage /> },
      { path: 'account/sign-up', element: <SignUpPage /> },

      // Authenticated account routes
      {
        path: 'account',
        element: <ProtectedRoute />,
        children: [{ index: true, element: <AccountPage /> }],
      },

      // Placeholder branches per spec §4.1; wire up in Phase 3:
      //   { path: 'discover', element: <DiscoverPage /> },
      //   { path: 'artists',  element: <ArtistsPage /> },
      //   { path: 'gigs',     element: <GigsPage /> },
      //   { path: 'search',   element: <SearchPage /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
