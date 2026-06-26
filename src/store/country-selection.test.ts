import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { useTournamentStore } from '@/store/tournament-store';
import { filterTeams } from '@/utils/filter-teams';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('country selection flow', () => {
  afterEach(() => {
    resetStore();
  });

  it('filters the team list before selection', () => {
    const filteredTeams = filterTeams(teams, 'mexico');

    assert.equal(filteredTeams.length, 1);
    assert.equal(filteredTeams[0]?.id, 'mex');
  });

  it('updates Zustand state when a team is selected', () => {
    const mexico = teams.find((team) => team.id === 'mex')!;

    useTournamentStore.getState().selectTeam(mexico.id);

    assert.equal(useTournamentStore.getState().selectedTeamId, 'mex');
  });

  it('replaces the previous selection when a new team is chosen', () => {
    useTournamentStore.getState().selectTeam('mex');
    useTournamentStore.getState().selectTeam('bra');

    assert.equal(useTournamentStore.getState().selectedTeamId, 'bra');
  });

  it('starts a fresh tournament when switching teams after progress', () => {
    useTournamentStore.getState().selectTeam('mex');
    const mexSimulationId = useTournamentStore.getState().activeSimulationId;

    const pendingMatch = useTournamentStore.getState().pendingUserMatch!;
    useTournamentStore.getState().saveUserPrediction(pendingMatch, 2, 1);

    useTournamentStore.getState().selectTeam('bra');

    const state = useTournamentStore.getState();
    assert.equal(state.selectedTeamId, 'bra');
    assert.equal(state.tournamentPhase, 'group');
    assert.deepEqual(state.userPredictions, {});
    assert.notEqual(state.activeSimulationId, mexSimulationId);
  });
});
