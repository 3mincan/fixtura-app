import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  capClockAtPendingTimelinePrediction,
  shouldPauseForPendingTimelinePrediction,
} from '@/hooks/use-animated-matchday-clock';
import type { Match } from '@/types/match';

const knockoutMatch: Match = {
  id: 'round-of-32-1',
  stage: 'round-of-32',
  homeTeamId: 'mex',
  awayTeamId: 'kor',
  status: 'scheduled',
  scheduledDate: '2026-06-28',
  scheduledTime: '12:00 UTC-7',
};

describe('useAnimatedMatchdayClock helpers', () => {
  it('does not pause at pending knockout predictions when user matches are auto-simulated', () => {
    const kickoff = new Date('2026-06-28T12:00:00');

    assert.equal(
      shouldPauseForPendingTimelinePrediction({
        pendingUserMatch: knockoutMatch,
        clock: kickoff,
        userPredictions: {},
        autoSimulateUserMatches: true,
      }),
      false,
    );
  });

  it('does not cap knockout clock advancement when user matches are auto-simulated', () => {
    const beforeKickoff = new Date('2026-06-28T11:30:00');
    const proposedAfterKickoff = new Date('2026-06-28T13:00:00');

    assert.equal(
      capClockAtPendingTimelinePrediction({
        currentClock: beforeKickoff,
        proposedClock: proposedAfterKickoff,
        pendingUserMatch: knockoutMatch,
        userPredictions: {},
        autoSimulateUserMatches: true,
      }).getTime(),
      proposedAfterKickoff.getTime(),
    );
  });

  it('still pauses at pending knockout predictions in pick-team mode', () => {
    const kickoff = new Date('2026-06-28T12:00:00');

    assert.equal(
      shouldPauseForPendingTimelinePrediction({
        pendingUserMatch: knockoutMatch,
        clock: kickoff,
        userPredictions: {},
        autoSimulateUserMatches: false,
      }),
      true,
    );
  });
});
