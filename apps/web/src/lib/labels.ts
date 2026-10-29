export function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'scheduled':
      return 'Scheduled';
    case 'generating':
      return 'Creating…';
    case 'ready_for_review':
    case 'pending_approval':
      return 'Ready to review';
    case 'approved':
      return 'Approved, waiting to post';
    case 'publishing':
      return 'Posting…';
    case 'published':
      return 'Live';
    case 'failed':
      return 'Needs attention';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function statusTone(status: string) {
  if (status === 'published') return 'ok';
  if (status === 'failed') return 'bad';
  if (
    status === 'ready_for_review' ||
    status === 'pending_approval' ||
    status === 'scheduled'
  )
    return 'warn';
  return '';
}

export function formatWhen(value?: string | Date | null) {
  if (!value) return 'n/a';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return 'n/a';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** datetime-local input value */
export function toLocalInputValue(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
