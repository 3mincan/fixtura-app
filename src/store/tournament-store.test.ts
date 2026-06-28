import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { worldCupGroupFixtures, worldCupKnockoutFixtures } from '@/data/worldcup-fixtures';
import { simulateRandomKnockoutResult } from '@/simulation/simulate-random-knockout-result';
import { useOfficialResultsStore } from '@/store/official-results-store';
import { useTournamentStore } from '@/store/tournament-store';
import type { Match, PeriodScore } from '@/types/match';
import type { TournamentState } from '@/types/tournament';
import {
  buildKnockoutTimelineStateFromRoundResult,
  buildPendingKnockoutTimelineState,
  fixturesFromRoundResult,
} from '@/utils/knockout-timeline';
import { buildTimelineBoard } from '@/utils/matchday-board';
import { getTournamentClockStart, isMatchFinishedAtClock } from '@/utils/matchday-clock';
import type { KnockoutRound } from '@/types/knockout';

function makeMatch(id: string, homeTeamId: string, awayTeamId: string): Match {
  return {
    id,
    stage: 'group',
    homeTeamId,
    awayTeamId,
    status: 'scheduled',
    groupId: 'A',
  };
}

function makeTournamentState(userTeamId: string | null = null): TournamentState {
  return {
    currentStage: 'group',
    groups: [{ id: 'A', teamIds: ['usa', 'mex', 'can', 'bra'] }],
    matches: [makeMatch('match-1', 'usa', 'mex')],
    standings: {},
    userTeamId,
  };
}

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
  useOfficialResultsStore.getState().hydrateResults({}, null);
}

function hydrateCompleteOfficialResultsForTeam(
  teamId: string,
  outcome: 'win' | 'lose',
) {
  const results = Object.fromEntries(
    worldCupGroupFixtures.map((fixture): [string, PeriodScore] => {
      if (fixture.homeTeamId === teamId) {
        return [fixture.id, outcome === 'win' ? { home: 3, away: 0 } : { home: 0, away: 3 }];
      }

      if (fixture.awayTeamId === teamId) {
        return [fixture.id, outcome === 'win' ? { home: 0, away: 3 } : { home: 3, away: 0 }];
      }

      return [fixture.id, { home: 0, away: 0 }];
    }),
  );

  useOfficialResultsStore.getState().hydrateResults(results, Date.now());
}

function getUniqueFixtureDates(fixtures: { scheduledDate?: string }[]): string[] {
  return [...new Set(fixtures.map((fixture) => fixture.scheduledDate).filter(Boolean) as string[])];
}

function countGroupFixturesThroughDate(date: string): number {
  return worldCupGroupFixtures.filter(
    (fixture) => fixture.scheduledDate && fixture.scheduledDate <= date,
  ).length;
}

function isTimelineComplete(clock: Date, fixtures: Match[], resultMatches: Match[]): boolean {
  const resultById = new Map(resultMatches.map((match) => [match.id, match]));

  return fixtures.every((fixture) => {
    const resultMatch = resultById.get(fixture.id);

    if (!resultMatch?.result?.regulation) {
      return false;
    }

    return isMatchFinishedAtClock(fixture, clock);
  });
}

function buildPendingKnockoutTimelineBoardFromStore() {
  const state = useTournamentStore.getState();

  assert.equal(state.tournamentPhase, 'knockout');
  assert.ok(state.selectedTeamId);
  assert.ok(state.pendingKnockoutFixture);

  const timeline = buildPendingKnockoutTimelineState({
    round: state.pendingKnockoutFixture.round,
    roundOf32Fixtures: state.roundOf32Fixtures,
    knockoutRoundResults: state.knockoutRoundResults,
    pendingKnockoutFixture: state.pendingKnockoutFixture,
    selectedTeamId: state.selectedTeamId,
    userPredictions: state.userPredictions,
    seed: state.activeSimulationId ?? 'knockout-timeline',
  });
  const clock = getTournamentClockStart(timeline.fixtures);

  assert.ok(clock);

  const board = buildTimelineBoard({
    userTeamId: state.selectedTeamId,
    completedMatches: timeline.resultMatches,
    clock,
    clockPhaseActive: true,
    fixtures: timeline.fixtures,
  });

  return { timeline, clock, board };
}

