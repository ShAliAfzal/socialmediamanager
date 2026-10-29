import { useId } from 'react';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showWordmark?: boolean;
  stacked?: boolean;
  align?: 'start' | 'center';
};

/**
 * Sparkdesk mark: a bold spark monogram (advertiseable app icon).
 * Reads as a shooting spark / share burst that also suggests an "S".
 */
export default function AppLogo({
  size = 'md',
  showWordmark = true,
  stacked = false,
  align = 'start',
}: Props) {
  const uid = useId().replace(/:/g, '');
  const px =
    size === 'hero' ? 112 : size === 'lg' ? 80 : size === 'sm' ? 40 : 52;
  const gFrame = `sd-frame-${uid}`;
  const gSpark = `sd-spark-${uid}`;
  const gGlow = `sd-glow-${uid}`;

  return (
    <div
      className={`app-logo ${stacked ? 'is-stacked' : ''} size-${size} align-${align}`}
      aria-label="Sparkdesk"
    >
      <svg
        className="app-logo-mark"
        width={px}
        height={px}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gFrame} x1="6" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFC107" />
            <stop offset="0.42" stopColor="#FF6A3D" />
            <stop offset="1" stopColor="#2B6CFF" />
          </linearGradient>
          <linearGradient id={gSpark} x1="18" y1="50" x2="46" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#FFF3C4" />
          </linearGradient>
          <radialGradient id={gGlow} cx="32" cy="30" r="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${gFrame})`} />
        <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${gGlow})`} />

        {/* Bold spark monogram — memorable silhouette */}
        <path
          d="M34 10 L28 28 H40 L26 54 L32 34 H20 L34 10 Z"
          fill={`url(#${gSpark})`}
          stroke="#FFFFFF"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Tiny orbit dots = social reach */}
        <circle cx="46" cy="18" r="2.6" fill="#FFFFFF" fillOpacity="0.95" />
        <circle cx="50" cy="28" r="1.8" fill="#FFFFFF" fillOpacity="0.75" />
        <circle cx="14" cy="44" r="2" fill="#FFFFFF" fillOpacity="0.7" />
      </svg>

      {showWordmark ? (
        <div className="app-logo-text">
          <strong>Sparkdesk</strong>
          <span>Social posts, ready to share</span>
        </div>
      ) : null}
    </div>
  );
}
