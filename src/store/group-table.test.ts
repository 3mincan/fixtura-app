import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { calculateStandings } from '@/simulation/calculate-standings';
import { simulateGroup } from '@/simulation/simulate-group';
import { useTournamentStore } from '@/store/tournament-store';
import { buildGroupTableRows, getGroupTable } from '@/utils/group-standings';
import { getUserGroupMatches } from '@/utils/user-matches';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('group table flow', () => {
  afterEach(() => {
    resetStore();
  });

  it('renders table rows that match calculated standings from store predictions', () => {
    useTournamentStore.getState().selectTeam('mex');

    for (const match of getUserGroupMatches('mex', teams)) {
      useTournamentStore.getState().saveUserPrediction(match, 2, 0);
    }

    const { selectedTeamId, userPredictions } = useTournamentStore.getState();
    const table = getGroupTable({
      selectedTeamId,
      teamList: teams,
      userPredictions,
      seed: 'group-table',
    });

    const groupOutput = simulateGroup({
      groupId: 'A',
      teamIds: ['mex', 'rsa', 'kor', 'cze'],
      ratings: teamRatingsById,
      seed: 'group-table',
      userTeamId: 'mex',
      userPredictions,
    });
    const expectedStandings = calculateStandings({
      teamIds: ['mex', 'rsa', 'kor', 'cze'],
      matches: groupOutput.results,
    });

    assert.ok(table);
    assert.deepEqual(table.rows, buildGroupTableRows(expectedStandings));
  });
});
