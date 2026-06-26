import { getMatchesForMatchday, worldCupGroupFixtures } from '@/data/worldcup-fixtures';
import type { Match, PeriodScore } from '@/types/match';
import {
  getVisibleTimelineFixtures,
  isMatchFinishedAtClock,
  isMatchInProgressAtClock,
  isMatchWithinUpcomingWindow,
  sortFixturesByKickoff,
} from '@/utils/matchday-clock';
import { getLiveScoreForMatch } from '@/utils/live-score-progress';
import { matchInvolvesTeam } from '@/utils/user-matches';

export type MatchCardStatus =
  | 'scheduled'
  | 'upcoming'
  | 'live'
  | 'your-match'
  | 'simulating'
  | 'finished';

export type MatchdayBoardEntry = {
  match: Match;
  status: MatchCardStatus;
  homeScore: number | null;
  awayScore: number | null;
  isUserMatch: boolean;
  isRevealed: boolean;
  fadeOpacity: number;
};

export const TIMELINE_CARD_HEIGHT = 154;
export const TIMELINE_CARD_SPACING = 12;
export const TIMELINE_ROW_HEIGHT = TIMELINE_CARD_HEIGHT + TIMELINE_CARD_SPACING;
export const TIMELINE_SCROLL_PX_PER_SIM_MINUTE = TIMELINE_ROW_HEIGHT / 75;

export function getTimelineRowOffset(index: number, listTopPadding = 0): number {
  return listTopPadding + TIMELINE_ROW_HEIGHT * index;
}

export function getTimelineCenteredScrollOffset(
  index: number,
  listTopPadding: number,
  viewportHeight: number,
): number {
  const rowOffset = getTimelineRowOffset(index, listTopPadding);
  const centeredOffset = rowOffset - (viewportHeight - TIMELINE_CARD_HEIGHT) / 2;

  return Math.max(0, centeredOffset);
}

export function getTimelineScrollCompensationDelta(
  previousFocusIndex: number,
  nextFocusIndex: number,
  sameFocusMatch: boolean,
): number {
  if (!sameFocusMatch || nextFocusIndex === previousFocusIndex) {
    return 0;
  }

  return (nextFocusIndex - previousFocusIndex) * TIMELINE_ROW_HEIGHT;
}

export function getTimelineIdleScrollDelta(stepMinutes: number): number {
  return stepMinutes * TIMELINE_SCROLL_PX_PER_SIM_MINUTE;
}

export function isLiveBoardStatus(status: MatchCardStatus): boolean {
  return status === 'live' || status === 'simulating';
}

export function getLiveBoardEntryRange(
  entries: MatchdayBoardEntry[],
): { firstIndex: number; lastIndex: number; centerIndex: number } | null {
  const liveIndices = entries
    .map((entry, index) => (isLiveBoardStatus(entry.status) ? index : -1))
    .filter((index) => index >= 0);

  if (liveIndices.length === 0) {
    return null;
  }

  const firstIndex = liveIndices[0]!;
  const lastIndex = liveIndices[liveIndices.length - 1]!;
  const centerIndex = liveIndices[Math.floor(liveIndices.length / 2)]!;

  return { firstIndex, lastIndex, centerIndex };
}

export function getTimelineFocusEntryRange(
  entries: MatchdayBoardEntry[],
  clock: Date,
): { firstIndex: number; lastIndex: number; centerIndex: number } | null {
  const focusIndices = entries
    .map((entry, index) =>
      isMatchInProgressAtClock(entry.match, clock) ? index : -1,
    )
    .filter((index) => index >= 0);

  if (focusIndices.length === 0) {
    return null;
  }

  const firstIndex = focusIndices[0]!;
  const lastIndex = focusIndices[focusIndices.length - 1]!;
  const centerIndex = focusIndices[Math.floor(focusIndices.length / 2)]!;

  return { firstIndex, lastIndex, centerIndex };
}

export const FINISHED_CARD_OPACITY = 0.38;

export function getTimelineCardFadeOpacity(status: MatchCardStatus): number {
  if (status === 'finished') {
    return FINISHED_CARD_OPACITY;
  }

  return 1;
}

export function areMatchdayBoardEntriesEqual(
  left: MatchdayBoardEntry,
  right: MatchdayBoardEntry,
): boolean {
  return (
    left.match.id === right.match.id &&
    left.status === right.status &&
    left.homeScore === right.homeScore &&
    left.awayScore === right.awayScore &&
    left.isUserMatch === right.isUserMatch &&
    left.isRevealed === right.isRevealed &&
    left.fadeOpacity === right.fadeOpacity
  );
}

export function stabilizeTimelineBoardEntries(
  previous: MatchdayBoardEntry[],
  next: MatchdayBoardEntry[],
): MatchdayBoardEntry[] {
  if (previous.length === 0) {
    return next;
  }

  const previousById = new Map(previous.map((entry) => [entry.match.id, entry]));

  return next.map((entry) => {
    const stableEntry = previousById.get(entry.match.id);

    if (stableEntry && areMatchdayBoardEntriesEqual(stableEntry, entry)) {
      return stableEntry;
    }

    return entry;
  });
}

function createBoardEntry(
  entry: Omit<MatchdayBoardEntry, 'fadeOpacity'>,
): MatchdayBoardEntry {
  return {
    ...entry,
    fadeOpacity: getTimelineCardFadeOpacity(entry.status),
  };
}

