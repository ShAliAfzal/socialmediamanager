import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';

type Client = {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string;
  autoPublish: boolean;
  blogPublishMode: string;
  niche: string;
  postTimes?: string[];
  timezone?: string;
};

type CreateResult = {
  client: Client;
  login: {
    email: string;
    name: string;
    temporaryPassword: string;
  };
};

function randomPassword() {
  return `Client@${Math.random().toString(36).slice(2, 8)}A1`;
}

export default function ClientsPage() {
  const { user, token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [blogPublishMode, setBlogPublishMode] = useState('none');
  const [autoPublish, setAutoPublish] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState(randomPassword());
  const [loginName, setLoginName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreateResult | null>(null);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  async function load() {
    const list = await api<Client[]>('/clients', { token });
    setClients(list);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setCreated(null);
    try {
      const result = await api<CreateResult>('/clients', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          websiteUrl: websiteUrl || undefined,
          niche,
          brandVoice,
          blogPublishMode,
          autoPublish,
          loginEmail,
          loginPassword,
          loginName: loginName || undefined,
        }),
      });
      setCreated(result);
      setName('');
      setSlug('');
      setWebsiteUrl('');
      setNiche('');
      setBrandVoice('');
      setLoginEmail('');
      setLoginName('');
      setLoginPassword(randomPassword());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="grid-2">
        <form className="card stack" onSubmit={onCreate}>
          <h2>Add a client</h2>
          <p className="muted">
            Creates their brand workspace and a login so they can connect
            Facebook / Instagram and review posts.
          </p>

          <label>
            Brand / client name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Acme Brand"
            />
          </label>
          <label>
            Slug (optional)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-brand"
            />
          </label>
          <label>
            Website
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://www.example.com"
            />
          </label>
          <label>
            Niche
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. skincare, B2B SaaS, local services"
            />
          </label>
          <label>
            Brand voice
            <textarea
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="How this brand should sound in posts and captions"
            />
          </label>
          <label>
            Blog publish mode
            <select
              value={blogPublishMode}
              onChange={(e) => setBlogPublishMode(e.target.value)}
            >
              <option value="none">None</option>
              <option value="git">Git</option>
              <option value="webhook">Webhook</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className="row" style={{ color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Skip review (post immediately after content is created)
          </label>

          <h3 style={{ marginTop: 8 }}>Client login</h3>
          <label>
            Login name
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Client contact name"
            />
          </label>
          <label>
            Login email
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              placeholder="client@brand.com"
            />
          </label>
          <label>
            Temporary password
            <input
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Creating…' : 'Create client'}
          </button>

          {created ? (
            <div className="stat">
              <strong style={{ fontSize: '1rem' }}>Client created</strong>
              <p className="muted" style={{ marginTop: 8 }}>
                {created.client.name} ({created.client.slug})
              </p>
              <p style={{ marginTop: 8 }}>
                Login: <strong>{created.login.email}</strong>
                <br />
                Password: <strong>{created.login.temporaryPassword}</strong>
              </p>
              <p className="muted" style={{ marginTop: 8 }}>
                Share these credentials once, then they can connect Meta under
                Connect.
              </p>
            </div>
          ) : null}
        </form>

        <div className="card stack">
          <h2>All clients</h2>
          <div className="list">
            {clients.map((c) => (
              <div key={c.id} className="list-item" style={{ cursor: 'default' }}>
                <div>
                  <strong>{c.name}</strong>
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    {c.slug} · {c.websiteUrl || 'no website'}
                    {c.autoPublish ? ' · skip review' : ''}
                  </p>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    Posts at {(c.postTimes || ['10:00', '18:00']).join(' & ')}
                    {c.timezone ? ` (${c.timezone})` : ''}
                  </p>
                </div>
                <div className="row">
                  <Link
                    className="btn btn-ghost"
                    to={`/clients/${c.id}/schedule`}
                  >
                    Schedule
                  </Link>
                  <Link className="btn btn-ghost" to={`/?clientId=${c.id}`}>
                    Posts
                  </Link>
                </div>
              </div>
            ))}
            {!clients.length ? <p className="muted">No clients yet.</p> : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
