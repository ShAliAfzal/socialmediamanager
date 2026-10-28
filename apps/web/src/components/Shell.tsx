import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <h1>Social Media Manager</h1>
            <p>
              {user?.role === 'admin' ? 'Admin console' : 'Client workspace'} ·{' '}
              {user?.name}
            </p>
          </div>
        </div>
        <nav className="nav-pill">
          <Link className={loc.pathname === '/' ? 'active' : ''} to="/">
            Home
          </Link>
          {user?.role === 'admin' ? (
            <Link
              className={loc.pathname === '/settings' ? 'active' : ''}
              to="/settings"
            >
              Settings
            </Link>
          ) : (
            <Link
              className={loc.pathname === '/workspace' ? 'active' : ''}
              to="/workspace"
            >
              Connect
            </Link>
          )}
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
