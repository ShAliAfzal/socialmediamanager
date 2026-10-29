import { JOURNEY_STEPS, journeyIndexFromStatus } from '../lib/journey';

type Props = {
  status?: string;
  title?: string;
  hasImage?: boolean;
  compact?: boolean;
};

/**
 * Visual story of a social post moving from idea to live feed.
 * The post card travels the track as status advances.
 */
export default function PostJourney({
  status,
  title,
  hasImage,
  compact,
}: Props) {
  const index = journeyIndexFromStatus(status);
  const frameOn =
    hasImage ||
    index >= 2 ||
    ['ready_for_review', 'pending_approval', 'approved', 'publishing', 'published'].includes(
      status || '',
    );
  const draftOn = index >= 1 || frameOn;
  const progress = (index / (JOURNEY_STEPS.length - 1)) * 100;
  const active = JOURNEY_STEPS[index];

  return (
    <section
      className={`post-journey ${compact ? 'is-compact' : ''}`}
      aria-label="Post journey"
    >
      <div className="journey-copy">
        <p className="eyebrow">Post journey</p>
        <h3>{title || 'From spark to feed'}</h3>
        <p className="muted small">
          Now at {active.title}: words, visual, your polish, then live on
          Facebook and Instagram.
        </p>
      </div>

      <div className="journey-stage">
        <div className="journey-track" aria-hidden>
          <div className="journey-rail" />
          <div
            className="journey-rail-fill"
            style={{ width: `${progress}%` }}
          />
          {JOURNEY_STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`journey-node ${i <= index ? 'is-done' : ''} ${i === index ? 'is-active' : ''}`}
              style={{ left: `${(i / (JOURNEY_STEPS.length - 1)) * 100}%` }}
            >
              <span className="journey-dot" />
              <span className="journey-node-label">{step.title}</span>
            </div>
          ))}

          <div
            className={`journey-card ${draftOn ? 'has-draft' : ''} ${frameOn ? 'has-frame' : ''} ${index >= 4 ? 'is-live' : ''}`}
            style={{ left: `${progress}%` }}
          >
            <div className="journey-card-glow" />
            <div className="journey-card-body">
              <div className="journey-card-lines">
                <span />
                <span />
                <span />
              </div>
              <div className="journey-card-photo" />
            </div>
            <div className="journey-card-stamp">Live</div>
          </div>
        </div>

        <div className="journey-phone" aria-hidden>
          <div className={`phone-bezel ${index >= 4 ? 'is-receiving' : ''}`}>
            <div className="phone-notch" />
            <div className="phone-feed">
              <div className={`feed-post ${index >= 4 ? 'is-in' : ''}`}>
                <div className="feed-avatar" />
                <div className="feed-lines">
                  <span />
                  <span />
                </div>
                <div className="feed-image" />
              </div>
            </div>
          </div>
          <p className="phone-caption muted small">
            {index >= 4 ? 'Live on the feed' : 'Feed waiting'}
          </p>
        </div>
      </div>

      <ul className="journey-legend">
        {JOURNEY_STEPS.map((step, i) => (
          <li key={step.id} className={i <= index ? 'is-done' : ''}>
            <strong>{step.title}</strong>
            <span>{step.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
