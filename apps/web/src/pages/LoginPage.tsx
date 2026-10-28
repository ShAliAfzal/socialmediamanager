import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('client@ecomrisers.com');
  const [password, setPassword] = useState('Ecom@12345');
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
      <div className="card login-card stack">
        <div>
          <p className="badge ok">Pro social agent</p>
          <h2>Post less. Publish better.</h2>
          <p className="muted">
            Topic → keywords → blog → Reels brief → Facebook/Instagram → git or
            webhook.
          </p>
        </div>
        <form className="stack" onSubmit={onSubmit}>
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="stat muted" style={{ fontSize: '0.85rem' }}>
          Demo accounts are pre-seeded. Admin:{' '}
          <strong style={{ color: 'var(--text)' }}>
            admin@socialmediamanager.app
          </strong>{' '}
          / Admin@12345
        </div>
      </div>
    </div>
  );
}
