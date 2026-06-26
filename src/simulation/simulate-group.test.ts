import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getUserGroupMatches } from '@/utils/user-matches';
import { teams } from '@/data/teams';
import { simulateGroup } from '@/simulation/simulate-group';
import type { TeamRating } from '@/types/team';

const GROUP_A_TEAM_IDS = ['mex', 'rsa', 'kor', 'cze'];

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

function makeGroupRatings(teamIds: string[], strongTeamId?: string): Record<string, TeamRating> {
  return Object.fromEntries(
    teamIds.map((teamId) => [
      teamId,
      makeRating(
        teamId,
        teamId === strongTeamId
          ? { overall: 88, attack: 90, defence: 86, form: 88, tournamentExperience: 90 }
          : teamId === 'rsa'
            ? { overall: 42, attack: 40, defence: 44, form: 42, tournamentExperience: 40 }
            : {},
      ),
    ]),
  );
}

describe('simulateGroup', () => {
  it('returns fixtures, completed results, standings and two qualifiers', () => {
    const output = simulateGroup({
      groupId: 'A',
      teamIds: GROUP_A_TEAM_IDS,
      ratings: makeGroupRatings(GROUP_A_TEAM_IDS, 'mex'),
      seed: 'group-a',
    });

    assert.equal(output.fixtures.length, 6);
    assert.equal(output.results.length, 6);
    assert.equal(output.standings.length, 4);
    assert.equal(output.qualifiedTeamIds.length, 2);

    for (const fixture of output.fixtures) {
      assert.equal(fixture.status, 'scheduled');
      assert.equal(fixture.groupId, 'A');
      assert.equal(fixture.result, undefined);
      assert.ok(fixture.scheduledDate);
    }

    for (const result of output.results) {
      assert.equal(result.status, 'completed');
      assert.ok(result.result);
      assert.ok(Number.isInteger(result.result!.regulation.home));
      assert.ok(Number.isInteger(result.result!.regulation.away));
    }
  });

  it('qualifies the top two teams from standings', () => {
    const output = simulateGroup({
      groupId: 'B',
      teamIds: ['can', 'bih', 'qat', 'sui'],
      ratings: makeGroupRatings(['can', 'bih', 'qat', 'sui'], 'sui'),
      seed: 'group-qualification',
    });

    const expectedQualifiers = output.standings.slice(0, 2).map((standing) => standing.teamId);

    assert.deepEqual(output.qualifiedTeamIds, expectedQualifiers);
  });

  it('produces deterministic output for the same seed', () => {
    const input = {
      groupId: 'C',
      teamIds: ['bra', 'mar', 'hai', 'sco'],
      ratings: makeGroupRatings(['bra', 'mar', 'hai', 'sco'], 'bra'),
      seed: 'deterministic-group',
    };

    const first = simulateGroup(input);
    const second = simulateGroup(input);

    assert.deepEqual(second.results, first.results);
    assert.deepEqual(second.standings, first.standings);
    assert.deepEqual(second.qualifiedTeamIds, first.qualifiedTeamIds);
  });

  it('favours a strong team in the final standings over many matches', () => {
    const output = simulateGroup({
      groupId: 'A',
      teamIds: GROUP_A_TEAM_IDS,
      ratings: makeGroupRatings(GROUP_A_TEAM_IDS, 'mex'),
      seed: 'strong-team-group',
    });

    const strongStanding = output.standings.find((standing) => standing.teamId === 'mex')!;
    const weakStanding = output.standings.find((standing) => standing.teamId === 'rsa')!;

    assert.ok(strongStanding.points >= weakStanding.points);
    assert.ok(output.qualifiedTeamIds.includes('mex'));
  });

  it('rejects missing ratings', () => {
    assert.throws(
      () =>
        simulateGroup({
          groupId: 'A',
          teamIds: GROUP_A_TEAM_IDS,
          ratings: makeGroupRatings(['mex', 'rsa', 'kor']),
          seed: 'missing-rating',
        }),
      /Missing rating for team: cze/,
    );
  });

  it('uses user predictions for matches involving the selected team', () => {
    const userPredictions = Object.fromEntries(
      getUserGroupMatches('mex', teams).map((match) => [match.id, { home: 2, away: 0 }]),
    );
    const baseline = simulateGroup({
      groupId: 'A',
      teamIds: GROUP_A_TEAM_IDS,
      ratings: makeGroupRatings(GROUP_A_TEAM_IDS, 'mex'),
      seed: 'user-prediction-baseline',
    });
    const output = simulateGroup({
      groupId: 'A',
      teamIds: GROUP_A_TEAM_IDS,
      ratings: makeGroupRatings(GROUP_A_TEAM_IDS, 'mex'),
      seed: 'user-prediction-baseline',
      userTeamId: 'mex',
      userPredictions,
    });

    for (const [matchId, prediction] of Object.entries(userPredictions)) {
      const result = output.results.find((match) => match.id === matchId);

      assert.ok(result);
      assert.deepEqual(result.result?.regulation, prediction);
    }

    for (const matchId of ['group-A-kor-cze', 'group-A-cze-rsa', 'group-A-rsa-kor']) {
      const baselineResult = baseline.results.find((match) => match.id === matchId);
      const outputResult = output.results.find((match) => match.id === matchId);

      assert.ok(baselineResult);
      assert.ok(outputResult);
      assert.deepEqual(outputResult.result, baselineResult.result);
    }
  });

  it('rejects group simulation when a user match is missing a prediction', () => {
    assert.throws(
      () =>
        simulateGroup({
          groupId: 'A',
          teamIds: GROUP_A_TEAM_IDS,
          ratings: makeGroupRatings(GROUP_A_TEAM_IDS, 'mex'),
          seed: 'missing-user-prediction',
          userTeamId: 'mex',
          userPredictions: {
            'group-A-mex-rsa': { home: 1, away: 0 },
          },
        }),
      /Missing user prediction for match: group-A-mex-kor/,
    );
  });
});
