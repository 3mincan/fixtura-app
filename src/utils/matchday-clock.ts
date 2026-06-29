import {
  getMatchdayOrder,
  getMatchesForMatchday,
  hasOfficialFixtureResult,
  worldCupGroupFixtures,
} from '@/data/worldcup-fixtures';
import type { AppLanguage, SimulationSpeed } from '@/types/app-settings';
import { getClockLocale } from '@/i18n/supported-languages';
import type { Match, PeriodScore } from '@/types/match';
import type { Team } from '@/types/team';
import { getUserGroupMatches } from '@/utils/user-matches';

export const MATCH_HALF_MINUTES = 45;
export const MATCH_HALFTIME_MINUTES = 15;
export const MATCH_DURATION_MINUTES =
  MATCH_HALF_MINUTES * 2 + MATCH_HALFTIME_MINUTES;
export const CLOCK_ADVANCE_MATCH_BATCH_MINUTES = 60;
export const CLOCK_ADVANCE_IDLE_BATCH_MINUTES = 6 * 60;
export const CLOCK_ADVANCE_OFF_DAY_BATCH_MINUTES = 12 * 60;
export const CLOCK_DISPLAY_STEP_MINUTES = 1;
export const CLOCK_MAX_ANIMATION_STEPS = 60;
export const CLOCK_MIN_SUB_TICK_MS = 1;
export const TIMELINE_VISIBILITY_HOURS = 72;
export const TIMELINE_VISIBILITY_MS = TIMELINE_VISIBILITY_HOURS * 60 * 60 * 1000;
export const UPCOMING_WINDOW_MS = 60 * 60 * 1000;

const CLOCK_BATCH_MS: Record<SimulationSpeed, number> = {
  slow: 2000,
  normal: 1000,
  instant: 450,
};

type OfficialResultsOptions = {
  useOfficialResults?: boolean;
};

export const INSTANT_REVEAL_ANIMATION_MS = 450;
export const INSTANT_IDLE_STEP_MS = 180;

export function getClockTickIntervalMs(speed: SimulationSpeed): number {
  return CLOCK_BATCH_MS[speed];
}

export function getClockAdvanceBatchMinutes(input: {
  clock: Date;
  fixtures?: Match[];
}): number {
  const { clock, fixtures = worldCupGroupFixtures } = input;

  if (!hasMatchesOnClockDate(clock, fixtures)) {
    return CLOCK_ADVANCE_OFF_DAY_BATCH_MINUTES;
  }

  if (isAnyMatchInProgressAtClock(clock, fixtures)) {
    return CLOCK_ADVANCE_MATCH_BATCH_MINUTES;
  }

  return CLOCK_ADVANCE_IDLE_BATCH_MINUTES;
}

export function getClockDisplayStepMinutes(batchMinutes: number): number {
  if (batchMinutes <= CLOCK_MAX_ANIMATION_STEPS) {
    return CLOCK_DISPLAY_STEP_MINUTES;
  }

  return Math.ceil(batchMinutes / CLOCK_MAX_ANIMATION_STEPS);
}

export function getClockSubTickIntervalMs(
  speed: SimulationSpeed,
  batchMinutes: number,
  options: { matchBatchDurationMs?: number } = {},
): number {
  const batchMs =
    batchMinutes === CLOCK_ADVANCE_MATCH_BATCH_MINUTES && options.matchBatchDurationMs
      ? options.matchBatchDurationMs
      : getClockTickIntervalMs(speed);
  const stepMinutes = getClockDisplayStepMinutes(batchMinutes);
  const stepCount = batchMinutes / stepMinutes;

  return Math.max(CLOCK_MIN_SUB_TICK_MS, Math.floor(batchMs / stepCount));
}

