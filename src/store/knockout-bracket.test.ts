import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { useTournamentStore } from '@/store/tournament-store';
import { getKnockoutBracketView } from '@/utils/knockout-bracket-view';
import { getUserGroupMatches } from '@/utils/user-matches';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('knockout bracket flow', () => {
  afterEach(() => {
    resetStore();
  });

  it('renders knockout rounds from store predictions', () => {
    useTournamentStore.getState().selectTeam('mex');

    for (const match of getUserGroupMatches('mex', teams)) {
      useTournamentStore.getState().saveUserPrediction(match, 1, 0);
    }

    const { selectedTeamId, userPredictions } = useTournamentStore.getState();
    const bracket = getKnockoutBracketView({
      selectedTeamId,
      teamList: teams,
      userPredictions,
    });

    assert.ok(bracket);
    assert.equal(bracket.rounds.length, 6);
    assert.ok(bracket.rounds[0]?.roundName);
    assert.equal(bracket.rounds[0]?.matches.length, 16);
    assert.equal(bracket.rounds.at(-1)?.round, 'final');
    assert.equal(bracket.rounds.at(-1)?.matches[0]?.winnerTeamId, bracket.championId);
  });
});
