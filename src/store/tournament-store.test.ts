import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { useTournamentStore } from '@/store/tournament-store';
import type { Match } from '@/types/match';
import type { TournamentState } from '@/types/tournament';

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
