import { getOfficialFixtureResult, getWorldCupGroupFixtures } from '@/data/worldcup-fixtures';
import { calculateStandings } from '@/simulation/calculate-standings';
import { simulateMatch } from '@/simulation/simulate-match';
import type { Match, PeriodScore } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { TeamRating } from '@/types/team';
import { createSeededRandom } from '@/utils/seeded-random';

const QUALIFYING_POSITIONS = 2;

export type SimulateGroupInput = {
  groupId: string;
  teamIds: string[];
  ratings: Record<string, TeamRating>;
  seed: string | number;
  userTeamId?: string | null;
  userPredictions?: Record<string, PeriodScore>;
};

export type SimulateGroupOutput = {
  fixtures: Match[];
  results: Match[];
  standings: Standing[];
  qualifiedTeamIds: string[];
};

function assertRatingsForTeams(teamIds: string[], ratings: Record<string, TeamRating>): void {
  for (const teamId of teamIds) {
    const rating = ratings[teamId];

    if (!rating) {
      throw new Error(`Missing rating for team: ${teamId}`);
    }

    if (rating.teamId !== teamId) {
      throw new Error(`Rating teamId must match team id: ${teamId}`);
    }
  }
}

function matchInvolvesTeam(match: Match, teamId: string): boolean {
  return match.homeTeamId === teamId || match.awayTeamId === teamId;
}

function simulateFixture(
  fixture: Match,
  ratings: Record<string, TeamRating>,
  seed: string | number,
  userTeamId: string | null | undefined,
  userPredictions: Record<string, PeriodScore> | undefined,
): Match {
  if (userTeamId && matchInvolvesTeam(fixture, userTeamId)) {
    const prediction = userPredictions?.[fixture.id];
    const officialResult = getOfficialFixtureResult(fixture.id);

    if (prediction) {
      return {
        ...fixture,
        status: 'completed',
        result: {
          regulation: prediction,
        },
      };
    }

    if (officialResult) {
      return {
        ...fixture,
        status: 'completed',
        result: {
          regulation: officialResult,
        },
      };
    }

    throw new Error(`Missing user prediction for match: ${fixture.id}`);
  }

  const random = createSeededRandom(`${seed}:${fixture.id}`);
  const homeRating = ratings[fixture.homeTeamId];
  const awayRating = ratings[fixture.awayTeamId];
  const outcome = simulateMatch({
    homeTeam: { id: fixture.homeTeamId },
    awayTeam: { id: fixture.awayTeamId },
    homeRating,
    awayRating,
    random,
  });

  return {
    ...fixture,
    status: 'completed',
    result: {
      regulation: {
        home: outcome.homeGoals,
        away: outcome.awayGoals,
      },
    },
  };
}

export function simulateGroup(input: SimulateGroupInput): SimulateGroupOutput {
  const { groupId, teamIds, ratings, seed, userTeamId, userPredictions } = input;

  assertRatingsForTeams(teamIds, ratings);

  const fixtures = getWorldCupGroupFixtures(groupId);
  const fixtureTeamIds = new Set(
    fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]),
  );

  for (const teamId of teamIds) {
    if (!fixtureTeamIds.has(teamId)) {
      throw new Error(`Team ${teamId} is not part of group ${groupId} fixtures`);
    }
  }
  const results = fixtures.map((fixture) =>
    simulateFixture(fixture, ratings, seed, userTeamId, userPredictions),
  );
  const standings = calculateStandings({ teamIds, matches: results });
  const qualifiedTeamIds = standings.slice(0, QUALIFYING_POSITIONS).map((standing) => standing.teamId);

  return {
    fixtures,
    results,
    standings,
    qualifiedTeamIds,
  };
}
