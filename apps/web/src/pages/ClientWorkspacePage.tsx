import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';

type Client = {
  id: string;
  name: string;
  websiteUrl: string;
  autoPublish: boolean;
  blogPublishMode: 'git' | 'webhook' | 'both' | 'none';
  niche: string;
  brandVoice: string;
  meta: {
    pageId: string;
    pageName: string;
    igUserId: string;
    tokenConfigured: boolean;
    tokenMasked: string;
  };
  git: {
    repoUrl: string;
    branch: string;
    contentPath: string;
    usePullRequest: boolean;
  };
  webhook: { url: string };
};

export default function ClientWorkspacePage() {
  const { user, token } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [msg, setMsg] = useState('');

  if (user?.role !== 'client') return <Navigate to="/" replace />;

  useEffect(() => {
    api<Client>('/clients/me', { token }).then((c) => {
      setClient(c);
      setPageId(c.meta.pageId);
      setPageName(c.meta.pageName);
      setIgUserId(c.meta.igUserId);
    });
  }, [token]);

  async function saveFlags(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    const next = await api<Client>(`/clients/${client.id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({
        autoPublish: client.autoPublish,
        blogPublishMode: client.blogPublishMode,
        websiteUrl: client.websiteUrl,
        git: client.git,
        webhook: client.webhook,
      }),
    });
    setClient(next);
    setMsg('Workspace saved.');
  }

  async function connectMeta(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    const next = await api<Client>(`/clients/${client.id}/meta/connect`, {
      method: 'POST',
      token,
      body: JSON.stringify({ pageId, pageName, pageToken, igUserId }),
    });
    setClient(next);
    setPageToken('');
    setMsg('Meta Page connected (token encrypted).');
  }

  if (!client) {
    return (
      <Shell>
        <p className="muted">Loading workspace…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid-2">
        <form className="card stack" onSubmit={connectMeta}>
          <h2>Connect Facebook + Instagram</h2>
          <p className="muted">
            Agency-admin model: paste the long-lived <strong>Page access token</strong>,
            Page ID, and IG Business user id. No passwords in the app.
          </p>
          <span className={`badge ${client.meta.tokenConfigured ? 'ok' : 'warn'}`}>
            {client.meta.tokenConfigured
              ? `Connected ${client.meta.tokenMasked}`
              : 'Not connected'}
          </span>
          <label>
            Page ID
            <input value={pageId} onChange={(e) => setPageId(e.target.value)} />
          </label>
          <label>
            Page name
            <input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
            />
          </label>
          <label>
            Page access token
            <input
              value={pageToken}
              onChange={(e) => setPageToken(e.target.value)}
              placeholder="Paste token"
            />
          </label>
          <label>
            Instagram user ID
            <input
              value={igUserId}
              onChange={(e) => setIgUserId(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Save Meta connection
          </button>
        </form>

        <form className="card stack" onSubmit={saveFlags}>
          <h2>Publish rules</h2>
          <label className="row" style={{ color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={client.autoPublish}
              onChange={(e) =>
                setClient({ ...client, autoPublish: e.target.checked })
              }
              style={{ width: 'auto' }}
            />
            Auto-publish after generate (skip approval)
          </label>
          <label>
            Blog publish mode
            <select
              value={client.blogPublishMode}
              onChange={(e) =>
                setClient({
                  ...client,
                  blogPublishMode: e.target.value as Client['blogPublishMode'],
                })
              }
            >
              <option value="none">None</option>
              <option value="git">Git</option>
              <option value="webhook">Webhook</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label>
            Website
            <input
              value={client.websiteUrl}
              onChange={(e) =>
                setClient({ ...client, websiteUrl: e.target.value })
              }
            />
          </label>
          <label>
            GitHub repo URL
            <input
              value={client.git.repoUrl}
              onChange={(e) =>
                setClient({
                  ...client,
                  git: { ...client.git, repoUrl: e.target.value },
                })
              }
            />
          </label>
          <label>
            Webhook URL
            <input
              value={client.webhook.url}
              onChange={(e) =>
                setClient({
                  ...client,
                  webhook: { ...client.webhook, url: e.target.value },
                })
              }
            />
          </label>
          {msg ? <p className="muted">{msg}</p> : null}
          <button className="btn btn-accent" type="submit">
            Save publish settings
          </button>
        </form>
      </div>
    </Shell>
  );
}
