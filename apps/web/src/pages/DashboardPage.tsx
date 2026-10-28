import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';

type Campaign = {
  _id: string;
  topic: string;
  status: string;
  clientId: string;
  blog?: { title?: string };
};

type Client = { id: string; name: string; slug: string };

function statusBadge(status: string) {
  if (status === 'published') return 'ok';
  if (status === 'failed') return 'bad';
  if (status === 'pending_approval') return 'warn';
  return '';
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [topic, setTopic] = useState(
    'Amazon product ranking but no sales — high competition listing ranks with zero sales',
  );
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const rows = await api<Campaign[]>('/campaigns', { token });
    setCampaigns(rows);
    if (user?.role === 'admin') {
      const list = await api<Client[]>('/clients', { token });
      setClients(list);
      if (!clientId && list[0]) setClientId(list[0].id);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
  }, []);

  async function createCampaign(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api<Campaign>('/campaigns', {
        method: 'POST',
        token,
        body: JSON.stringify({
          topic,
          clientId: user?.role === 'admin' ? clientId : undefined,
        }),
      });
      await api(`/campaigns/${created._id}/generate`, {
        method: 'POST',
        token,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <section className="hero">
        <div className="card">
          <p className="badge">Weekly content engine</p>
          <h2 style={{ marginTop: 10 }}>
            {user?.role === 'admin'
              ? 'Run campaigns across every client.'
              : 'Create the next Ecom Risers drop.'}
          </h2>
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
            DataForSEO keywords, SEO blog, Facebook + Instagram copy, HeyGen
            reel brief — then approve and publish. Auto-publish is a client
            flag.
          </p>
        </div>
        <div className="card stack">
          <div className="stat">
            <span className="muted">Campaigns</span>
            <strong>{campaigns.length}</strong>
          </div>
          <div className="stat">
            <span className="muted">Pending approval</span>
            <strong>
              {campaigns.filter((c) => c.status === 'pending_approval').length}
            </strong>
          </div>
          <div className="stat">
            <span className="muted">Published</span>
            <strong>
              {campaigns.filter((c) => c.status === 'published').length}
            </strong>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <form className="card stack" onSubmit={createCampaign}>
          <h3>New campaign</h3>
          {user?.role === 'admin' ? (
            <label>
              Client
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Topic
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Generating…' : 'Generate content pack'}
          </button>
        </form>

        <div className="card stack">
          <h3>Recent campaigns</h3>
          <div className="list">
            {campaigns.map((c) => (
              <Link
                key={c._id}
                className="list-item"
                to={`/campaigns/${c._id}`}
              >
                <div>
                  <strong>{c.blog?.title || c.topic}</strong>
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    {c.topic}
                  </p>
                </div>
                <span className={`badge ${statusBadge(c.status)}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
            {!campaigns.length ? (
              <p className="muted">No campaigns yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
