import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import Shell from '../components/Shell';
import PostJourney from '../components/PostJourney';
import { api, uploadsUrl } from '../api';
import { useAuth } from '../auth';
import {
  formatWhen,
  statusLabel,
  statusTone,
  toLocalInputValue,
} from '../lib/labels';

type Campaign = {
  _id: string;
  topic: string;
  status: string;
  publishAt?: string | null;
  generateAt?: string | null;
  approvedForAutoPublish?: boolean;
  keywords: string[];
  blog: {
    title?: string;
    slug?: string;
    excerpt?: string;
    focusKeyword?: string;
    bodyMarkdown?: string;
  };
  social: {
    facebook?: string;
    instagram?: string;
    hashtags?: string[];
  };
  media?: {
    imageUrl?: string;
    videoUrl?: string;
    imagePrompt?: string;
    altText?: string;
  };
  video: {
    heygenPrompt?: string;
    script?: string;
    videoUrl?: string;
    status?: string;
    provider?: string;
  };
  publishResult: {
    facebookPostId?: string;
    instagramMediaId?: string;
    blogGit?: string;
    blogWebhook?: string;
    dryRun?: boolean;
    error?: string;
    publishedAt?: string;
  };
  lastError?: string;
};

export default function CampaignPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const row = await api<Campaign>(`/campaigns/${id}`, { token });
    setCampaign(row);
    setFacebook(row.social?.facebook || '');
    setInstagram(row.social?.instagram || '');
    setImageUrl(row.media?.imageUrl || '');
    setVideoUrl(row.media?.videoUrl || row.video?.videoUrl || '');
    setPublishAt(toLocalInputValue(row.publishAt));
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
  }, [id]);

  async function saveReview(e: FormEvent) {
    e.preventDefault();
    setBusy('save');
    setError('');
    setMsg('');
    try {
      const row = await api<Campaign>(`/campaigns/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          publishAt: publishAt
            ? new Date(publishAt).toISOString()
            : undefined,
          social: { facebook, instagram },
          media: {
            imageUrl: imageUrl.trim() || undefined,
            videoUrl: videoUrl.trim() || undefined,
          },
        }),
      });
      setCampaign(row);
      setMsg('Saved. Approve for the planned time, or post now.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy('');
    }
  }

  async function generateNow() {
    setBusy('gen');
    setError('');
    try {
      const row = await api<Campaign>(`/campaigns/${id}/generate`, {
        method: 'POST',
        token,
      });
      setCampaign(row);
      setFacebook(row.social?.facebook || '');
      setInstagram(row.social?.instagram || '');
      setImageUrl(row.media?.imageUrl || '');
      setMsg('Full content pack ready for review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setBusy('');
    }
  }

  async function approve(publishNow: boolean) {
    setBusy(publishNow ? 'now' : 'approve');
    setError('');
    try {
      await api(`/campaigns/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          social: { facebook, instagram },
          media: {
            imageUrl: imageUrl.trim() || undefined,
            videoUrl: videoUrl.trim() || undefined,
          },
        }),
      });
      const row = await api<Campaign>(`/campaigns/${id}/approve`, {
        method: 'POST',
        token,
        body: JSON.stringify({ publishNow }),
      });
      setCampaign(row);
      setMsg(
        publishNow
          ? 'Posted (or test posted).'
          : 'Approved. It will go live at the planned time.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  if (!campaign) {
    return (
      <Shell>
        <p className="muted">{error || 'Loading…'}</p>
      </Shell>
    );
  }

  const previewImage = imageUrl
    ? uploadsUrl(imageUrl)
    : campaign.media?.imageUrl
      ? uploadsUrl(campaign.media.imageUrl)
      : '';

  const canReview = [
    'ready_for_review',
    'pending_approval',
    'approved',
    'failed',
    'scheduled',
    'draft',
  ].includes(campaign.status);

  return (
    <Shell>
      <div className="card stack" style={{ marginBottom: 16 }}>
        <div className="row">
          <Link to="/" className="text-link">
            ← All posts
          </Link>
          <span className={`badge ${statusTone(campaign.status)}`}>
            {statusLabel(campaign.status)}
          </span>
          {campaign.approvedForAutoPublish ? (
            <span className="badge ok">Auto-post on</span>
          ) : null}
        </div>
        <h2>{campaign.blog?.title || campaign.topic}</h2>
        <p className="lede">{campaign.topic}</p>
        <div className="meta-line">
          <span>Post time: {formatWhen(campaign.publishAt)}</span>
          <span>Prepare from: {formatWhen(campaign.generateAt)}</span>
        </div>
        {campaign.lastError || campaign.publishResult?.error ? (
          <p className="error">
            {campaign.lastError || campaign.publishResult?.error}
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {msg ? <p className="success">{msg}</p> : null}
        <div className="row">
          {user?.role === 'admin' &&
          ['scheduled', 'draft', 'failed'].includes(campaign.status) ? (
            <button
              className="btn btn-ghost"
              type="button"
              disabled={Boolean(busy)}
              onClick={generateNow}
            >
              {busy === 'gen' ? 'Creating…' : 'Create content now'}
            </button>
          ) : null}
        </div>
      </div>

      <PostJourney
        status={campaign.status}
        title={campaign.blog?.title || campaign.topic}
        hasImage={Boolean(previewImage || campaign.media?.imageUrl)}
      />

      <form className="grid-2" onSubmit={saveReview}>
        <div className="card stack">
          <h3>Captions</h3>
          <label>
            <BrandMark id="facebook" />
            <textarea
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              rows={6}
            />
          </label>
          <label>
            <BrandMark id="instagram" />
            <textarea
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              rows={6}
            />
          </label>
          <label>
            Post on
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </label>
        </div>

        <div className="card stack">
          <h3>Visual</h3>
          <p className="muted small">
            Keep the generated image, or paste your own image or video link.
          </p>
          {previewImage ? (
            <img
              className="preview-media"
              src={previewImage}
              alt={campaign.media?.altText || 'Post visual'}
            />
          ) : (
            <div className="empty-media">No image yet</div>
          )}
          <label>
            Image link
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… or /uploads/…"
            />
          </label>
          <label>
            Video link (optional)
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>

          {canReview ? (
            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="btn btn-ghost"
                type="submit"
                disabled={Boolean(busy)}
              >
                {busy === 'save' ? 'Saving…' : 'Save changes'}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={Boolean(busy)}
                onClick={() => approve(false)}
              >
                {busy === 'approve' ? 'Saving…' : 'Approve for schedule'}
              </button>
              <button
                className="btn btn-accent"
                type="button"
                disabled={Boolean(busy)}
                onClick={() => approve(true)}
              >
                {busy === 'now' ? 'Posting…' : 'Post now'}
              </button>
            </div>
          ) : null}
        </div>
      </form>

      {campaign.blog?.bodyMarkdown ? (
        <div className="card stack" style={{ marginTop: 16 }}>
          <h3>
            <BrandMark id="blog" label="Blog draft" />
          </h3>
          <p className="muted">{campaign.blog.excerpt}</p>
          <div className="pre">{campaign.blog.bodyMarkdown}</div>
        </div>
      ) : null}
    </Shell>
  );
}
