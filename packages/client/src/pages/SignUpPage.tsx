/**
 * /account/sign-up — create a fan or artist account.
 *
 * Client-side rules mirror the server's Zod password validator
 * (packages/server/src/schemas/auth.schemas.ts) so errors surface immediately
 * rather than after a round trip. Server is still the source of truth.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type RegisterInput } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import '../styles/forms.css';

function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Must be at least 10 characters';
  if (!/[a-z]/.test(password)) return 'Must contain a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Must contain an uppercase letter';
  if (!/\d/.test(password)) return 'Must contain a digit';
  if (/\s/.test(password)) return 'Must not contain whitespace';
  return null;
}

export function SignUpPage() {
  const { signUp, isAuthenticated, isSubmitting } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<RegisterInput['role']>('fan');
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/account', { replace: true });
  }, [isAuthenticated, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const pwError = validatePassword(password);
    setPasswordError(pwError);
    if (pwError) return;

    try {
      await signUp({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
        role,
      });
      navigate('/account', { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Registration failed. Please try again.';
      setFormError(msg);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <h1>Create account</h1>
      <p>Join StageOne as a fan or post your music as an artist.</p>

      {formError && (
        <div className="form-error-banner" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label>I am a…</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="role"
              value="fan"
              checked={role === 'fan'}
              onChange={() => setRole('fan')}
            />
            <span>Fan</span>
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="artist"
              checked={role === 'artist'}
              onChange={() => setRole('artist')}
            />
            <span>Artist</span>
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          required
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <span className="help">Shown next to your activity. You can change this later.</span>
      </div>

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
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError(null);
          }}
          onBlur={() => setPasswordError(validatePassword(password))}
          aria-describedby="password-help password-error"
        />
        <span id="password-help" className="help">
          10+ characters, with uppercase, lowercase, and a digit. No spaces.
        </span>
        <span id="password-error" className="error">
          {passwordError ?? ''}
        </span>
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className="form-footer">
        Already have an account? <Link to="/account/sign-in">Sign in</Link>
      </p>
    </form>
  );
}