function buildCompletedKnockoutTimelineBoardFromStore(round: KnockoutRound) {
  const state = useTournamentStore.getState();
  const roundResult = state.knockoutRoundResults.find((result) => result.round === round);

  assert.ok(state.selectedTeamId);
  assert.ok(roundResult);

  const timeline = buildKnockoutTimelineStateFromRoundResult(
    roundResult,
    fixturesFromRoundResult(roundResult),
  );
  const clock = getTournamentClockStart(timeline.fixtures);

  assert.ok(clock);

  const board = buildTimelineBoard({
    userTeamId: state.selectedTeamId,
    completedMatches: timeline.resultMatches,
    clock,
    clockPhaseActive: true,
    fixtures: timeline.fixtures,
  });

  return { timeline, clock, board };
}

describe('useTournamentStore', () => {
  afterEach(() => {
    resetStore();
  });

  it('starts with empty tournament progress', () => {
    const state = useTournamentStore.getState();

    assert.equal(state.selectedTeamId, null);
    assert.equal(state.activeSimulationId, null);
    assert.equal(state.currentStage, 'group');
    assert.deepEqual(state.completedMatches, []);
    assert.equal(state.pendingUserMatch, null);
    assert.deepEqual(state.userPredictions, {});
    assert.equal(state.tournamentPhase, 'group');
    assert.equal(state.userQualified, false);
    assert.equal(state.championId, null);
    assert.deepEqual(state.knockoutRoundResults, []);
    assert.deepEqual(state.simulatedRevealMatches, []);
    assert.equal(state.simulatedRevealIndex, 0);
    assert.deepEqual(state.groupStandings, {});
    assert.equal(state.tournamentState, null);
  });

  it('updates selectedTeamId when a team is chosen', () => {
    useTournamentStore.getState().selectTeam('usa');

    const state = useTournamentStore.getState();
    assert.equal(state.selectedTeamId, 'usa');
    assert.ok(state.activeSimulationId);
  });

  it('keeps selectedTeamId in sync with tournament state', () => {
    useTournamentStore.getState().setTournamentState(makeTournamentState());
    useTournamentStore.getState().selectTeam('usa');

    const state = useTournamentStore.getState();

    assert.equal(state.selectedTeamId, 'usa');
    assert.equal(state.tournamentState?.userTeamId, 'usa');
  });

  it('tracks pending and completed user matches', () => {
    const pendingMatch = makeMatch('user-match', 'usa', 'mex');

    useTournamentStore.getState().setPendingUserMatch(pendingMatch);
    assert.deepEqual(useTournamentStore.getState().pendingUserMatch, pendingMatch);

    useTournamentStore.getState().completeUserMatch(pendingMatch);

    const state = useTournamentStore.getState();

    assert.equal(state.completedMatches.length, 1);
    assert.equal(state.completedMatches[0]?.id, 'user-match');
    assert.equal(state.pendingUserMatch, null);
  });

  it('updates current stage and tournament state together', () => {
    useTournamentStore.getState().setTournamentState(makeTournamentState('usa'));
    useTournamentStore.getState().setCurrentStage('round-of-16');

    const state = useTournamentStore.getState();

    assert.equal(state.currentStage, 'round-of-16');
    assert.equal(state.tournamentState?.currentStage, 'round-of-16');
  });

  it('resets all tournament progress state', () => {
    useTournamentStore.getState().selectTeam('usa');
    useTournamentStore.getState().setTournamentState(makeTournamentState('usa'));
    useTournamentStore.getState().setPendingUserMatch(makeMatch('user-match', 'usa', 'mex'));
    useTournamentStore.getState().completeUserMatch(makeMatch('user-match', 'usa', 'mex'));

    useTournamentStore.getState().resetTournamentProgress();

    const state = useTournamentStore.getState();

    assert.equal(state.selectedTeamId, null);
    assert.equal(state.tournamentState, null);
    assert.deepEqual(state.completedMatches, []);
    assert.equal(state.pendingUserMatch, null);
    assert.deepEqual(state.userPredictions, {});
    assert.equal(state.tournamentPhase, 'group');
    assert.equal(state.championId, null);
    assert.deepEqual(state.knockoutRoundResults, []);
    assert.deepEqual(state.simulatedRevealMatches, []);
    assert.equal(state.simulatedRevealIndex, 0);
    assert.equal(state.currentStage, 'group');
  });

  it('stores a user prediction with scores and advances pending match', () => {
    useTournamentStore.getState().selectTeam('mex');

    const pendingMatch = useTournamentStore.getState().pendingUserMatch!;

    useTournamentStore.getState().saveUserPrediction(pendingMatch, 3, 0);

    const state = useTournamentStore.getState();

    assert.deepEqual(state.userPredictions[pendingMatch.id], { home: 3, away: 0 });
    assert.equal(state.pendingUserMatch?.id, 'group-A-cze-mex');
  });

  it('completes group stage and starts knockout in random mode', () => {
    useTournamentStore.getState().selectTeam('mex', { gameMode: 'random' });

    useTournamentStore.getState().completeRandomGroupStage();

    const groupState = useTournamentStore.getState();

    assert.equal(groupState.completedMatches.length, 72);
    assert.equal(groupState.groupStandings.A.length, 4);
    assert.equal(groupState.pendingUserMatch, null);

    useTournamentStore.getState().beginKnockoutStage();

    const knockoutState = useTournamentStore.getState();

    assert.notEqual(knockoutState.tournamentPhase, 'group');
    assert.ok(knockoutState.roundOf32Fixtures.length > 0);
  });

  it('starts from today in knockout when complete official results qualify the team', () => {
    hydrateCompleteOfficialResultsForTeam('mex', 'win');

    useTournamentStore.getState().selectTeam('mex', {
      startMode: 'today',
      currentDate: new Date('2026-06-28T12:00:00'),
    });

    const state = useTournamentStore.getState();

    assert.equal(state.completedMatches.length, worldCupGroupFixtures.length);
    assert.equal(state.selectedTeamId, 'mex');
    assert.equal(state.tournamentPhase, 'knockout');
    assert.ok(state.pendingKnockoutFixture);
    assert.equal(state.pendingUserMatch?.stage, 'round-of-32');
  });

  it('starts from today in not-qualified flow when complete official results eliminate the team', () => {
    hydrateCompleteOfficialResultsForTeam('mex', 'lose');

    useTournamentStore.getState().selectTeam('mex', {
      startMode: 'today',
      currentDate: new Date('2026-06-28T12:00:00'),
    });

    const state = useTournamentStore.getState();

    assert.equal(state.completedMatches.length, worldCupGroupFixtures.length);
    assert.equal(state.selectedTeamId, 'mex');
    assert.equal(state.tournamentPhase, 'not-qualified');
    assert.equal(state.pendingUserMatch, null);
    assert.ok(state.championId);
  });

  it('starts from today after the group calendar when official results are partial', () => {
    useTournamentStore.getState().selectTeam('mex', {
      startMode: 'today',
      currentDate: new Date('2026-06-28T12:00:00'),
    });

    const state = useTournamentStore.getState();

    assert.equal(state.completedMatches.length, worldCupGroupFixtures.length);
    assert.equal(state.selectedTeamId, 'mex');
    assert.notEqual(state.tournamentPhase, 'group');
    assert.ok(Object.keys(state.groupStandings).length > 0);
  });

  it('starts random mode from today after the group calendar when official results are partial', () => {
    useTournamentStore.getState().selectTeam('mex', {
      gameMode: 'random',
      startMode: 'today',
      currentDate: new Date('2026-06-28T12:00:00'),
    });

    const state = useTournamentStore.getState();

    assert.equal(state.gameMode, 'random');
    assert.equal(state.completedMatches.length, worldCupGroupFixtures.length);
    assert.equal(state.tournamentPhase, 'knockout');
    assert.ok(state.roundOf32Fixtures.length > 0);
    assert.ok(state.pendingKnockoutFixture);
  });

  it('builds a visible knockout timeline when pick-team mode starts from today', () => {
    useTournamentStore.getState().selectTeam('mex', {
      startMode: 'today',
      currentDate: new Date('2026-06-28T12:00:00'),
    });

    const { timeline, clock, board } = buildPendingKnockoutTimelineBoardFromStore();

    assert.equal(timeline.round, 'round-of-32');
    assert.equal(timeline.fixtures.length, 16);
    assert.ok(board.length > 0);
    assert.equal(isTimelineComplete(clock, timeline.fixtures, timeline.resultMatches), false);
  });

  it('builds a visible knockout timeline when random mode starts from today', () => {
    useTournamentStore.getState().selectTeam('mex', {
      gameMode: 'random',
      startMode: 'today',
      currentDate: new Date('2026-06-28T12:00:00'),
    });

    const initialState = useTournamentStore.getState();
    const completedRound = initialState.pendingKnockoutFixture!.round;
    const pendingMatch = initialState.pendingUserMatch!;

    useTournamentStore
      .getState()
      .saveKnockoutPrediction(pendingMatch, simulateRandomKnockoutResult(pendingMatch));

    const { timeline, clock, board } =
      buildCompletedKnockoutTimelineBoardFromStore(completedRound);

    assert.equal(timeline.round, completedRound);
    assert.equal(timeline.fixtures.length, 16);
    assert.equal(timeline.resultMatches.length, 16);
    assert.ok(board.length > 0);
    assert.equal(isTimelineComplete(clock, timeline.fixtures, timeline.resultMatches), false);
  });

  it('starts from today correctly on every group fixture date in pick-team mode', () => {
    for (const date of getUniqueFixtureDates(worldCupGroupFixtures)) {
      resetStore();

      useTournamentStore.getState().selectTeam('mex', {
        startMode: 'today',
        currentDate: new Date(`${date}T12:00:00`),
      });

      const state = useTournamentStore.getState();
      const expectedCompletedMatches = countGroupFixturesThroughDate(date);

      assert.equal(state.completedMatches.length, expectedCompletedMatches);
      assert.equal(state.selectedTeamId, 'mex');
      assert.ok(
        state.completedMatches.every((match) => match.result?.regulation),
        `expected all completed matches to include scores on ${date}`,
      );
    }
  });

  it('starts from today correctly on every group fixture date in random mode', () => {
    for (const date of getUniqueFixtureDates(worldCupGroupFixtures)) {
      resetStore();

      useTournamentStore.getState().selectTeam('mex', {
        gameMode: 'random',
        startMode: 'today',
        currentDate: new Date(`${date}T12:00:00`),
      });

      const state = useTournamentStore.getState();
      const expectedCompletedMatches = countGroupFixturesThroughDate(date);

      assert.equal(state.gameMode, 'random');
      assert.equal(state.completedMatches.length, expectedCompletedMatches);
      assert.ok(
        state.completedMatches.every((match) => match.result?.regulation),
        `expected all completed matches to include scores on ${date}`,
      );
    }
  });

  it('starts from today beyond groups on every knockout fixture date in pick-team mode', () => {
    for (const date of getUniqueFixtureDates(worldCupKnockoutFixtures)) {
      resetStore();

      useTournamentStore.getState().selectTeam('mex', {
        startMode: 'today',
        currentDate: new Date(`${date}T12:00:00`),
      });

      const state = useTournamentStore.getState();

      assert.equal(state.completedMatches.length, worldCupGroupFixtures.length);
      assert.equal(state.selectedTeamId, 'mex');
      assert.notEqual(state.tournamentPhase, 'group');
      assert.ok(Object.keys(state.groupStandings).length > 0);
    }
  });

  it('starts from today beyond groups on every knockout fixture date in random mode', () => {
    for (const date of getUniqueFixtureDates(worldCupKnockoutFixtures)) {
      resetStore();

      useTournamentStore.getState().selectTeam('mex', {
        gameMode: 'random',
        startMode: 'today',
        currentDate: new Date(`${date}T12:00:00`),
      });

      const state = useTournamentStore.getState();

      assert.equal(state.gameMode, 'random');
      assert.equal(state.completedMatches.length, worldCupGroupFixtures.length);
      assert.equal(state.tournamentPhase, 'knockout');
      assert.ok(state.roundOf32Fixtures.length > 0);
      assert.ok(state.pendingKnockoutFixture);
    }
  });

  it('does not show not-qualified state in random mode', () => {
    useTournamentStore.getState().selectTeam('cze', { gameMode: 'random' });

    useTournamentStore.getState().completeRandomGroupStage();
    useTournamentStore.getState().beginKnockoutStage();

    const state = useTournamentStore.getState();

    assert.equal(state.gameMode, 'random');
    assert.notEqual(state.tournamentPhase, 'not-qualified');
    assert.equal(state.tournamentPhase, 'knockout');
    assert.ok(state.pendingKnockoutFixture);
  });
});
