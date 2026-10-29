import { useId } from 'react';

export type BrandId =
  | 'facebook'
  | 'instagram'
  | 'meta'
  | 'cursor'
  | 'google'
  | 'heygen'
  | 'dataforseo'
  | 'blog';

const LABELS: Record<BrandId, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  meta: 'Meta',
  cursor: 'Cursor',
  google: 'Google Flow',
  heygen: 'HeyGen',
  dataforseo: 'DataForSEO',
  blog: 'Blog',
};

function Icon({ id, gradId }: { id: BrandId; gradId: string }) {
  switch (id) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#1877F2" />
          <path
            fill="#fff"
            d="M16.5 12.3h-2.1v7.2h-3v-7.2H9.6v-2.5h1.8V8.3c0-1.8 1.1-2.8 2.7-2.8.8 0 1.5.1 1.7.1v2h-1.2c-.9 0-1.1.4-1.1 1.1v1.2h2.3l-.3 2.4z"
          />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="4" y1="22" x2="20" y2="2" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F58529" />
              <stop offset="0.35" stopColor="#DD2A7B" />
              <stop offset="0.7" stopColor="#8134AF" />
              <stop offset="1" stopColor="#515BD4" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill={`url(#${gradId})`} />
          <rect
            x="6.2"
            y="6.2"
            width="11.6"
            height="11.6"
            rx="3.4"
            stroke="#fff"
            strokeWidth="1.7"
            fill="none"
          />
          <circle cx="12" cy="12" r="2.9" stroke="#fff" strokeWidth="1.7" fill="none" />
          <circle cx="16.2" cy="7.8" r="1.05" fill="#fff" />
        </svg>
      );
    case 'meta':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#0668E1" />
          <path
            fill="#fff"
            d="M8.2 15.6c-.9 1.3-1.8 2-2.7 2-.6 0-.9-.4-.9-1.1 0-.9.5-2 1.4-3.5.9-1.4 1.8-2.2 2.7-2.2.6 0 .9.4.9 1.1 0 .9-.5 2-1.4 3.7zm4.6-5.7c-.9 0-1.7.9-2.4 2.4l-.4.9c.8-1.1 1.6-1.7 2.4-1.7.6 0 .9.4.9 1.1 0 .4-.1.9-.4 1.5-.5.9-1.1 1.8-1.8 2.7-.5.7-.9 1-1.3 1h-.1c.9 0 1.8-.9 2.6-2.5l.5-1c.8 1.2 1.6 1.8 2.4 1.8.6 0 .9-.4.9-1.1 0-.9-.5-2.1-1.4-3.6-.8-1.4-1.7-2.1-2.5-2.1zm5.6 2c-.9 0-1.7.8-2.4 2.3-.6 1.3-.9 2.4-.9 3.2 0 .7.3 1.1.9 1.1.9 0 1.8-.8 2.5-2.3.6-1.3.9-2.4.9-3.2 0-.7-.3-1.1-.9-1.1h-.1z"
          />
        </svg>
      );
    case 'cursor':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#101010" />
          <path fill="#fff" d="M7 5.5 17.5 12 10.2 13.4 7 18.5V5.5Z" />
        </svg>
      );
    case 'google':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#fff" stroke="#E5E7EB" />
          <path
            fill="#4285F4"
            d="M18.6 12.2c0-.5-.05-.9-.13-1.3H12v2.5h3.7c-.16.9-.66 1.7-1.4 2.2v1.8h2.3c1.3-1.2 2-3 2-5.2z"
          />
          <path
            fill="#34A853"
            d="M12 19c1.9 0 3.5-.6 4.7-1.7l-2.3-1.8c-.6.4-1.5.7-2.4.7-1.9 0-3.4-1.3-4-3H5.6v1.9C6.8 17.6 9.2 19 12 19z"
          />
          <path
            fill="#FBBC05"
            d="M8 12.2c0-.5.1-1 .1-1.4V9H5.6C5.2 9.9 5 10.9 5 12.2c0 1.2.3 2.3.8 3.2L8 13.6c-.2-.4-.3-.9-.3-1.4z"
          />
          <path
            fill="#EA4335"
            d="M12 7.8c1 0 2 .4 2.7 1.1l2-2C15.5 5.6 13.9 5 12 5 9.2 5 6.8 6.4 5.6 8.9L8 10.8c.6-1.7 2.2-3 4-3z"
          />
        </svg>
      );
    case 'heygen':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#6C47FF" />
          <path
            fill="#fff"
            d="M7.5 7h2.2v4.1H14V7h2.2v10H14v-4.1H9.7V17H7.5V7z"
          />
        </svg>
      );
    case 'dataforseo':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#0EA5E9" />
          <path
            fill="#fff"
            d="M7 16.5 10.2 8h2.1l3.2 8.5h-2.3l-.6-1.7H9.9l-.6 1.7H7zm3.4-3.5h2.7L11.7 9.4 10.4 13z"
          />
        </svg>
      );
    case 'blog':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#FF6A3D" />
          <path
            fill="#fff"
            d="M7 7.5h10v2H7v-2zm0 3.5h10v2H7v-2zm0 3.5h7v2H7v-2z"
          />
        </svg>
      );
  }
}

type Props = {
  id: BrandId;
  label?: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md';
};

/** Product / social brand chip with recognizable mark + name. */
export default function BrandMark({
  id,
  label,
  hideLabel,
  size = 'md',
}: Props) {
  const gradId = `brand-grad-${useId().replace(/:/g, '')}`;
  return (
    <span className={`brand-chip size-${size}`}>
      <span className="brand-chip-icon">
        <Icon id={id} gradId={gradId} />
      </span>
      {hideLabel ? null : <span>{label || LABELS[id]}</span>}
    </span>
  );
}
