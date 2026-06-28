import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { useTournamentStore } from '@/store/tournament-store';
import { getNextUserMatch } from '@/utils/user-matches';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('match prediction flow', () => {
  afterEach(() => {
    resetStore();
  });

  it('stores the prediction and advances to the next user match', () => {
    useTournamentStore.getState().selectTeam('mex');

    const firstMatch = useTournamentStore.getState().pendingUserMatch;

    assert.equal(firstMatch?.id, 'group-A-mex-kor');

    useTournamentStore.getState().saveUserPrediction(firstMatch!, 2, 1);

    const state = useTournamentStore.getState();

    assert.deepEqual(state.userPredictions['group-A-mex-kor'], { home: 2, away: 1 });
    assert.ok(state.completedMatches.some((match) => match.id === 'group-A-mex-kor'));
    assert.equal(state.pendingUserMatch?.id, 'group-A-cze-mex');
    assert.ok(Object.keys(state.groupStandings).length > 0);
  });

  it('moves through all remaining group matches for the selected team', () => {
    useTournamentStore.getState().selectTeam('mex');

    const expectedMatchIds = ['group-A-mex-kor', 'group-A-cze-mex'];

    for (const matchId of expectedMatchIds) {
      const { pendingUserMatch } = useTournamentStore.getState();

      assert.equal(pendingUserMatch?.id, matchId);

      useTournamentStore.getState().saveUserPrediction(pendingUserMatch!, 1, 0);
    }

    const state = useTournamentStore.getState();

    assert.equal(Object.keys(state.userPredictions).length, 2);
    assert.equal(state.tournamentPhase, 'group');
    assert.equal(state.pendingUserMatch, null);
    assert.equal(getNextUserMatch('mex', teams, state.completedMatches), null);

    useTournamentStore.getState().beginKnockoutStage();

    const knockoutState = useTournamentStore.getState();

    assert.equal(knockoutState.tournamentPhase, 'knockout');
    assert.ok(knockoutState.pendingUserMatch);
    assert.equal(knockoutState.pendingUserMatch.stage, 'round-of-32');
  });
});
