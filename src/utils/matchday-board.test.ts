import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MATCH_DURATION_MINUTES,
  parseMatchKickoff,
  UPCOMING_WINDOW_MS,
} from '@/utils/matchday-clock';
import {
  buildMatchdayBoard,
  buildTimelineBoard,
  getLiveBoardEntryRange,
  getTimelineCenteredScrollOffset,
  getTimelineFocusEntryRange,
  getTimelineCardFadeOpacity,
  getTimelineIdleScrollDelta,
  getTimelineScrollCompensationDelta,
  getTimelineRowOffset,
  stabilizeTimelineBoardEntries,
  TIMELINE_CARD_HEIGHT,
  TIMELINE_ROW_HEIGHT,
} from '@/utils/matchday-board';
import type { MatchdayBoardEntry } from '@/utils/matchday-board';
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

const korCze: Match = {
  id: 'group-A-kor-cze',
  stage: 'group',
  homeTeamId: 'kor',
  awayTeamId: 'cze',
  status: 'scheduled',
  groupId: 'A',
  round: 'Matchday 1',
  scheduledDate: '2026-06-11',
  scheduledTime: '20:00 UTC-6',
};

const completedKorCze: Match = {
  ...korCze,
  status: 'completed',
  result: { regulation: { home: 1, away: 2 } },
};

function clockFromKickoff(match: Match, offsetMinutes: number): Date {
  const kickoff = parseMatchKickoff(match);

  assert.ok(kickoff);
  return new Date(kickoff.getTime() + offsetMinutes * 60_000);
}

describe('buildMatchdayBoard', () => {
  it('orders matches by kickoff time', () => {
    const entries = buildMatchdayBoard({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      completedMatches: [],
      userPredictions: {},
      clock: new Date('2026-06-11T12:00:00'),
      clockPhaseActive: true,
    });

    const mexIndex = entries.findIndex((entry) => entry.match.id === mexRsa.id);
    const korIndex = entries.findIndex((entry) => entry.match.id === korCze.id);

    assert.ok(mexIndex >= 0);
    assert.ok(korIndex >= 0);
    assert.ok(mexIndex < korIndex);
  });

  it('shows live matches during their kickoff window', () => {
    const entries = buildMatchdayBoard({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      completedMatches: [],
      userPredictions: {},
      clock: clockFromKickoff(mexRsa, 30),
      clockPhaseActive: true,
    });

    const mexEntry = entries.find((entry) => entry.match.id === mexRsa.id);

    assert.equal(mexEntry?.status, 'live');
    assert.equal(mexEntry?.homeScore, 0);
    assert.equal(mexEntry?.awayScore, 0);
  });

  it('reveals live goals progressively before full time', () => {
    const previewMexRsa: Match = {
      ...mexRsa,
      status: 'completed',
      result: { regulation: { home: 2, away: 1 } },
    };
    const entries = buildMatchdayBoard({
      matchday: 'Matchday 1',
      userTeamId: 'kor',
      completedMatches: [],
      previewMatches: [previewMexRsa],
      userPredictions: {},
      clock: clockFromKickoff(mexRsa, 20),
      clockPhaseActive: true,
    });
    const finishedEntries = buildMatchdayBoard({
      matchday: 'Matchday 1',
      userTeamId: 'kor',
      completedMatches: [],
      previewMatches: [previewMexRsa],
      userPredictions: {},
      clock: clockFromKickoff(mexRsa, MATCH_DURATION_MINUTES),
      clockPhaseActive: true,
    });

    const liveEntry = entries.find((entry) => entry.match.id === mexRsa.id);
    const finishedEntry = finishedEntries.find((entry) => entry.match.id === mexRsa.id);

    assert.equal(liveEntry?.status, 'live');
    assert.ok((liveEntry?.homeScore ?? 0) + (liveEntry?.awayScore ?? 0) < 3);
    assert.equal(finishedEntry?.status, 'finished');
    assert.equal(finishedEntry?.homeScore, 2);
    assert.equal(finishedEntry?.awayScore, 1);
  });

  it('reveals finished scores once the clock passes full time', () => {
    const entries = buildMatchdayBoard({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      completedMatches: [completedKorCze],
      userPredictions: {},
      clock: clockFromKickoff(korCze, MATCH_DURATION_MINUTES),
      clockPhaseActive: true,
    });

    const korEntry = entries.find((entry) => entry.match.id === korCze.id);

    assert.equal(korEntry?.status, 'finished');
    assert.equal(korEntry?.homeScore, 1);
    assert.equal(korEntry?.awayScore, 2);
  });

  it('keeps finished matches visible even when kickoff is outside the 72-hour window', () => {
    const entries = buildTimelineBoard({
      userTeamId: 'mex',
      completedMatches: [completedKorCze],
      previewMatches: [],
      clock: new Date('2026-06-12T12:00:00'),
      clockPhaseActive: true,
    });

    assert.ok(entries.some((entry) => entry.match.id === korCze.id));
    assert.equal(
      entries.find((entry) => entry.match.id === korCze.id)?.status,
      'finished',
    );
  });

  it('shows scheduled matches more than one hour before kickoff', () => {
    const entries = buildMatchdayBoard({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      completedMatches: [],
      userPredictions: {},
      clock: clockFromKickoff(mexRsa, -UPCOMING_WINDOW_MS / 60_000),
      clockPhaseActive: true,
    });

    const mexEntry = entries.find((entry) => entry.match.id === mexRsa.id);
    const korEntry = entries.find((entry) => entry.match.id === korCze.id);

    assert.equal(mexEntry?.status, 'upcoming');
    assert.equal(korEntry?.status, 'scheduled');
  });

  it('shows every match in the active matchday before kickoff', () => {
    const start = clockFromKickoff(mexRsa, -UPCOMING_WINDOW_MS / 60_000);
    const entries = buildTimelineBoard({
      userTeamId: 'mex',
      completedMatches: [],
      previewMatches: [],
      clock: start,
      clockPhaseActive: true,
    });

    assert.ok(entries.length >= 2);
    assert.ok(entries.some((entry) => entry.status === 'scheduled'));
  });

  it('rolls the timeline forward as the clock enters the next 72-hour window', () => {
    const lateJune11 = buildTimelineBoard({
      userTeamId: 'mex',
      completedMatches: [],
      previewMatches: [completedKorCze],
      clock: clockFromKickoff(mexRsa, 120),
      clockPhaseActive: true,
    });
    const june12Morning = buildTimelineBoard({
      userTeamId: 'mex',
      completedMatches: [],
      previewMatches: [completedKorCze],
      clock: new Date('2026-06-12T10:00:00'),
      clockPhaseActive: true,
    });

    assert.ok(lateJune11.some((entry) => entry.match.id === korCze.id));
    assert.ok(june12Morning.some((entry) => entry.match.id === korCze.id));
    assert.ok(
      june12Morning.some((entry) => entry.match.round === 'Matchday 2'),
    );
  });

  it('moves from live to full time using preview results after 105 minutes', () => {
    const entries = buildMatchdayBoard({
      matchday: 'Matchday 1',
      userTeamId: 'mex',
      completedMatches: [],
      previewMatches: [completedKorCze],
      userPredictions: {},
      clock: clockFromKickoff(korCze, MATCH_DURATION_MINUTES),
      clockPhaseActive: true,
    });

    const korEntry = entries.find((entry) => entry.match.id === korCze.id);

    assert.equal(korEntry?.status, 'finished');
    assert.equal(korEntry?.homeScore, 1);
    assert.equal(korEntry?.awayScore, 2);
  });
});

