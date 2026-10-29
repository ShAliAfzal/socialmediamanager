import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Shell from '../components/Shell';
import PostJourney from '../components/PostJourney';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatWhen, statusLabel, statusTone } from '../lib/labels';
import { nextPublishAtFromClient } from '../lib/schedule';

type Campaign = {
  _id: string;
  topic: string;
  status: string;
  clientId: string;
  publishAt?: string | null;
  generateAt?: string | null;
  approvedForAutoPublish?: boolean;
  blog?: { title?: string };
};

type Client = {
  id: string;
  name: string;
  slug: string;
  postTimes?: string[];
  postWeekdays?: number[];
  generateLeadDays?: number;
  timezone?: string;
};

type FeedFocus = 'review' | 'upcoming' | 'live' | 'all';

function focusFromParam(value: string | null): FeedFocus {
  if (value === 'review' || value === 'upcoming' || value === 'live') return value;
  return 'all';
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [topic, setTopic] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);
  const [publishAt, setPublishAt] = useState('');
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '');
  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const focus = focusFromParam(searchParams.get('focus'));

  const isAdmin = user?.role === 'admin';

  function setFocus(next: FeedFocus) {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('focus');
    else params.set('focus', next);
    setSearchParams(params, { replace: true });
    requestAnimationFrame(() => {
      document.getElementById('feed-posts')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId],
  );

  function applyClientDefaults(client: Client | undefined, slot = 0) {
    if (!client) return;
    setPublishAt(
      nextPublishAtFromClient({
        postTimes: client.postTimes,
        postWeekdays: client.postWeekdays,
        generateLeadDays: client.generateLeadDays,
        slotIndex: slot,
      }),
    );
  }

  async function load() {
    const rows = await api<Campaign[]>('/campaigns', { token });
    setCampaigns(rows);
    if (isAdmin) {
      const list = await api<Client[]>('/clients', { token });
      setClients(list);
      const fromQuery = searchParams.get('clientId');
      let nextId = clientId;
      if (fromQuery && list.some((c) => c.id === fromQuery)) {
        nextId = fromQuery;
      } else if (!clientId && list[0]) {
        nextId = list[0].id;
      }
      setClientId(nextId);
      const picked = list.find((c) => c.id === nextId) || list[0];
      applyClientDefaults(picked, 0);
    } else {
      setPublishAt(
        nextPublishAtFromClient({
          postTimes: ['10:00', '18:00'],
          generateLeadDays: 2,
        }),
      );
    }
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
  }, []);

  const needsReview = useMemo(
    () =>
      campaigns.filter((c) =>
        ['ready_for_review', 'pending_approval'].includes(c.status),
      ),
    [campaigns],
  );
  const upcoming = useMemo(
    () =>
      campaigns.filter((c) =>
        ['scheduled', 'approved', 'generating', 'draft'].includes(c.status),
      ),
    [campaigns],
  );
  const live = useMemo(
    () => campaigns.filter((c) => c.status === 'published'),
    [campaigns],
  );

  const focusedPosts = useMemo(() => {
    if (focus === 'review') return needsReview;
    if (focus === 'upcoming') return upcoming;
    if (focus === 'live') return live;
    return campaigns;
  }, [focus, needsReview, upcoming, live, campaigns]);

  const focusTitle =
    focus === 'review'
      ? 'Needs your review'
      : focus === 'upcoming'
        ? 'Upcoming posts'
        : focus === 'live'
          ? 'Live posts'
          : 'All posts';

  async function schedulePost(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api<Campaign>('/campaigns', {
        method: 'POST',
        token,
        body: JSON.stringify({
          topic,
          publishAt: new Date(publishAt).toISOString(),
          clientId: isAdmin ? clientId : undefined,
          generateNow: false,
        }),
      });
      setTopic('');
      applyClientDefaults(selectedClient, slotIndex);
      setMsg(
        'Post planned. We will draft it about two days before it goes live.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule');
    } finally {
      setBusy(false);
    }
  }

  async function runBatchNow() {
    setBatchBusy(true);
    setError('');
    try {
      await api('/campaigns/ops/run-batch', { method: 'POST', token });
      setMsg(
        'Checked schedules: created any due drafts and posted anything ready.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch failed');
    } finally {
      setBatchBusy(false);
    }
  }

  const slotLabels = selectedClient?.postTimes?.length
    ? selectedClient.postTimes
    : ['10:00', '18:00'];

  const spotlightStatus = useMemo(() => {
    if (needsReview[0]) return needsReview[0].status;
    if (upcoming[0]) return upcoming[0].status;
    const live = campaigns.find((c) => c.status === 'published');
    if (live) return 'published';
    return 'scheduled';
  }, [needsReview, upcoming, campaigns]);

  return (
    <Shell>
      <section className="page-intro">
        <div>
          <p className="eyebrow">{isAdmin ? 'Studio desk' : 'Your brand feed'}</p>
          <h2>
            {isAdmin
              ? 'Shape the week’s posts'
              : 'See what’s ready for you'}
          </h2>
          <p className="lede">
            {isAdmin
              ? 'Pick a client, a pain point, and a go-live time. We draft early so you can polish before it hits the feed.'
              : 'Review drafts for your brand, then approve or ask the team to post.'}
          </p>
        </div>
        <div className="stat-row" role="navigation" aria-label="Post filters">
          <button
            type="button"
            className={`stat stat-link ${focus === 'review' ? 'is-active' : ''}`}
            onClick={() => setFocus('review')}
          >
            <span className="muted">Needs review</span>
            <strong>{needsReview.length}</strong>
          </button>
          <button
            type="button"
            className={`stat stat-link ${focus === 'upcoming' ? 'is-active' : ''}`}
            onClick={() => setFocus('upcoming')}
          >
            <span className="muted">Upcoming</span>
            <strong>{upcoming.length}</strong>
          </button>
          <button
            type="button"
            className={`stat stat-link ${focus === 'live' ? 'is-active' : ''}`}
            onClick={() => setFocus('live')}
          >
            <span className="muted">Live</span>
            <strong>{live.length}</strong>
          </button>
        </div>
      </section>

      <PostJourney
        status={spotlightStatus}
        title={
          needsReview[0]?.blog?.title ||
          needsReview[0]?.topic ||
          upcoming[0]?.topic ||
          'Your next post on the track'
        }
        hasImage={spotlightStatus !== 'scheduled' && spotlightStatus !== 'draft'}
      />

      <div className="grid-2">
        <form className="card stack" onSubmit={schedulePost}>
          <h3>Plan a post</h3>
          <p className="muted small">
            Drafts arrive about two days before the post time.
          </p>
          {isAdmin ? (
            <label>
              Client
              <select
                value={clientId}
                onChange={(e) => {
                  const next = e.target.value;
                  setClientId(next);
                  const c = clients.find((x) => x.id === next);
                  applyClientDefaults(c, slotIndex);
                }}
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {isAdmin && clientId ? (
            <p className="muted small">
              Defaults from{' '}
              <Link to={`/clients/${clientId}/schedule`}>
                this client&apos;s schedule
              </Link>
              {selectedClient?.timezone ? ` · ${selectedClient.timezone}` : ''}
            </p>
          ) : null}
          <label>
            What is this post about?
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              minLength={4}
              placeholder="e.g. a customer pain point this post should speak to"
            />
          </label>
          {isAdmin ? (
            <label>
              Preferred slot
              <select
                value={slotIndex}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setSlotIndex(next);
                  applyClientDefaults(selectedClient, next);
                }}
              >
                {slotLabels.map((t, i) => (
                  <option key={`${t}-${i}`} value={i}>
                    {i === 0 ? `First (${t})` : `Second (${t})`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Post on (date & time)
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {msg ? <p className="success">{msg}</p> : null}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Schedule post'}
          </button>
          {isAdmin ? (
            <button
              className="btn btn-ghost"
              type="button"
              disabled={batchBusy}
              onClick={runBatchNow}
            >
              {batchBusy ? 'Running…' : 'Run schedule check now'}
            </button>
          ) : null}
        </form>

        <div className="card stack" id="feed-posts">
          <div className="row spread">
            <h3>{focusTitle}</h3>
            <div className="row">
              {focus !== 'all' ? (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setFocus('all')}
                >
                  Show all
                </button>
              ) : null}
              {isAdmin ? (
                <Link className="text-link" to="/agent">
                  Open AI agent
                </Link>
              ) : null}
            </div>
          </div>
          <div className="list">
            {focusedPosts.slice(0, 12).map((c) => (
              <Link
                key={c._id}
                className="list-item"
                to={`/campaigns/${c._id}`}
              >
                <div>
                  <strong>{c.blog?.title || c.topic}</strong>
                  <p className="muted small">
                    {c.publishAt
                      ? `Post ${formatWhen(c.publishAt)}`
                      : 'No post time set'}
                  </p>
                </div>
                <span className={`badge ${statusTone(c.status)}`}>
                  {statusLabel(c.status)}
                </span>
              </Link>
            ))}
            {!focusedPosts.length ? (
              <p className="muted">
                {focus === 'review'
                  ? 'Nothing waiting for review.'
                  : focus === 'upcoming'
                    ? 'No upcoming posts.'
                    : focus === 'live'
                      ? 'No live posts yet.'
                      : 'No posts yet. Plan one on the left.'}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
