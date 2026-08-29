/**
 * App-shell layout: header, main outlet, footer. Matches the wireframes in
 * spec Appendix B (the navy header bar with primary links + Sign In).
 *
 * Nav notes:
 *   - Discover removed: /artists already covers the discovery use-case.
 *   - Search live with keyword search; AI tab stub inside the page for v1.0-rc.
 *   - Below the --bp-md breakpoint (768px) the nav collapses into a hamburger
 *     button that toggles a full-width dropdown panel. Same NavLink markup
 *     for desktop and mobile so react-router active-state and auth-gating
 *     stay in one place.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PlayerProvider } from '../context/PlayerContext';
import { AudioPlayer } from './AudioPlayer';
import './layout.css';

/** Primary nav items (always visible). */
const NAV_ITEMS = [
  { to: '/artists', label: 'Artists' },
  { to: '/gigs', label: 'Gigs' },
  { to: '/search', label: 'Search' },
] as const;

/** Nav items only shown when signed in. */
const AUTHED_NAV_ITEMS = [{ to: '/feed', label: 'Feed' }] as const;

function AuthedNavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return (
    <>
      {AUTHED_NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </>
  );
}

function HeaderAuthSlot({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAuthenticated, signOut, isSubmitting } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    onNavigate?.();
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
          <Link to="/account/sign-up" onClick={onNavigate} className="nav-link">
            Sign Up
          </Link>
        </li>
        <li>
          <Link to="/account/sign-in" onClick={onNavigate} className="nav-link nav-link--cta">
            Sign In
          </Link>
        </li>
      </>
    );
  }

  return (
    <>
      <li>
        <Link to="/account" onClick={onNavigate} className="nav-link">
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Close the menu when the route changes (covers cases where a nav item
  // triggers a redirect and the click handler doesn't fire — e.g. going
  // through a ProtectedRoute).
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close on outside click and on Esc.
  useEffect(() => {
    if (!isMenuOpen) return;

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="container site-header__row">
          <Link to="/" className="brand" onClick={closeMenu}>
            StageOne
          </Link>

          {/* Desktop nav (hidden below --bp-md by CSS). */}
          <nav aria-label="Primary" className="site-nav site-nav--desktop">
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
              <AuthedNavItems />
              <HeaderAuthSlot />
            </ul>
          </nav>

          {/* Mobile hamburger (hidden at and above --bp-md by CSS). */}
          <button
            ref={toggleRef}
            type="button"
            className="nav-toggle"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            <span className={`nav-toggle__icon${isMenuOpen ? ' nav-toggle__icon--open' : ''}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        {/* Mobile dropdown panel. Rendered under the header row so it can
            slide down full-width. Hidden by CSS when isMenuOpen is false
            AND when the viewport is desktop-sized. */}
        <div
          ref={menuRef}
          id="mobile-nav"
          className={`site-nav site-nav--mobile${isMenuOpen ? ' site-nav--mobile-open' : ''}`}
        >
          <nav aria-label="Primary (mobile)">
            <ul className="nav-list nav-list--mobile">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link--active' : 'nav-link'
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <AuthedNavItems onNavigate={closeMenu} />
              <HeaderAuthSlot onNavigate={closeMenu} />
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

      <AudioPlayer />
    </>
  );
}

export function Layout() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <LayoutShell />
      </PlayerProvider>
    </AuthProvider>
  );
}
