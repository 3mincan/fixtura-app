import type { Match } from '@/types/match';

export function formatMatchSchedule(match: Match): string | null {
  if (!match.scheduledDate) {
    return null;
  }

  const parts = [match.scheduledDate];

  if (match.scheduledTime) {
    parts.push(match.scheduledTime);
  }

  if (match.round) {
    parts.unshift(match.round);
  }

  return parts.join(' · ');
}
