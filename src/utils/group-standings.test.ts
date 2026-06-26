import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { calculateStandings } from '@/simulation/calculate-standings';
import { simulateGroup } from '@/simulation/simulate-group';
import { simulateGroupStage } from '@/simulation/simulate-group-stage';
import { groups } from '@/data/groups';
import {
  buildGroupTableRows,
  buildThirdPlaceRankingRows,
  computeFinalGroupStandings,
  getGroupTable,
  getQualifiedThirdPlaceTeamIds,
  isTeamQualifiedFromGroupStage,
} from '@/utils/group-standings';
import { getUserGroupMatches } from '@/utils/user-matches';

describe('group standings', () => {
  it('builds table rows with positions from calculated standings', () => {
    const standings = calculateStandings({
      teamIds: ['mex', 'rsa', 'kor', 'cze'],
      matches: [
        {
          id: 'group-A-mex-rsa',
          stage: 'group',
          homeTeamId: 'mex',
          awayTeamId: 'rsa',
          status: 'completed',
          groupId: 'A',
          result: { regulation: { home: 2, away: 0 } },
        },
        {
          id: 'group-A-kor-cze',
          stage: 'group',
          homeTeamId: 'kor',
          awayTeamId: 'cze',
          status: 'completed',
          groupId: 'A',
          result: { regulation: { home: 1, away: 1 } },
        },
      ],
    });

    const rows = buildGroupTableRows(standings);

    assert.equal(rows.length, 4);
    assert.equal(rows[0].position, 1);
    assert.equal(rows[0].teamId, standings[0].teamId);
    assert.equal(rows[0].points, standings[0].points);
    assert.equal(rows[0].played, standings[0].played);
    assert.equal(rows[0].won, standings[0].won);
    assert.equal(rows[0].drawn, standings[0].drawn);
    assert.equal(rows[0].lost, standings[0].lost);
    assert.equal(rows[0].goalsFor, standings[0].goalsFor);
    assert.equal(rows[0].goalsAgainst, standings[0].goalsAgainst);
    assert.equal(rows[0].goalDifference, standings[0].goalDifference);
  });

  it('returns null when no team is selected', () => {
    assert.equal(getGroupTable({ selectedTeamId: null, teamList: teams }), null);
  });

  it('matches calculateStandings when all user predictions are available', () => {
    const userPredictions = Object.fromEntries(
      getUserGroupMatches('mex', teams).map((match) => [match.id, { home: 2, away: 1 }]),
    );
    const groupOutput = simulateGroup({
      groupId: 'A',
      teamIds: ['mex', 'rsa', 'kor', 'cze'],
      ratings: teamRatingsById,
      seed: 'group-table-test',
      userTeamId: 'mex',
      userPredictions,
    });
    const expectedStandings = calculateStandings({
      teamIds: ['mex', 'rsa', 'kor', 'cze'],
      matches: groupOutput.results,
    });

    const table = getGroupTable({
      selectedTeamId: 'mex',
      teamList: teams,
      userPredictions,
      seed: 'group-table-test',
    });

    assert.ok(table);
    assert.equal(table.groupId, 'A');
    assert.equal(table.rows.length, 4);

    for (let index = 0; index < expectedStandings.length; index++) {
      const expected = expectedStandings[index];
      const row = table.rows[index];

      assert.equal(row.position, index + 1);
      assert.equal(row.teamId, expected.teamId);
      assert.equal(row.played, expected.played);
      assert.equal(row.won, expected.won);
      assert.equal(row.drawn, expected.drawn);
      assert.equal(row.lost, expected.lost);
      assert.equal(row.goalsFor, expected.goalsFor);
      assert.equal(row.goalsAgainst, expected.goalsAgainst);
      assert.equal(row.goalDifference, expected.goalDifference);
      assert.equal(row.points, expected.points);
    }
  });

  it('uses only completed matches when user predictions are incomplete', () => {
    const table = getGroupTable({
      selectedTeamId: 'mex',
      teamList: teams,
      userPredictions: {
        'group-A-mex-rsa': { home: 1, away: 0 },
      },
      completedMatches: [
        {
          id: 'group-A-mex-rsa',
          stage: 'group',
          homeTeamId: 'mex',
          awayTeamId: 'rsa',
          status: 'completed',
          groupId: 'A',
          result: { regulation: { home: 1, away: 0 } },
        },
      ],
    });

    const expectedStandings = calculateStandings({
      teamIds: ['mex', 'rsa', 'kor', 'cze'],
      matches: [
        {
          id: 'group-A-mex-rsa',
          stage: 'group',
          homeTeamId: 'mex',
          awayTeamId: 'rsa',
          status: 'completed',
          groupId: 'A',
          result: { regulation: { home: 1, away: 0 } },
        },
      ],
    });

    assert.ok(table);
    assert.deepEqual(table.rows, buildGroupTableRows(expectedStandings));
  });

  it('builds final group standings from completed and preview matches', () => {
    const groupStage = simulateGroupStage({
      groups,
      teams,
      ratings: teamRatingsById,
      seed: 'final-group-standings',
    });

    const previewOnly = groupStage.results.slice(0, 24);
    const completedOnly = groupStage.results.slice(24);

    const finalStandings = computeFinalGroupStandings(completedOnly, previewOnly);

    for (const group of groups) {
      assert.equal(finalStandings[group.id]?.every((standing) => standing.played === 3), true);
    }
  });

  it('ranks the best eight third-place teams for qualification', () => {
    const groupStage = simulateGroupStage({
      groups,
      teams,
      ratings: teamRatingsById,
      seed: 'third-place-ranking',
    });
    const thirdPlaceRows = buildThirdPlaceRankingRows(groupStage.standings);
    const qualifiedThirdPlaceTeamIds = getQualifiedThirdPlaceTeamIds(groupStage.standings);

    assert.equal(thirdPlaceRows.length, 12);
    assert.equal(qualifiedThirdPlaceTeamIds.size, 8);
    assert.equal(thirdPlaceRows.filter((row) => row.qualifies).length, 8);
    assert.equal(thirdPlaceRows[0].position, 1);
    assert.equal(thirdPlaceRows[7].qualifies, true);
    assert.equal(thirdPlaceRows[8].qualifies, false);

    for (const row of thirdPlaceRows.slice(0, 8)) {
      assert.equal(isTeamQualifiedFromGroupStage(row.teamId, groupStage.standings), true);
    }

    for (const row of thirdPlaceRows.slice(8)) {
      assert.equal(isTeamQualifiedFromGroupStage(row.teamId, groupStage.standings), false);
    }
  });
});
