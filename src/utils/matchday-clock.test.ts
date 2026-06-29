import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getMatchesForMatchday } from '@/data/worldcup-fixtures';
import { teams } from '@/data/teams';
import {
  advanceMatchdayClock,
  CLOCK_ADVANCE_IDLE_BATCH_MINUTES,
  CLOCK_ADVANCE_MATCH_BATCH_MINUTES,
  CLOCK_ADVANCE_OFF_DAY_BATCH_MINUTES,
  CLOCK_DISPLAY_STEP_MINUTES,
  getClockAdvanceBatchMinutes,
  getClockDisplayStepMinutes,
  getClockSubTickIntervalMs,
  getActiveTimelineMatchday,
  getClockTickIntervalMs,
  getInitialViewMatchday,
  getMatchdayClockStart,
  getTournamentClockStart,
  getVisibleTimelineFixtures,
  isFixtureVisibleInTimeline,
  TIMELINE_VISIBILITY_MS,
  getNextViewMatchday,
  isMatchdayViewComplete,
  isMatchFinishedAtClock,
  isMatchInProgressAtClock,
  isMatchKickoffReached,
  isMatchWithinUpcomingWindow,
  MATCH_DURATION_MINUTES,
  parseMatchKickoff,
  shouldOpenUserMatchFocus,
  capClockAtPendingUserMatchKickoff,
  capClockForUserGroupMatches,
  getUserGroupMatchAwaitingPrediction,
  isAnyUserGroupMatchAwaitingPrediction,
  isPendingUserMatchAwaitingPrediction,
  UPCOMING_WINDOW_MS,
} from '@/utils/matchday-clock';
import { getUserGroupMatches } from '@/utils/user-matches';
import type { Match } from '@/types/match';

const sampleMatch: Match = {
  id: 'group-A-mex-kor',
  stage: 'group',
  homeTeamId: 'mex',
  awayTeamId: 'kor',
  status: 'scheduled',
  groupId: 'A',
  round: 'Matchday 8',
  scheduledDate: '2026-06-18',
  scheduledTime: '19:00 UTC-6',
};

