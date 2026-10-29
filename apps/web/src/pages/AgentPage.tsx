import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import Shell from '../components/Shell';
import { api, uploadsUrl } from '../api';
import { useAuth } from '../auth';

type Client = { id: string; name: string; slug: string };

type AgentRun = {
  _id: string;
  clientId: string;
  taskType: 'image_post' | 'content_pack' | 'custom';
  instructions: string;
  topic?: string;
  status: string;
  summary?: string;
  result?: {
    social?: {
      facebook?: string;
      instagram?: string;
      hashtags?: string[];
    };
    blog?: {
      title?: string;
      excerpt?: string;
      bodyMarkdown?: string;
    };
    imagePrompt?: string;
    altText?: string;
    notes?: string;
    rawText?: string;
  };
  images?: Array<{ url: string; filename: string }>;
  error?: string;
  campaignId?: string | null;
  createdAt?: string;
};

type Settings = {
  cursorConfigured: boolean;
};

export default function AgentPage() {
  const { user, token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [cursorReady, setCursorReady] = useState(true);
  const [clientId, setClientId] = useState('');
  const [taskType, setTaskType] = useState<
    'image_post' | 'content_pack' | 'custom'
  >('image_post');
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState(
    'Create a clean Instagram carousel-style single image about ranking without sales. Operator tone.',
  );
  const [busy, setBusy] = useState(false);
  const [attachBusy, setAttachBusy] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AgentRun | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin' || !token) return;
    Promise.all([
      api<Client[]>('/clients', { token }),
      api<AgentRun[]>('/agent/runs', { token }),
      api<Settings>('/settings', { token }),
    ])
      .then(([list, runList, settings]) => {
        setClients(list);
        setRuns(runList);
        setCursorReady(Boolean(settings.cursorConfigured));
        setClientId((prev) => prev || list[0]?.id || '');
      })
      .catch((e) => setError(String(e.message || e)));
  }, [token, user?.role]);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  async function load() {
    const [list, runList, settings] = await Promise.all([
      api<Client[]>('/clients', { token }),
      api<AgentRun[]>('/agent/runs', { token }),
      api<Settings>('/settings', { token }),
    ]);
    setClients(list);
    setRuns(runList);
    setCursorReady(Boolean(settings.cursorConfigured));
    setClientId((prev) => prev || list[0]?.id || '');
  }

  async function onRun(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const run = await api<AgentRun>('/agent/runs', {
        method: 'POST',
        token,
        body: JSON.stringify({
          clientId,
          taskType,
          topic: topic || undefined,
          instructions,
        }),
      });
      setSelected(run);
      await load();
      if (run.status === 'failed') {
        setError(run.error || 'Agent run failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setBusy(false);
    }
  }

  async function attachCampaign(runId: string) {
    setAttachBusy(runId);
    setError('');
    try {
      const res = await api<{ run: AgentRun; campaign: { _id: string } }>(
        `/agent/runs/${runId}/to-campaign`,
        { method: 'POST', token },
      );
      setSelected(res.run);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attach failed');
    } finally {
      setAttachBusy('');
    }
  }

  const social = selected?.result?.social;
  const blog = selected?.result?.blog;

  return (
    <Shell>
      <div className="grid-2">
        <form className="card stack" onSubmit={onRun}>
          <h2>AI Agent</h2>
          <p className="muted">
            Create a full image post or content pack for a client in one run.
            Uses your <BrandMark id="cursor" size="sm" /> plan (including image
            generation).
          </p>

          {!cursorReady ? (
            <p className="error">
              <BrandMark id="cursor" size="sm" /> API key missing.{' '}
              <Link to="/settings">Add it in Settings</Link> first.
            </p>
          ) : (
            <span className="badge ok">
              <BrandMark id="cursor" size="sm" label="Cursor ready" />
            </span>
          )}

          <label>
            Client
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Task
            <select
              value={taskType}
              onChange={(e) =>
                setTaskType(
                  e.target.value as 'image_post' | 'content_pack' | 'custom',
                )
              }
            >
              <option value="image_post">Image post</option>
              <option value="content_pack">Content pack</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label>
            Topic (optional)
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic or brief for this post"
            />
          </label>

          <label>
            Instructions
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
              minLength={4}
              rows={5}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy || !cursorReady || !clientId}
          >
            {busy ? 'Running Cursor agent…' : 'Run agent'}
          </button>
        </form>

        <div className="card stack">
          <h3>Recent runs</h3>
          <div className="list">
            {runs.map((r) => (
              <button
                key={r._id}
                type="button"
                className="list-item"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                }}
                onClick={() => setSelected(r)}
              >
                <div>
                  <strong>
                    {r.taskType.replace('_', ' ')} · {r.topic || r.instructions.slice(0, 48)}
                  </strong>
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    {r.summary || r.error || 'No summary'}
                  </p>
                </div>
                <span
                  className={`badge ${
                    r.status === 'succeeded'
                      ? 'ok'
                      : r.status === 'failed'
                        ? 'bad'
                        : 'warn'
                  }`}
                >
                  {r.status}
                </span>
              </button>
            ))}
            {!runs.length ? (
              <p className="muted">No agent runs yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      {selected ? (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row">
            <h3 style={{ margin: 0 }}>
              Result · {selected.taskType.replace('_', ' ')}
            </h3>
            <span className="badge">{selected.status}</span>
            {selected.status === 'succeeded' && !selected.campaignId ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={attachBusy === selected._id}
                onClick={() => attachCampaign(selected._id)}
              >
                {attachBusy === selected._id
                  ? 'Creating…'
                  : 'Attach to campaign'}
              </button>
            ) : null}
            {selected.campaignId ? (
              <Link
                className="btn btn-ghost"
                to={`/campaigns/${selected.campaignId}`}
              >
                Open campaign
              </Link>
            ) : null}
          </div>

          {selected.summary ? (
            <p className="muted">{selected.summary}</p>
          ) : null}
          {selected.error ? <p className="error">{selected.error}</p> : null}

          {selected.images?.length ? (
            <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
              {selected.images.map((img) => (
                <a
                  key={img.url}
                  href={uploadsUrl(img.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={uploadsUrl(img.url)}
                    alt={img.filename}
                    style={{
                      maxWidth: 280,
                      maxHeight: 360,
                      borderRadius: 12,
                      display: 'block',
                    }}
                  />
                </a>
              ))}
            </div>
          ) : null}

          {social?.facebook ? (
            <>
              <h4>
                <BrandMark id="facebook" />
              </h4>
              <div className="pre">{social.facebook}</div>
            </>
          ) : null}
          {social?.instagram ? (
            <>
              <h4>
                <BrandMark id="instagram" />
              </h4>
              <div className="pre">{social.instagram}</div>
            </>
          ) : null}
          {blog?.title ? (
            <>
              <h4>
                <BrandMark id="blog" label={blog.title} />
              </h4>
              <p className="muted">{blog.excerpt}</p>
              {blog.bodyMarkdown ? (
                <div className="pre">{blog.bodyMarkdown}</div>
              ) : null}
            </>
          ) : null}
          {selected.result?.imagePrompt ? (
            <>
              <h4>Image prompt</h4>
              <div className="pre">{selected.result.imagePrompt}</div>
            </>
          ) : null}
          {selected.result?.notes ? (
            <>
              <h4>Notes</h4>
              <div className="pre">{String(selected.result.notes)}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </Shell>
  );
}
