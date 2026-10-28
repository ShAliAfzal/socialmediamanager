import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';

type Settings = {
  dryRunPublish: boolean;
  heygenConfigured: boolean;
  dataforseoConfigured: boolean;
  heygenMasked: string;
  dataforseoLoginMasked: string;
};

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [heygenApiKey, setHeygenApiKey] = useState('');
  const [dataforseoLogin, setDataforseoLogin] = useState('');
  const [dataforseoPassword, setDataforseoPassword] = useState('');
  const [dryRunPublish, setDryRunPublish] = useState(true);
  const [msg, setMsg] = useState('');

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  useEffect(() => {
    api<Settings>('/settings', { token }).then((s) => {
      setSettings(s);
      setDryRunPublish(s.dryRunPublish);
    });
  }, [token]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const next = await api<Settings>('/settings', {
      method: 'PUT',
      token,
      body: JSON.stringify({
        heygenApiKey: heygenApiKey || undefined,
        dataforseoLogin: dataforseoLogin || undefined,
        dataforseoPassword: dataforseoPassword || undefined,
        dryRunPublish,
      }),
    });
    setSettings(next);
    setHeygenApiKey('');
    setDataforseoLogin('');
    setDataforseoPassword('');
    setMsg('Saved.');
  }

  return (
    <Shell>
      <form className="card stack" onSubmit={save} style={{ maxWidth: 720 }}>
        <h2>Platform keys</h2>
        <p className="muted">
          Stored encrypted. Used for every client campaign. Leave blank to keep
          the current value.
        </p>

        <div className="row">
          <span className={`badge ${settings?.heygenConfigured ? 'ok' : 'warn'}`}>
            HeyGen {settings?.heygenConfigured ? 'ready' : 'missing'}
          </span>
          <span
            className={`badge ${settings?.dataforseoConfigured ? 'ok' : 'warn'}`}
          >
            DataForSEO {settings?.dataforseoConfigured ? 'ready' : 'missing'}
          </span>
          <span className={`badge ${dryRunPublish ? 'warn' : 'ok'}`}>
            {dryRunPublish ? 'Dry-run publish ON' : 'Live publish'}
          </span>
        </div>

        <label>
          HeyGen API key {settings?.heygenMasked ? `(${settings.heygenMasked})` : ''}
          <input
            value={heygenApiKey}
            onChange={(e) => setHeygenApiKey(e.target.value)}
            placeholder="Paste new key"
          />
        </label>
        <label>
          DataForSEO login{' '}
          {settings?.dataforseoLoginMasked
            ? `(${settings.dataforseoLoginMasked})`
            : ''}
          <input
            value={dataforseoLogin}
            onChange={(e) => setDataforseoLogin(e.target.value)}
            placeholder="Paste login"
          />
        </label>
        <label>
          DataForSEO password
          <input
            type="password"
            value={dataforseoPassword}
            onChange={(e) => setDataforseoPassword(e.target.value)}
            placeholder="Paste password"
          />
        </label>
        <label className="row" style={{ color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={dryRunPublish}
            onChange={(e) => setDryRunPublish(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Dry-run publish (recommended until Meta tokens are live)
        </label>
        {msg ? <p className="muted">{msg}</p> : null}
        <button className="btn btn-primary" type="submit">
          Save settings
        </button>
      </form>
    </Shell>
  );
}
