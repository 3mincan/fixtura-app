import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildGoalTimeline,
  buildLiveScoreClockEvents,
  getLiveScoreAtPlayingMinute,
  getLiveScoreForMatch,
  getPlayingMinuteFromClockMinutes,
} from '@/utils/live-score-progress';
import { getMatchEndTime } from '@/utils/matchday-clock';
import type { Match } from '@/types/match';

const mexRsa: Match = {
  id: 'group-A-mex-rsa',
  stage: 'group',
  homeTeamId: 'mex',
  awayTeamId: 'rsa',
  status: 'scheduled',
  groupId: 'A',
  round: 'Matchday 1',
  scheduledDate: '2026-06-11',
  scheduledTime: '13:00 UTC-6',
};

describe('live score progress', () => {
  it('builds a deterministic goal timeline for a final scoreline', () => {
    const timeline = buildGoalTimeline('group-A-mex-rsa', 2, 1);

    assert.equal(timeline.length, 3);
    assert.equal(timeline.filter((event) => event.team === 'home').length, 2);
    assert.equal(timeline.filter((event) => event.team === 'away').length, 1);
    assert.deepEqual(buildGoalTimeline('group-A-mex-rsa', 2, 1), timeline);
  });

  it('reveals goals only after their playing minute is reached', () => {
    const timeline = buildGoalTimeline('group-A-mex-rsa', 2, 1);
    const firstGoalMinute = timeline[0]!.playingMinute;

    assert.deepEqual(getLiveScoreAtPlayingMinute(timeline, firstGoalMinute - 1), {
      home: 0,
      away: 0,
    });
    assert.equal(
      getLiveScoreAtPlayingMinute(timeline, firstGoalMinute).home +
        getLiveScoreAtPlayingMinute(timeline, firstGoalMinute).away,
      1,
    );
    assert.deepEqual(getLiveScoreAtPlayingMinute(timeline, 90), { home: 2, away: 1 });
  });

  it('maps clock minutes through halftime', () => {
    assert.equal(getPlayingMinuteFromClockMinutes(30), 30);
    assert.equal(getPlayingMinuteFromClockMinutes(50), 45);
    assert.equal(getPlayingMinuteFromClockMinutes(70), 55);
  });

  it('derives partial live scores from the simulated clock', () => {
    const clock = new Date('2026-06-11T13:20:00');
    const earlyScore = getLiveScoreForMatch(mexRsa, clock, 2, 1);
    const finalScore = getLiveScoreForMatch(
      mexRsa,
      getMatchEndTime(mexRsa)!,
      2,
      1,
    );

    assert.ok(earlyScore.home + earlyScore.away <= 3);
    assert.deepEqual(finalScore, { home: 2, away: 1 });
  });

  it('builds ordered clock events ending at full time', () => {
    const events = buildLiveScoreClockEvents(
      [mexRsa],
      new Map([['group-A-mex-rsa', { home: 1, away: 0 }]]),
      getMatchEndTime,
    );

    assert.ok(events.length >= 2);
    assert.equal(events.at(-1)?.kind, 'full-time');
    assert.ok(events[0]!.time.getTime() < events.at(-1)!.time.getTime());
  });
});
