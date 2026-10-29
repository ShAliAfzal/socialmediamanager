import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-stage">
        <header className="login-brand">
          <AppLogo size="hero" stacked align="center" />
        </header>

        <div className="card login-card stack">
          <div>
            <h2>Back to the desk</h2>
            <p className="lede">
              Plan posts, polish drafts, and share them live when the timing is
              right.
            </p>
          </div>
          <form className="stack" onSubmit={onSubmit}>
            <label>
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
