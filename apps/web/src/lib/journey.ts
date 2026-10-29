export type JourneyStepId =
  | 'spark'
  | 'draft'
  | 'frame'
  | 'polish'
  | 'live';

export const JOURNEY_STEPS: Array<{
  id: JourneyStepId;
  title: string;
  hint: string;
}> = [
  { id: 'spark', title: 'Spark', hint: 'Topic locked in' },
  { id: 'draft', title: 'Draft', hint: 'Captions and blog' },
  { id: 'frame', title: 'Frame', hint: 'Visual ready' },
  { id: 'polish', title: 'Polish', hint: 'Your review' },
  { id: 'live', title: 'Live', hint: 'On the feed' },
];

/** Map campaign status to how far the post has traveled. */
export function journeyIndexFromStatus(status?: string): number {
  switch (status) {
    case 'draft':
    case 'scheduled':
      return 0;
    case 'generating':
      return 1;
    case 'ready_for_review':
    case 'pending_approval':
    case 'approved':
    case 'publishing':
    case 'failed':
      return 3;
    case 'published':
      return 4;
    default:
      return 0;
  }
}
