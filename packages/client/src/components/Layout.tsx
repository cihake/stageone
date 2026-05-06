/**
 * App-shell layout: header, main outlet, footer. Matches the wireframes in
 * spec Appendix B (the navy header bar with primary links + Sign In).
 *
 * Nav notes:
 *   - Discover removed: /artists already covers the discovery use-case.
 *   - Search disabled with a "coming soon" tooltip; reserved for the AI
 *     discovery assistant in v1.0-rc.
 */
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import './layout.css';

/** Active nav items — Discover removed, Search is a disabled stub below. */
const NAV_ITEMS = [
  { to: '/artists', label: 'Artists' },
  { to: '/gigs', label: 'Gigs' },
] as const;

function HeaderAuthSlot() {
  const { user, isAuthenticated, signOut, isSubmitting } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    try {
      await signOut();
    } finally {
      navigate('/', { replace: true });
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <li>
          <Link to="/account/sign-up" className="nav-link">
            Sign Up
          </Link>
        </li>
        <li>
          <Link to="/account/sign-in" className="nav-link nav-link--cta">
            Sign In
          </Link>
        </li>
      </>
    );
  }

  return (
    <>
      <li>
        <Link to="/account" className="nav-link">
          {user.displayName}
        </Link>
      </li>
      <li>
        <button
          type="button"
          onClick={onSignOut}
          disabled={isSubmitting}
          className="nav-link nav-link--button"
        >
          Sign Out
        </button>
      </li>
    </>
  );
}

function LayoutShell() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="container site-header__row">
          <Link to="/" className="brand">
            StageOne
          </Link>
          <nav aria-label="Primary">
            <ul className="nav-list">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link--active' : 'nav-link'
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}

              {/* Search — disabled until AI assistant ships in v1.0-rc */}
              <li>
                <span
                  className="nav-link nav-link--disabled"
                  aria-disabled="true"
                  title="Search is coming soon"
                >
                  Search
                  <span className="nav-link__badge" aria-hidden="true">Soon</span>
                </span>
              </li>

              <HeaderAuthSlot />
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="container site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__row">
          <span>&copy; 2026 StageOne &mdash; WEB 268 capstone.</span>
          <nav aria-label="Footer">
            <Link to="/about">About</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

export function Layout() {
  return (
    <AuthProvider>
      <LayoutShell />
    </AuthProvider>
  );
}
