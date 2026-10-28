import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Shell from '../components/Shell';
import { api } from '../api';
import { useAuth } from '../auth';

type Campaign = {
  _id: string;
  topic: string;
  status: string;
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
  video: {
    heygenPrompt?: string;
    script?: string;
    videoUrl?: string;
    heygenVideoId?: string;
    status?: string;
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
};

export default function CampaignPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const row = await api<Campaign>(`/campaigns/${id}`, { token });
    setCampaign(row);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
  }, [id]);

  async function approve() {
    setBusy(true);
    setError('');
    try {
      const row = await api<Campaign>(`/campaigns/${id}/approve`, {
        method: 'POST',
        token,
      });
      setCampaign(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusy(false);
    }
  }

  if (!campaign) {
    return (
      <Shell>
        <p className="muted">{error || 'Loading campaign…'}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="card stack" style={{ marginBottom: 16 }}>
        <div className="row">
          <Link to="/" className="muted">
            ← Back
          </Link>
          <span className="badge warn">{campaign.status.replace('_', ' ')}</span>
          {campaign.publishResult?.dryRun ? (
            <span className="badge">dry-run</span>
          ) : null}
        </div>
        <h2>{campaign.blog?.title || campaign.topic}</h2>
        <p className="muted">{campaign.topic}</p>
        <div className="row">
          {(campaign.status === 'pending_approval' ||
            campaign.status === 'approved' ||
            campaign.status === 'failed') && (
            <button
              className="btn btn-primary"
              disabled={busy}
              type="button"
              onClick={approve}
            >
              {busy ? 'Publishing…' : 'Approve & publish'}
            </button>
          )}
        </div>
        {error ? <p className="error">{error}</p> : null}
        {campaign.publishResult?.facebookPostId ? (
          <p className="muted">
            FB: {campaign.publishResult.facebookPostId} · IG:{' '}
            {campaign.publishResult.instagramMediaId} ·{' '}
            {campaign.publishResult.blogGit} {campaign.publishResult.blogWebhook}
          </p>
        ) : null}
      </div>

      <div className="grid-2">
        <div className="card stack">
          <h3>Keywords</h3>
          <div className="row">
            {campaign.keywords?.map((k) => (
              <span className="badge" key={k}>
                {k}
              </span>
            ))}
          </div>
          <h3>Blog</h3>
          <p className="muted">{campaign.blog?.excerpt}</p>
          <div className="pre">{campaign.blog?.bodyMarkdown}</div>
        </div>
        <div className="card stack">
          <h3>Facebook</h3>
          <div className="pre">{campaign.social?.facebook}</div>
          <h3>Instagram</h3>
          <div className="pre">{campaign.social?.instagram}</div>
          <h3>Video / Reels brief</h3>
          <p className="muted">
            HeyGen status: {campaign.video?.status || 'n/a'}{' '}
            {campaign.video?.heygenVideoId
              ? `(${campaign.video.heygenVideoId})`
              : ''}
          </p>
          <div className="pre">{campaign.video?.script}</div>
          <div className="pre">{campaign.video?.heygenPrompt}</div>
        </div>
      </div>
    </Shell>
  );
}
