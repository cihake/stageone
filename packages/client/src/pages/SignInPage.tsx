/**
 * /account/sign-in — exchanges credentials for a session.
 *
 * After success, redirects to either the `returnTo` path (set by
 * ProtectedRoute when an unauthenticated user tried to reach a protected
 * page) or to /account.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import '../styles/forms.css';

interface LocationState {
  returnTo?: string;
}

export function SignInPage() {
  const { signIn, isAuthenticated, isSubmitting } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as LocationState | null)?.returnTo ?? '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // If already signed in (e.g., navigated here directly while logged in), bounce.
  useEffect(() => {
    if (isAuthenticated) navigate(returnTo, { replace: true });
  }, [isAuthenticated, navigate, returnTo]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await signIn({ email: email.trim(), password });
      navigate(returnTo, { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Sign-in failed. Please try again.';
      setFormError(msg);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <h1>Sign in</h1>
      <p>Welcome back to StageOne.</p>

      {formError && (
        <div className="form-error-banner" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="form-footer">
        No account? <Link to="/account/sign-up">Create one</Link>
      </p>
    </form>
  );
}