export function parseMatchKickoff(match: Match): Date | null {
  if (!match.scheduledDate) {
    return null;
  }

  const kickoff = match.scheduledTime?.split(' ')[0] ?? '12:00';
  const [hours, minutes] = kickoff.split(':').map((value) => Number.parseInt(value, 10));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return new Date(
    `${match.scheduledDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
  );
}

export function getMatchdayClockStart(matchday: string): Date | null {
  const kickoffs = getMatchesForMatchday(matchday)
    .map(parseMatchKickoff)
    .filter((kickoff): kickoff is Date => kickoff !== null)
    .sort((kickoffA, kickoffB) => kickoffA.getTime() - kickoffB.getTime());

  return kickoffs[0] ?? null;
}

export function getTournamentClockStart(
  fixtures: Match[] = worldCupGroupFixtures,
  options: { startDate?: string | null } = {},
): Date | null {
  const sortedFixtures = sortFixturesByKickoff(fixtures);
  let firstKickoff: Date | null = null;

  for (const fixture of sortedFixtures) {
    const kickoff = parseMatchKickoff(fixture);

    if (!kickoff) {
      continue;
    }

    firstKickoff ??= kickoff;

    if (
      options.startDate &&
      fixture.scheduledDate !== undefined &&
      fixture.scheduledDate >= options.startDate
    ) {
      return kickoff;
    }
  }

  return firstKickoff;
}

export function advanceMatchdayClock(clock: Date, minutes: number): Date {
  return new Date(clock.getTime() + minutes * 60 * 1000);
}

export function formatClockDateKey(clock: Date): string {
  const year = clock.getFullYear();
  const month = String(clock.getMonth() + 1).padStart(2, '0');
  const day = String(clock.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function hasMatchesOnClockDate(
  clock: Date,
  fixtures: Match[] = worldCupGroupFixtures,
): boolean {
  const dateKey = formatClockDateKey(clock);

  return fixtures.some((fixture) => fixture.scheduledDate === dateKey);
}

export function isAnyMatchInProgressOnMatchday(matchday: string, clock: Date): boolean {
  return getMatchesForMatchday(matchday).some((fixture) =>
    isMatchInProgressAtClock(fixture, clock),
  );
}

export function isAnyMatchInProgressAtClock(
  clock: Date,
  fixtures: Match[] = worldCupGroupFixtures,
): boolean {
  return fixtures.some((fixture) => isMatchInProgressAtClock(fixture, clock));
}

export function getActiveTimelineMatchday(
  clock: Date,
  fixtures: Match[] = worldCupGroupFixtures,
): string {
  const matchdayOrder = getMatchdayOrder();

  for (const matchday of matchdayOrder) {
    const matchdayFixtures = getMatchesForMatchday(matchday);
    const lastMatchEnd = matchdayFixtures
      .map((fixture) => getMatchEndTime(fixture))
      .filter((endTime): endTime is Date => endTime !== null)
      .sort((endA, endB) => endB.getTime() - endA.getTime())[0];

    if (!lastMatchEnd || clock.getTime() < lastMatchEnd.getTime()) {
      return matchday;
    }
  }

  return matchdayOrder[matchdayOrder.length - 1] ?? 'Matchday 1';
}

export function isFixtureVisibleInTimeline(
  fixture: Match,
  clock: Date,
  visibilityMs: number = TIMELINE_VISIBILITY_MS,
): boolean {
  const kickoff = parseMatchKickoff(fixture);

  if (!kickoff) {
    return false;
  }

  if (isMatchInProgressAtClock(fixture, clock)) {
    return true;
  }

  if (isMatchFinishedAtClock(fixture, clock)) {
    return true;
  }

  const windowStart = clock.getTime();
  const windowEnd = windowStart + visibilityMs;

  return kickoff.getTime() >= windowStart && kickoff.getTime() <= windowEnd;
}

export function getVisibleTimelineFixtures(
  clock: Date,
  fixtures: Match[] = worldCupGroupFixtures,
): Match[] {
  return sortFixturesByKickoff(fixtures).filter((fixture) =>
    isFixtureVisibleInTimeline(fixture, clock),
  );
}

export function getTournamentStartMatchday(): string {
  return getMatchdayOrder()[0] ?? 'Matchday 1';
}

export function getNextViewMatchday(currentMatchday: string): string | null {
  const matchdayOrder = getMatchdayOrder();
  const currentIndex = matchdayOrder.indexOf(currentMatchday);

  if (currentIndex === -1 || currentIndex >= matchdayOrder.length - 1) {
    return null;
  }

  return matchdayOrder[currentIndex + 1] ?? null;
}

export function getResumeViewMatchday(completedMatches: Match[]): string {
  const matchdayOrder = getMatchdayOrder();
  const completedMatchIds = new Set(completedMatches.map((match) => match.id));

  for (const matchday of matchdayOrder) {
    const hasUncompletedFixture = getMatchesForMatchday(matchday).some(
      (fixture) => !completedMatchIds.has(fixture.id),
    );

    if (hasUncompletedFixture) {
      return matchday;
    }
  }

  return matchdayOrder[matchdayOrder.length - 1] ?? 'Matchday 1';
}

export function getInitialViewMatchday(completedMatches: Match[]): string {
  if (completedMatches.length === 0) {
    return getTournamentStartMatchday();
  }

  return getResumeViewMatchday(completedMatches);
}

export function formatClockDate(clock: Date, language: AppLanguage): string {
  const locale = getClockLocale(language);

  return clock.toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatClockTime(clock: Date): string {
  return `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`;
}

export function isMatchKickoffReached(match: Match, clock: Date): boolean {
  const kickoff = parseMatchKickoff(match);

  if (!kickoff) {
    return false;
  }

  return clock.getTime() >= kickoff.getTime();
}

export function getMinutesUntilKickoff(match: Match, clock: Date): number | null {
  const kickoff = parseMatchKickoff(match);

  if (!kickoff) {
    return null;
  }

  return (kickoff.getTime() - clock.getTime()) / (60 * 1000);
}

export function isMatchWithinUpcomingWindow(
  match: Match,
  clock: Date,
  windowMs: number = UPCOMING_WINDOW_MS,
): boolean {
  const kickoff = parseMatchKickoff(match);

  if (!kickoff) {
    return false;
  }

  const msUntilKickoff = kickoff.getTime() - clock.getTime();

  return msUntilKickoff > 0 && msUntilKickoff <= windowMs;
}

export function getMatchEndTime(match: Match): Date | null {
  const kickoff = parseMatchKickoff(match);

  if (!kickoff) {
    return null;
  }

  return new Date(kickoff.getTime() + MATCH_DURATION_MINUTES * 60 * 1000);
}

export function isMatchInProgressAtClock(match: Match, clock: Date): boolean {
  const kickoff = parseMatchKickoff(match);
  const matchEnd = getMatchEndTime(match);

  if (!kickoff || !matchEnd) {
    return false;
  }

  return clock.getTime() >= kickoff.getTime() && clock.getTime() < matchEnd.getTime();
}

export function isMatchFinishedAtClock(match: Match, clock: Date): boolean {
  const matchEnd = getMatchEndTime(match);

  if (!matchEnd) {
    return false;
  }

  return clock.getTime() >= matchEnd.getTime();
}

export function getMatchdayClockEnd(matchday: string): Date | null {
  const endTimes = getMatchesForMatchday(matchday)
    .map(getMatchEndTime)
    .filter((endTime): endTime is Date => endTime !== null)
    .sort((endTimeA, endTimeB) => endTimeB.getTime() - endTimeA.getTime());

  return endTimes[0] ?? null;
}

export function sortFixturesByKickoff<T extends Match>(fixtures: T[]): T[] {
  return [...fixtures].sort((fixtureA, fixtureB) => {
    const kickoffA = parseMatchKickoff(fixtureA)?.getTime() ?? 0;
    const kickoffB = parseMatchKickoff(fixtureB)?.getTime() ?? 0;

    return kickoffA - kickoffB;
  });
}

export function isGroupTimelineComplete(
  clock: Date,
  resultMatches: Match[],
): boolean {
  const resultById = new Map(resultMatches.map((match) => [match.id, match]));

  return worldCupGroupFixtures.every((fixture) => {
    const resultMatch = resultById.get(fixture.id);

    if (!resultMatch?.result?.regulation) {
      return false;
    }

    return isMatchFinishedAtClock(fixture, clock);
  });
}

export function isMatchdayViewComplete(
  matchday: string,
  clock: Date,
  resultMatches: Match[],
): boolean {
  const resultById = new Map(resultMatches.map((match) => [match.id, match]));

  return getMatchesForMatchday(matchday).every((fixture) => {
    const resultMatch = resultById.get(fixture.id);

    if (!resultMatch?.result?.regulation) {
      return false;
    }

    return isMatchFinishedAtClock(fixture, clock);
  });
}

export function shouldOpenUserMatchFocus(
  match: Match | null,
  clock: Date | null,
  hasPrediction: boolean,
  options: OfficialResultsOptions = {},
): boolean {
  const useOfficialResults = options.useOfficialResults ?? true;

  if (
    !match ||
    !clock ||
    hasPrediction ||
    (useOfficialResults && hasOfficialFixtureResult(match.id))
  ) {
    return false;
  }

  return (
    isMatchWithinUpcomingWindow(match, clock) || isMatchKickoffReached(match, clock)
  );
}

function isUnresolvedUserGroupMatch(
  match: Match,
  userPredictions: Record<string, PeriodScore | unknown>,
  options: OfficialResultsOptions = {},
): boolean {
  const useOfficialResults = options.useOfficialResults ?? true;

  return (
    userPredictions[match.id] === undefined &&
    (!useOfficialResults || !hasOfficialFixtureResult(match.id))
  );
}

export function isUserGroupMatchAwaitingPrediction(
  match: Match,
  clock: Date,
  userPredictions: Record<string, PeriodScore | unknown> = {},
  options: OfficialResultsOptions = {},
): boolean {
  if (!isUnresolvedUserGroupMatch(match, userPredictions, options)) {
    return false;
  }

  return (
    isMatchWithinUpcomingWindow(match, clock) || isMatchKickoffReached(match, clock)
  );
}

export function isAnyUserGroupMatchAwaitingPrediction(
  userTeamId: string,
  teamList: Team[],
  clock: Date | null,
  userPredictions: Record<string, PeriodScore | unknown> = {},
  autoSimulateUserMatches = false,
  options: OfficialResultsOptions = {},
): boolean {
  if (!clock || autoSimulateUserMatches) {
    return false;
  }

  return getUserGroupMatches(userTeamId, teamList).some((match) =>
    isUserGroupMatchAwaitingPrediction(match, clock, userPredictions, options),
  );
}

export function getUserGroupMatchAwaitingPrediction(
  selectedTeamId: string,
  teamList: Team[],
  clock: Date,
  userPredictions: Record<string, PeriodScore | unknown> = {},
  options: OfficialResultsOptions = {},
): Match | null {
  for (const match of getUserGroupMatches(selectedTeamId, teamList)) {
    if (isUserGroupMatchAwaitingPrediction(match, clock, userPredictions, options)) {
      return match;
    }
  }

  return null;
}

export function getUserMatchPredictionFocusClock(match: Match, clock: Date): Date {
  const kickoff = parseMatchKickoff(match);

  if (!kickoff) {
    return clock;
  }

  const focusStart = new Date(kickoff.getTime() - UPCOMING_WINDOW_MS);

  if (clock.getTime() < focusStart.getTime()) {
    return focusStart;
  }

  if (clock.getTime() > kickoff.getTime()) {
    return kickoff;
  }

  return clock;
}

export function capClockForUserGroupMatches(
  currentClock: Date,
  proposedClock: Date,
  userTeamId: string,
  teamList: Team[],
  userPredictions: Record<string, PeriodScore | unknown>,
  autoSimulateUserMatches = false,
  options: OfficialResultsOptions = {},
): Date {
  if (autoSimulateUserMatches) {
    return proposedClock;
  }

  let capped = proposedClock;

  for (const match of getUserGroupMatches(userTeamId, teamList)) {
    if (!isUnresolvedUserGroupMatch(match, userPredictions, options)) {
      continue;
    }

    capped = capClockAtPendingUserMatchKickoff(
      currentClock,
      capped,
      match,
      userPredictions,
      options,
    );
  }

  return capped;
}

export function capClockAtPendingUserMatchKickoff(
  currentClock: Date,
  proposedClock: Date,
  pendingUserMatch: Match | null,
  userPredictions: Record<string, unknown>,
  options: OfficialResultsOptions = {},
): Date {
  if (!pendingUserMatch) {
    return proposedClock;
  }

  if (userPredictions[pendingUserMatch.id] !== undefined) {
    return proposedClock;
  }

  const useOfficialResults = options.useOfficialResults ?? true;

  if (
    useOfficialResults &&
    pendingUserMatch.stage === 'group' &&
    hasOfficialFixtureResult(pendingUserMatch.id)
  ) {
    return proposedClock;
  }

  const kickoff = parseMatchKickoff(pendingUserMatch);

  if (!kickoff) {
    return proposedClock;
  }

  const kickoffMs = kickoff.getTime();
  const matchEnd = getMatchEndTime(pendingUserMatch);
  const focusStartMs = kickoffMs - UPCOMING_WINDOW_MS;
  const currentMs = currentClock.getTime();
  const proposedMs = proposedClock.getTime();

  if (currentMs < focusStartMs && proposedMs >= focusStartMs) {
    return new Date(focusStartMs);
  }

  if (currentMs < kickoffMs && proposedMs >= kickoffMs) {
    return kickoff;
  }

  if (matchEnd && currentMs >= kickoffMs && currentMs < matchEnd.getTime()) {
    return currentClock;
  }

  if (currentMs >= focusStartMs && currentMs < kickoffMs) {
    return currentClock;
  }

  return proposedClock;
}

export function isPendingUserMatchAwaitingPrediction(
  pendingUserMatch: Match | null,
  clock: Date | null,
  userPredictions: Record<string, unknown>,
  options: OfficialResultsOptions = {},
): boolean {
  if (!pendingUserMatch || !clock) {
    return false;
  }

  if (userPredictions[pendingUserMatch.id] !== undefined) {
    return false;
  }

  if (pendingUserMatch.stage === 'group') {
    return isUserGroupMatchAwaitingPrediction(
      pendingUserMatch,
      clock,
      userPredictions,
      options,
    );
  }

  return (
    isMatchWithinUpcomingWindow(pendingUserMatch, clock) ||
    isMatchKickoffReached(pendingUserMatch, clock)
  );
}
