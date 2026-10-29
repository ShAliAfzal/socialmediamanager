/** Build next datetime-local value from client post times + weekdays. */
export function nextPublishAtFromClient(input: {
  postTimes?: string[];
  postWeekdays?: number[];
  generateLeadDays?: number;
  /** Prefer this slot index (0 = morning, 1 = evening) */
  slotIndex?: number;
}): string {
  const times = input.postTimes?.length
    ? input.postTimes
    : ['10:00', '18:00'];
  const weekdays =
    input.postWeekdays?.length !== undefined && input.postWeekdays.length
      ? input.postWeekdays
      : [1, 2, 3, 4, 5];
  const lead = Math.max(0, input.generateLeadDays ?? 2);
  const slot = times[Math.min(input.slotIndex ?? 0, times.length - 1)] || '10:00';
  const [hh, mm] = slot.split(':').map((x) => Number(x) || 0);

  // Earliest sensible publish: now + lead days + a little buffer so generateAt is not in the past
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + lead + 1);
  earliest.setSeconds(0, 0);

  for (let offset = 0; offset < 21; offset++) {
    const d = new Date(earliest);
    d.setDate(earliest.getDate() + offset);
    d.setHours(hh, mm, 0, 0);
    if (!weekdays.includes(d.getDay())) continue;
    if (d.getTime() < Date.now() + lead * 24 * 60 * 60 * 1000) continue;
    return toLocalInput(d);
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + lead + 1);
  fallback.setHours(hh, mm, 0, 0);
  return toLocalInput(fallback);
}

export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];
