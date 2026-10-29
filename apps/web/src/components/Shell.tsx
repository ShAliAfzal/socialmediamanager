import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import AppLogo from './AppLogo';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand brand-link">
          <AppLogo size="sm" />
          <p className="brand-meta">
            {user?.role === 'admin' ? 'Agency desk' : 'Brand desk'} ·{' '}
            {user?.name}
          </p>
        </Link>
        <nav className="nav-pill">
          <Link className={loc.pathname === '/' ? 'active' : ''} to="/">
            Home
          </Link>
          {user?.role === 'admin' ? (
            <>
              <Link
                className={loc.pathname === '/clients' ? 'active' : ''}
                to="/clients"
              >
                Clients
              </Link>
              <Link
                className={loc.pathname === '/agent' ? 'active' : ''}
                to="/agent"
              >
                AI Agent
              </Link>
              <Link
                className={loc.pathname === '/settings' ? 'active' : ''}
                to="/settings"
              >
                Settings
              </Link>
            </>
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
