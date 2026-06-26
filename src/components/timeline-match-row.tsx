import { memo } from 'react';

import { MatchCard } from '@/components/match-card';
import type { MatchdayBoardEntry } from '@/utils/matchday-board';
import { isLiveBoardStatus } from '@/utils/matchday-board';

type TimelineMatchRowProps = {
  entry: MatchdayBoardEntry;
};

function TimelineMatchRowComponent({ entry }: TimelineMatchRowProps) {
  const animateScoreChanges = isLiveBoardStatus(entry.status);

  return (
    <MatchCard
      match={entry.match}
      status={entry.status}
      homeScore={entry.homeScore}
      awayScore={entry.awayScore}
      isUserMatch={entry.isUserMatch}
      fadeOpacity={entry.fadeOpacity}
      animateScoreChanges={animateScoreChanges}
    />
  );
}

export const TimelineMatchRow = memo(
  TimelineMatchRowComponent,
  (previous, next) => previous.entry === next.entry,
);