function getMatchScore(match: Match): { home: number; away: number } | null {
  const regulation = match.result?.regulation;

  if (!regulation) {
    return null;
  }

  return { home: regulation.home, away: regulation.away };
}

export function mergeMatchdayResults(
  completedMatches: Match[],
  previewMatches: Match[],
): Match[] {
  const mergedById = new Map<string, Match>();

  for (const match of previewMatches) {
    mergedById.set(match.id, match);
  }

  for (const match of completedMatches) {
    mergedById.set(match.id, match);
  }

  return [...mergedById.values()];
}

export function getActiveMatchday(
  pendingUserMatch: Match | null,
  completedMatches: Match[],
): string | null {
  if (pendingUserMatch?.round) {
    return pendingUserMatch.round;
  }

  const lastCompletedGroupMatch = [...completedMatches]
    .reverse()
    .find((match) => match.stage === 'group' && match.round);

  return lastCompletedGroupMatch?.round ?? 'Matchday 1';
}

function resolveClockDrivenStatus(input: {
  fixture: Match;
  resultMatch: Match | undefined;
  clock: Date;
  isUserMatch: boolean;
}): MatchdayBoardEntry {
  const { fixture, resultMatch, clock, isUserMatch } = input;
  const score = resultMatch ? getMatchScore(resultMatch) : null;

  if (score && isMatchFinishedAtClock(fixture, clock)) {
    return createBoardEntry({
      match: resultMatch!,
      status: 'finished',
      homeScore: score.home,
      awayScore: score.away,
      isUserMatch,
      isRevealed: true,
    });
  }

  if (isMatchInProgressAtClock(fixture, clock)) {
    if (score) {
      const liveScore = getLiveScoreForMatch(fixture, clock, score.home, score.away);

      return createBoardEntry({
        match: fixture,
        status: 'live',
        homeScore: liveScore.home,
        awayScore: liveScore.away,
        isUserMatch,
        isRevealed: liveScore.home > 0 || liveScore.away > 0,
      });
    }

    return createBoardEntry({
      match: fixture,
      status: 'live',
      homeScore: 0,
      awayScore: 0,
      isUserMatch,
      isRevealed: false,
    });
  }

  if (isMatchWithinUpcomingWindow(fixture, clock)) {
    return createBoardEntry({
      match: fixture,
      status: 'upcoming',
      homeScore: null,
      awayScore: null,
      isUserMatch,
      isRevealed: false,
    });
  }

  return createBoardEntry({
    match: fixture,
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
    isUserMatch,
    isRevealed: false,
  });
}

export function buildTimelineBoard(input: {
  userTeamId: string;
  completedMatches: Match[];
  previewMatches?: Match[];
  clock: Date;
  clockPhaseActive?: boolean;
  fixtures?: Match[];
}): MatchdayBoardEntry[] {
  const {
    userTeamId,
    completedMatches,
    previewMatches = [],
    clock,
    clockPhaseActive = true,
    fixtures = worldCupGroupFixtures,
  } = input;

  const resultById = new Map(
    mergeMatchdayResults(completedMatches, previewMatches).map((match) => [match.id, match]),
  );

  const visibleFixtures = getVisibleTimelineFixtures(clock, fixtures);

  return visibleFixtures.map((fixture) => {
    const resultMatch = resultById.get(fixture.id);
    const isUserMatch = matchInvolvesTeam(fixture, userTeamId);

    if (clockPhaseActive) {
      return resolveClockDrivenStatus({
        fixture,
        resultMatch,
        clock,
        isUserMatch,
      });
    }

    const score = resultMatch ? getMatchScore(resultMatch) : null;

    if (resultMatch && score) {
      return createBoardEntry({
        match: resultMatch,
        status: 'finished',
        homeScore: score.home,
        awayScore: score.away,
        isUserMatch,
        isRevealed: true,
      });
    }

    return createBoardEntry({
      match: fixture,
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      isUserMatch,
      isRevealed: false,
    });
  });
}

export function buildMatchdayBoard(input: {
  matchday: string;
  userTeamId: string;
  completedMatches: Match[];
  previewMatches?: Match[];
  userPredictions?: Record<string, PeriodScore>;
  clock?: Date | null;
  clockPhaseActive?: boolean;
}): MatchdayBoardEntry[] {
  const {
    matchday,
    userTeamId,
    completedMatches,
    previewMatches = [],
    clock = null,
    clockPhaseActive = false,
  } = input;

  const resultById = new Map(
    mergeMatchdayResults(completedMatches, previewMatches).map((match) => [match.id, match]),
  );

  return sortFixturesByKickoff(getMatchesForMatchday(matchday)).map((fixture) => {
    const resultMatch = resultById.get(fixture.id);
    const isUserMatch = matchInvolvesTeam(fixture, userTeamId);

    if (clockPhaseActive && clock) {
      return resolveClockDrivenStatus({
        fixture,
        resultMatch,
        clock,
        isUserMatch,
      });
    }

    const score = resultMatch ? getMatchScore(resultMatch) : null;

    if (resultMatch && score) {
      return createBoardEntry({
        match: resultMatch,
        status: 'finished',
        homeScore: score.home,
        awayScore: score.away,
        isUserMatch,
        isRevealed: true,
      });
    }

    return createBoardEntry({
      match: fixture,
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      isUserMatch,
      isRevealed: false,
    });
  });
}

export function formatTickerDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTickerTime(time: string | undefined): string {
  if (!time) {
    return '09:00';
  }

  return time.split(' ')[0] ?? '09:00';
}
