import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';

type MetaStatus =
  | 'not_connected'
  | 'demo'
  | 'live'
  | 'invalid'
  | 'saved';

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
    connectionStatus: MetaStatus;
    connectionLabel: string;
    connectionMessage: string;
  };
  git: {
    repoUrl: string;
    branch: string;
    contentPath: string;
    usePullRequest: boolean;
  };
  webhook: { url: string };
};

function statusTone(status?: MetaStatus) {
  if (status === 'live') return 'ok';
  if (status === 'invalid') return 'bad';
  return 'warn';
}

export default function ClientWorkspacePage() {
  const { user, token } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (user?.role !== 'client' || !token) return;
    api<Client>('/clients/me', { token })
      .then((c) => {
        setClient(c);
        setPageId(c.meta.pageId);
        setPageName(c.meta.pageName);
        setIgUserId(c.meta.igUserId);
      })
      .catch((e) => setError(String(e.message || e)));
  }, [token, user?.role]);

  if (user?.role !== 'client') return <Navigate to="/" replace />;

  async function connectMeta(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    setError('');
    setMsg('');
    setBusy('save');
    try {
      const next = await api<Client>(`/clients/${client.id}/meta/connect`, {
        method: 'POST',
        token,
        body: JSON.stringify({ pageId, pageName, pageToken, igUserId }),
      });
      setClient(next);
      setPageId(next.meta.pageId);
      setPageName(next.meta.pageName);
      setIgUserId(next.meta.igUserId);
      setPageToken('');
      setMsg(next.meta.connectionMessage || 'Facebook & Instagram connected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect');
    } finally {
      setBusy('');
    }
  }

  async function checkConnection() {
    if (!client) return;
    setBusy('check');
    setError('');
    setMsg('');
    try {
      const next = await api<Client>(`/clients/${client.id}/meta/verify`, {
        method: 'POST',
        token,
      });
      setClient(next);
      setMsg(next.meta.connectionMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setBusy('');
    }
  }

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
    setMsg('Preferences saved.');
  }

  if (!client) {
    return (
      <Shell>
        <p className="muted">{error || 'Loading…'}</p>
      </Shell>
    );
  }

  const meta = client.meta;
  const isLive = meta.connectionStatus === 'live';

  return (
    <Shell>
      <section className="page-intro">
        <div>
          <p className="eyebrow">{client.name}</p>
          <h2>Connect the feed</h2>
          <p className="lede">
            Link <BrandMark id="facebook" size="sm" /> and{' '}
            <BrandMark id="instagram" size="sm" /> so planned posts can go live.
            Then review drafts from Home.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link className="btn btn-primary" to="/">
              Review posts
            </Link>
          </p>
        </div>
        <div className="stat">
          <span className="muted row" style={{ gap: 8, marginBottom: 6 }}>
            <BrandMark id="facebook" size="sm" hideLabel />
            <BrandMark id="instagram" size="sm" hideLabel />
            Social
          </span>
          <strong style={{ fontSize: '1.1rem' }}>
            {meta.connectionLabel || 'Not connected'}
          </strong>
          {meta.connectionMessage ? (
            <p className="muted small" style={{ marginTop: 8 }}>
              {meta.connectionMessage}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid-2">
        <form className="card stack" onSubmit={connectMeta}>
          <h3 className="row" style={{ gap: 10 }}>
            1. Connect social
            <BrandMark id="meta" size="sm" />
          </h3>
          <p className="muted small">
            Paste your Page ID, Instagram ID, and Page access token from Meta
            Business.
          </p>
          <span className={`badge ${statusTone(meta.connectionStatus)}`}>
            {meta.connectionLabel}
            {isLive && meta.tokenMasked ? ` · ${meta.tokenMasked}` : ''}
          </span>
          <label>
            Page name
            <input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="Your brand page"
            />
          </label>
          <label>
            Page ID
            <input
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              required
              placeholder="Numeric Page ID from Meta"
            />
          </label>
          <label>
            <BrandMark id="instagram" label="Instagram user ID" />
            <input
              value={igUserId}
              onChange={(e) => setIgUserId(e.target.value)}
              placeholder="IG business account ID"
            />
          </label>
          <label>
            Page access token
            <input
              type="password"
              value={pageToken}
              onChange={(e) => setPageToken(e.target.value)}
              placeholder={
                isLive
                  ? 'Paste new token only if rotating'
                  : 'Paste live Page access token'
              }
              required={!isLive}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {msg ? <p className="success">{msg}</p> : null}
          <div className="row">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={busy === 'save'}
            >
              {busy === 'save' ? 'Verifying…' : 'Save & verify with Meta'}
            </button>
            {meta.tokenConfigured || meta.connectionStatus === 'saved' ? (
              <button
                className="btn btn-ghost"
                type="button"
                disabled={busy === 'check'}
                onClick={checkConnection}
              >
                {busy === 'check' ? 'Checking…' : 'Check connection'}
              </button>
            ) : null}
          </div>
        </form>

        <form className="card stack" onSubmit={saveFlags}>
          <h3>2. How you like to publish</h3>
          <label className="check-row">
            <input
              type="checkbox"
              checked={client.autoPublish}
              onChange={(e) =>
                setClient({ ...client, autoPublish: e.target.checked })
              }
            />
            <span>
              Skip review for instant posts (not recommended for scheduled
              campaigns)
            </span>
          </label>
          <label>
            Website
            <input
              value={client.websiteUrl}
              onChange={(e) =>
                setClient({ ...client, websiteUrl: e.target.value })
              }
              placeholder="https://"
            />
          </label>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? 'Hide blog settings' : 'Blog / website settings'}
          </button>

          {showAdvanced ? (
            <>
              <label>
                Blog publish
                <select
                  value={client.blogPublishMode}
                  onChange={(e) =>
                    setClient({
                      ...client,
                      blogPublishMode: e.target
                        .value as Client['blogPublishMode'],
                    })
                  }
                >
                  <option value="none">Don&apos;t publish blog</option>
                  <option value="git">GitHub</option>
                  <option value="webhook">Webhook</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label>
                GitHub repo
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
            </>
          ) : null}

          <button className="btn btn-accent" type="submit">
            Save preferences
          </button>
        </form>
      </div>
    </Shell>
  );
}
