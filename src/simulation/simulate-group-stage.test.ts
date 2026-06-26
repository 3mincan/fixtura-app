import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { simulateGroupStage } from '@/simulation/simulate-group-stage';
import type { Group } from '@/types/group';
import type { Team, TeamRating } from '@/types/team';

function buildGroupsFromTeams(teamList: Team[]): Group[] {
  const teamIdsByGroup = new Map<string, string[]>();

  for (const team of teamList) {
    const groupTeamIds = teamIdsByGroup.get(team.group) ?? [];
    groupTeamIds.push(team.id);
    teamIdsByGroup.set(team.group, groupTeamIds);
  }

  return [...teamIdsByGroup.entries()]
    .sort(([groupA], [groupB]) => groupA.localeCompare(groupB))
    .map(([id, teamIds]) => ({ id, teamIds }));
}

function makeRating(
  teamId: string,
  overrides: Partial<Omit<TeamRating, 'teamId'>> = {},
): TeamRating {
  return {
    teamId,
    overall: 65,
    attack: 65,
    defence: 65,
    form: 65,
    tournamentExperience: 65,
    ...overrides,
  };
}

function makeTestTeams(): Team[] {
  return teams.filter((team) => team.group === 'A' || team.group === 'B');
}

function makeTestRatings(teamList: Team[]): Record<string, TeamRating> {
  return Object.fromEntries(
    teamList.map((team) => [
      team.id,
      makeRating(
        team.id,
        team.id === 'mex' || team.id === 'can'
          ? { overall: 85, attack: 86, defence: 84, form: 85, tournamentExperience: 85 }
          : {},
      ),
    ]),
  );
}

describe('simulateGroupStage', () => {
  it('simulates every group and returns results, standings and qualifiers', () => {
    const testTeams = makeTestTeams();
    const groups = buildGroupsFromTeams(testTeams);
    const output = simulateGroupStage({
      groups,
      teams: testTeams,
      ratings: makeTestRatings(testTeams),
      seed: 'group-stage',
    });

    assert.equal(output.results.length, 12);
    assert.equal(Object.keys(output.standings).length, 2);
    assert.equal(output.standings.A.length, 4);
    assert.equal(output.standings.B.length, 4);
    assert.equal(output.qualifiedTeamIds.length, 4);

    for (const result of output.results) {
      assert.equal(result.status, 'completed');
      assert.ok(result.result);
      assert.ok(result.groupId);
    }
  });

  it('qualifies the top two teams from each group', () => {
    const testTeams = makeTestTeams();
    const groups = buildGroupsFromTeams(testTeams);
    const output = simulateGroupStage({
      groups,
      teams: testTeams,
      ratings: makeTestRatings(testTeams),
      seed: 'group-stage-qualifiers',
    });

    for (const group of groups) {
      const expectedQualifiers = output.standings[group.id].slice(0, 2).map((standing) => standing.teamId);

      for (const teamId of expectedQualifiers) {
        assert.ok(output.qualifiedTeamIds.includes(teamId));
      }
    }
  });

  it('produces deterministic output for the same seed', () => {
    const testTeams = makeTestTeams();
    const groups = buildGroupsFromTeams(testTeams);
    const input = {
      groups,
      teams: testTeams,
      ratings: makeTestRatings(testTeams),
      seed: 'deterministic-group-stage',
    };

    const first = simulateGroupStage(input);
    const second = simulateGroupStage(input);

    assert.deepEqual(second.results, first.results);
    assert.deepEqual(second.standings, first.standings);
    assert.deepEqual(second.qualifiedTeamIds, first.qualifiedTeamIds);
  });

  it('simulates the full 48-team tournament group stage', () => {
    const groups = buildGroupsFromTeams(teams);
    const output = simulateGroupStage({
      groups,
      teams,
      ratings: teamRatingsById,
      seed: 'worldcup2026',
    });

    assert.equal(groups.length, 12);
    assert.equal(output.results.length, 72);
    assert.equal(Object.keys(output.standings).length, 12);
    assert.equal(output.qualifiedTeamIds.length, 24);

    for (const group of groups) {
      assert.equal(output.standings[group.id].length, 4);
    }
  });

  it('rejects teams that do not match group assignments', () => {
    const testTeams = makeTestTeams();
    const groups = buildGroupsFromTeams(testTeams);

    assert.throws(
      () =>
        simulateGroupStage({
          groups,
          teams: testTeams.map((team) =>
            team.id === 'mex' ? { ...team, group: 'B' } : team,
          ),
          ratings: makeTestRatings(testTeams),
          seed: 'invalid-group-stage',
        }),
      /Team mex is assigned to group A but has group B/,
    );
  });
});
