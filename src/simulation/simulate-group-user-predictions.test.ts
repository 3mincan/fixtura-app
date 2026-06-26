import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { groups } from '@/data/groups';
import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { simulateGroupStage } from '@/simulation/simulate-group-stage';
import { useTournamentStore } from '@/store/tournament-store';
import { getUserGroupMatches, matchInvolvesTeam } from '@/utils/user-matches';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('simulateGroupStage with user predictions', () => {
  afterEach(() => {
    resetStore();
  });

  it('applies store predictions to the selected team matches in group stage', () => {
    useTournamentStore.getState().selectTeam('mex');

    const userMatches = getUserGroupMatches('mex', teams);

    for (const match of userMatches) {
      useTournamentStore.getState().saveUserPrediction(match, 2, 1);
    }

    const { selectedTeamId, userPredictions } = useTournamentStore.getState();
    const output = simulateGroupStage({
      groups,
      teams,
      ratings: teamRatingsById,
      seed: 'worldcup2026',
      userTeamId: selectedTeamId,
      userPredictions,
    });

    const groupAResults = output.results.filter((match) => match.groupId === 'A');

    for (const match of groupAResults) {
      if (matchInvolvesTeam(match, 'mex')) {
        assert.deepEqual(match.result?.regulation, userPredictions[match.id]);
      }
    }
  });

  it('still simulates matches that do not involve the selected team', () => {
    const baseline = simulateGroupStage({
      groups,
      teams,
      ratings: teamRatingsById,
      seed: 'worldcup2026',
    });

    useTournamentStore.getState().selectTeam('mex');

    for (const match of getUserGroupMatches('mex', teams)) {
      useTournamentStore.getState().saveUserPrediction(match, 3, 0);
    }

    const { selectedTeamId, userPredictions } = useTournamentStore.getState();
    const withPredictions = simulateGroupStage({
      groups,
      teams,
      ratings: teamRatingsById,
      seed: 'worldcup2026',
      userTeamId: selectedTeamId,
      userPredictions,
    });

    const nonUserGroupAMatches = baseline.results.filter(
      (match) => match.groupId === 'A' && !matchInvolvesTeam(match, 'mex'),
    );

    for (const baselineMatch of nonUserGroupAMatches) {
      const result = withPredictions.results.find((match) => match.id === baselineMatch.id);

      assert.ok(result);
      assert.deepEqual(result.result, baselineMatch.result);
    }
  });
});