describe('matchday clock', () => {
  it('parses fixture kickoff times', () => {
    const kickoff = parseMatchKickoff(sampleMatch);

    assert.ok(kickoff);
    assert.equal(kickoff.getHours(), 19);
    assert.equal(kickoff.getMinutes(), 0);
  });

  it('advances one simulated hour per second while a match is live', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const duringMatch = new Date(kickoff.getTime() + 30 * 60_000);
    const batchMinutes = getClockAdvanceBatchMinutes({ clock: duringMatch });

    assert.equal(batchMinutes, CLOCK_ADVANCE_MATCH_BATCH_MINUTES);

    let clock = duringMatch;

    for (let step = 0; step < batchMinutes; step += CLOCK_DISPLAY_STEP_MINUTES) {
      clock = advanceMatchdayClock(clock, CLOCK_DISPLAY_STEP_MINUTES);
    }

    assert.equal(clock.getTime(), duringMatch.getTime() + batchMinutes * 60_000);
  });

  it('shows every minute within a live-match batch at normal speed', () => {
    const subStepMs = getClockSubTickIntervalMs('normal', CLOCK_ADVANCE_MATCH_BATCH_MINUTES);

    assert.equal(getClockTickIntervalMs('normal'), 1000);
    assert.equal(subStepMs, 16);
  });

  it('scales batch duration by simulation speed', () => {
    const batchMinutes = CLOCK_ADVANCE_MATCH_BATCH_MINUTES;
    const stepCount = batchMinutes / getClockDisplayStepMinutes(batchMinutes);
    const totalMs = (speed: 'slow' | 'normal' | 'instant') =>
      getClockSubTickIntervalMs(speed, batchMinutes) * stepCount;

    assert.ok(totalMs('slow') > totalMs('normal'));
    assert.ok(totalMs('normal') > totalMs('instant'));
    assert.ok(totalMs('instant') <= getClockTickIntervalMs('instant'));
    assert.ok(totalMs('normal') <= getClockTickIntervalMs('normal'));
    assert.ok(totalMs('slow') <= getClockTickIntervalMs('slow'));
  });

  it('allows late knockout rounds to override live-match batch duration', () => {
    const batchMinutes = CLOCK_ADVANCE_MATCH_BATCH_MINUTES;
    const stepCount = batchMinutes / getClockDisplayStepMinutes(batchMinutes);
    const totalMs =
      getClockSubTickIntervalMs('instant', batchMinutes, { matchBatchDurationMs: 5_000 }) *
      stepCount;

    assert.ok(totalMs <= 5_000);
    assert.ok(totalMs > getClockTickIntervalMs('slow'));
  });

  it('advances six simulated hours per second when no match is live on a fixture day', () => {
    const start = new Date('2026-06-11T12:00:00');
    const batchMinutes = getClockAdvanceBatchMinutes({ clock: start });

    assert.equal(batchMinutes, CLOCK_ADVANCE_IDLE_BATCH_MINUTES);

    let clock = start;

    for (let step = 0; step < batchMinutes; step += CLOCK_DISPLAY_STEP_MINUTES) {
      clock = advanceMatchdayClock(clock, CLOCK_DISPLAY_STEP_MINUTES);
    }

    assert.equal(clock.getHours(), 18);
    assert.equal(clock.getMinutes(), 0);
  });

  it('shows every minute within an idle batch', () => {
    const subStepMs = getClockSubTickIntervalMs('normal', CLOCK_ADVANCE_IDLE_BATCH_MINUTES);

    assert.equal(subStepMs, 16);
  });

  it('advances a full day in one batch on days without fixtures', () => {
    const batchMinutes = getClockAdvanceBatchMinutes({
      clock: new Date('2026-06-10T12:00:00'),
    });

    assert.equal(batchMinutes, CLOCK_ADVANCE_OFF_DAY_BATCH_MINUTES);
  });

  it('marks a match live once kickoff is reached', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const beforeKickoff = new Date(kickoff.getTime() - 60_000);
    const duringMatch = new Date(kickoff.getTime() + 30 * 60_000);

    assert.equal(isMatchKickoffReached(sampleMatch, beforeKickoff), false);
    assert.equal(isMatchKickoffReached(sampleMatch, kickoff), true);
    assert.equal(isMatchInProgressAtClock(sampleMatch, duringMatch), true);
  });

  it('opens the user match focus screen from kickoff until prediction is saved', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const beforeFocusWindow = new Date(kickoff.getTime() - UPCOMING_WINDOW_MS - 60_000);
    const duringMatch = new Date(kickoff.getTime() + 30 * 60_000);
    const fullTime = new Date(kickoff.getTime() + MATCH_DURATION_MINUTES * 60_000);

    assert.equal(shouldOpenUserMatchFocus(sampleMatch, beforeFocusWindow, false), false);
    assert.equal(
      shouldOpenUserMatchFocus(
        sampleMatch,
        new Date(kickoff.getTime() - UPCOMING_WINDOW_MS),
        false,
      ),
      true,
    );
    assert.equal(shouldOpenUserMatchFocus(sampleMatch, kickoff, false), true);
    assert.equal(shouldOpenUserMatchFocus(sampleMatch, duringMatch, false), true);
    assert.equal(shouldOpenUserMatchFocus(sampleMatch, duringMatch, true), false);
    assert.equal(shouldOpenUserMatchFocus(sampleMatch, fullTime, false), true);
  });

  it('caps simulated clock advancement at the pending user match kickoff', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const beforeFocusWindow = new Date(kickoff.getTime() - 6 * 60 * 60_000);
    const proposedAfterKickoff = new Date(kickoff.getTime() + 2 * 60 * 60_000);
    const justBeforeKickoff = new Date(kickoff.getTime() - 30 * 60_000);

    assert.equal(
      capClockAtPendingUserMatchKickoff(
        beforeFocusWindow,
        proposedAfterKickoff,
        sampleMatch,
        {},
      ).getTime(),
      kickoff.getTime() - UPCOMING_WINDOW_MS,
    );
    assert.equal(
      capClockAtPendingUserMatchKickoff(
        justBeforeKickoff,
        proposedAfterKickoff,
        sampleMatch,
        {},
      ).getTime(),
      kickoff.getTime(),
    );
    assert.equal(
      capClockAtPendingUserMatchKickoff(
        beforeFocusWindow,
        proposedAfterKickoff,
        sampleMatch,
        { [sampleMatch.id]: { home: 1, away: 0 } },
      ).getTime(),
      proposedAfterKickoff.getTime(),
    );
  });

  it('caps clock advancement one hour before kickoff for Turkey matchday 9', () => {
    const turMatch = getUserGroupMatches('tur', teams)[1]!;
    const kickoff = parseMatchKickoff(turMatch)!;
    const beforeFocus = new Date(kickoff.getTime() - UPCOMING_WINDOW_MS - 30 * 60_000);
    const proposedAfterFocus = new Date(kickoff.getTime() - 15 * 60_000);

    assert.equal(
      capClockForUserGroupMatches(
        beforeFocus,
        proposedAfterFocus,
        'tur',
        teams,
        {},
      ).getTime(),
      kickoff.getTime() - UPCOMING_WINDOW_MS,
    );
    assert.equal(
      getUserGroupMatchAwaitingPrediction(
        'tur',
        teams,
        new Date(kickoff.getTime() - UPCOMING_WINDOW_MS),
        {},
      )?.id,
      'group-D-tur-par',
    );
  });

  it('does not pause or cap the clock for auto-simulated user matches', () => {
    const turMatch = getUserGroupMatches('tur', teams)[1]!;
    const kickoff = parseMatchKickoff(turMatch)!;
    const beforeFocus = new Date(kickoff.getTime() - UPCOMING_WINDOW_MS - 30 * 60_000);
    const proposedAfterFocus = new Date(kickoff.getTime() - 15 * 60_000);

    assert.equal(
      isAnyUserGroupMatchAwaitingPrediction('tur', teams, proposedAfterFocus, {}, true),
      false,
    );
    assert.equal(
      capClockForUserGroupMatches(
        beforeFocus,
        proposedAfterFocus,
        'tur',
        teams,
        {},
        true,
      ).getTime(),
      proposedAfterFocus.getTime(),
    );
  });

  it('freezes clock advancement while a pending user match is live', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const duringMatch = new Date(kickoff.getTime() + 30 * 60_000);
    const proposedAfterKickoff = new Date(kickoff.getTime() + 2 * 60 * 60_000);

    assert.equal(
      capClockAtPendingUserMatchKickoff(
        duringMatch,
        proposedAfterKickoff,
        sampleMatch,
        {},
      ).getTime(),
      duringMatch.getTime(),
    );
  });

  it('detects when the pending user match is waiting for a prediction', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const beforeFocusWindow = new Date(kickoff.getTime() - UPCOMING_WINDOW_MS - 60_000);
    const oneHourBefore = new Date(kickoff.getTime() - UPCOMING_WINDOW_MS);

    assert.equal(
      isPendingUserMatchAwaitingPrediction(sampleMatch, beforeFocusWindow, {}),
      false,
    );
    assert.equal(isPendingUserMatchAwaitingPrediction(sampleMatch, oneHourBefore, {}), true);
    assert.equal(isPendingUserMatchAwaitingPrediction(sampleMatch, kickoff, {}), true);
    assert.equal(
      isPendingUserMatchAwaitingPrediction(sampleMatch, kickoff, {
        [sampleMatch.id]: { home: 2, away: 1 },
      }),
      false,
    );
  });

  it('does not wait for a prediction when the match already has an official result', () => {
    const kickoff = parseMatchKickoff({ ...sampleMatch, id: 'group-A-mex-rsa' })!;

    assert.equal(
      isPendingUserMatchAwaitingPrediction(
        { ...sampleMatch, id: 'group-A-mex-rsa' },
        kickoff,
        {},
      ),
      false,
    );
  });

  it('starts a matchday at the earliest kickoff', () => {
    const start = getMatchdayClockStart('Matchday 1');

    assert.ok(start);
    assert.ok(start.getTime() <= parseMatchKickoff(sampleMatch)!.getTime());
  });

  it('anchors tournament clock to the first fixture on or after a requested start date', () => {
    const fixtures: Match[] = [
      {
        ...sampleMatch,
        id: 'round-of-32-early',
        stage: 'round-of-32',
        scheduledDate: '2026-06-28',
        scheduledTime: '18:00 UTC-4',
      },
      {
        ...sampleMatch,
        id: 'round-of-32-today',
        stage: 'round-of-32',
        scheduledDate: '2026-06-29',
        scheduledTime: '16:30 UTC-4',
      },
      {
        ...sampleMatch,
        id: 'round-of-32-later',
        stage: 'round-of-32',
        scheduledDate: '2026-06-30',
        scheduledTime: '12:00 UTC-4',
      },
    ];

    const start = getTournamentClockStart(fixtures, { startDate: '2026-06-29' });

    assert.ok(start);
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 5);
    assert.equal(start.getDate(), 29);
    assert.equal(start.getHours(), 16);
    assert.equal(start.getMinutes(), 30);
  });

  it('uses a 105 minute match duration including halftime', () => {
    assert.equal(MATCH_DURATION_MINUTES, 105);
  });

  it('marks a match finished after 105 minutes', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const fullTime = new Date(kickoff.getTime() + MATCH_DURATION_MINUTES * 60_000);

    assert.equal(isMatchFinishedAtClock(sampleMatch, kickoff), false);
    assert.equal(isMatchFinishedAtClock(sampleMatch, fullTime), true);
  });

  it('detects when every simulated matchday result has been shown', () => {
    const kickoff = parseMatchKickoff(sampleMatch)!;
    const fullTime = new Date(kickoff.getTime() + MATCH_DURATION_MINUTES * 60_000);
    const completedMatch: Match = {
      ...sampleMatch,
      status: 'completed',
      result: { regulation: { home: 2, away: 1 } },
    };

    assert.equal(
      isMatchdayViewComplete('Matchday 1', fullTime, [completedMatch]),
      false,
    );
  });

  it('starts a new tournament on matchday 1 even when the user team plays later', () => {
    const suiMatches = getUserGroupMatches('sui', teams);

    assert.equal(suiMatches[0]?.round, 'Matchday 3');
    assert.equal(getInitialViewMatchday([]), 'Matchday 1');
  });

  it('moves through matchdays in tournament order', () => {
    assert.equal(getNextViewMatchday('Matchday 1'), 'Matchday 2');
    assert.equal(getNextViewMatchday('Matchday 3'), 'Matchday 4');
  });

  it('shows only fixtures kicking off within the next 72 hours', () => {
    const start = getMatchdayClockStart('Matchday 1')!;
    const visible = getVisibleTimelineFixtures(start);
    const matchdayOne = getMatchesForMatchday('Matchday 1');
    const windowEnd = start.getTime() + TIMELINE_VISIBILITY_MS;

    assert.equal(getActiveTimelineMatchday(start), 'Matchday 1');
    assert.ok(visible.length > matchdayOne.length);
    assert.ok(
      matchdayOne.every((fixture) =>
        visible.some((visibleFixture) => visibleFixture.id === fixture.id),
      ),
    );
    assert.ok(
      visible.every((fixture) => {
        const kickoff = parseMatchKickoff(fixture)!;

        return (
          kickoff.getTime() >= start.getTime() && kickoff.getTime() <= windowEnd
        );
      }),
    );
  });

  it('keeps finished fixtures and adds the next day inside the 72-hour window', () => {
    const afterMatchdayOne = new Date('2026-06-11T22:30:00');
    const visible = getVisibleTimelineFixtures(afterMatchdayOne);
    const visibleIds = new Set(visible.map((fixture) => fixture.id));
    const matchdayOneIds = new Set(
      getMatchesForMatchday('Matchday 1').map((fixture) => fixture.id),
    );

    assert.equal(getActiveTimelineMatchday(afterMatchdayOne), 'Matchday 2');
    assert.equal(
      [...matchdayOneIds].every((id) => visibleIds.has(id)),
      true,
    );
    assert.ok(
      visible.some((fixture) => fixture.round === 'Matchday 2'),
      'expected upcoming fixtures from the next matchday inside the window',
    );
  });

  it('keeps in-progress fixtures visible even after kickoff', () => {
    const clock = new Date('2026-06-11T13:30:00');
    const mexRsa = getMatchesForMatchday('Matchday 1').find(
      (fixture) => fixture.homeTeamId === 'mex',
    )!;

    assert.equal(isFixtureVisibleInTimeline(mexRsa, clock), true);
  });

  it('marks fixtures upcoming only within one hour of kickoff', () => {
    const mexRsa = getMatchesForMatchday('Matchday 1').find(
      (fixture) => fixture.homeTeamId === 'mex',
    )!;

    assert.equal(isMatchWithinUpcomingWindow(mexRsa, new Date('2026-06-11T12:00:00')), true);
    assert.equal(isMatchWithinUpcomingWindow(mexRsa, new Date('2026-06-11T11:00:00')), false);
    assert.equal(isMatchWithinUpcomingWindow(mexRsa, new Date('2026-06-11T13:00:00')), false);
  });
});