describe('timeline board presentation helpers', () => {
  const entries: MatchdayBoardEntry[] = [
    {
      match: mexRsa,
      status: 'finished',
      homeScore: 1,
      awayScore: 0,
      isUserMatch: true,
      isRevealed: true,
      fadeOpacity: 0.38,
    },
    {
      match: korCze,
      status: 'live',
      homeScore: 0,
      awayScore: 0,
      isUserMatch: false,
      isRevealed: false,
      fadeOpacity: 1,
    },
    {
      match: { ...mexRsa, id: 'group-A-mex-kor' },
      status: 'upcoming',
      homeScore: null,
      awayScore: null,
      isUserMatch: true,
      isRevealed: false,
      fadeOpacity: 1,
    },
  ];

  it('finds the live entry range for centering', () => {
    assert.deepEqual(getLiveBoardEntryRange(entries), {
      firstIndex: 1,
      lastIndex: 1,
      centerIndex: 1,
    });
  });

  it('finds timeline focus from the simulated clock', () => {
    assert.deepEqual(
      getTimelineFocusEntryRange(entries, clockFromKickoff(korCze, 30)),
      {
        firstIndex: 1,
        lastIndex: 1,
        centerIndex: 1,
      },
    );
    assert.equal(
      getTimelineFocusEntryRange(entries, clockFromKickoff(mexRsa, -120)),
      null,
    );
  });

  it('fades full-time cards and keeps live or upcoming cards fully visible', () => {
    assert.equal(getTimelineCardFadeOpacity('finished'), 0.38);
    assert.equal(getTimelineCardFadeOpacity('live'), 1);
    assert.equal(getTimelineCardFadeOpacity('scheduled'), 1);
    assert.equal(getTimelineCardFadeOpacity('upcoming'), 1);
  });

  it('computes row offsets and idle scroll deltas from simulated minutes', () => {
    assert.equal(getTimelineRowOffset(2, 40), 40 + TIMELINE_ROW_HEIGHT * 2);
    assert.equal(getTimelineIdleScrollDelta(75), TIMELINE_ROW_HEIGHT);
    const viewportHeight = 600;
    const listTopPadding = 40;
    const centeredOffset =
      listTopPadding + TIMELINE_ROW_HEIGHT - (viewportHeight - TIMELINE_CARD_HEIGHT) / 2;
    assert.equal(getTimelineCenteredScrollOffset(1, listTopPadding, viewportHeight), Math.max(0, centeredOffset));
  });

  it('compensates scroll when the pinned live match index shifts', () => {
    assert.equal(getTimelineScrollCompensationDelta(3, 5, true), TIMELINE_ROW_HEIGHT * 2);
    assert.equal(getTimelineScrollCompensationDelta(3, 5, false), 0);
    assert.equal(getTimelineScrollCompensationDelta(3, 3, true), 0);
  });

  it('reuses unchanged timeline entries between updates', () => {
    const nextEntries: MatchdayBoardEntry[] = [
      { ...entries[0]!, homeScore: 2 },
      entries[1]!,
      entries[2]!,
    ];

    const stabilized = stabilizeTimelineBoardEntries(entries, nextEntries);

    assert.notEqual(stabilized[0], entries[0]);
    assert.equal(stabilized[1], entries[1]);
    assert.equal(stabilized[2], entries[2]);
  });
});
