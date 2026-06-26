import { simulateKnockoutMatch } from '@/simulation/simulate-knockout-match';
import type { KnockoutStageMatch } from '@/simulation/simulate-knockout-stage';
import type { SimulateKnockoutMatchOutput } from '@/simulation/types';
import type { KnockoutBracketMatch } from '@/types/knockout';
import type { MatchResult, PeriodScore } from '@/types/match';
import { getKnockoutWinnerTeamId, isMatchResult } from '@/utils/knockout-prediction';
import type { TeamRating } from '@/types/team';
import { createSeededRandom } from '@/utils/seeded-random';

export type SimulateKnockoutRoundInput = {
  fixtures: KnockoutBracketMatch[];
  ratings: Record<string, TeamRating>;
  seed: string | number;
  userTeamId?: string | null;
  userPredictions?: Record<string, PeriodScore | MatchResult>;
};

function toMatchResult(output: SimulateKnockoutMatchOutput): MatchResult {
  return {
    regulation: output.regulation,
    extraTime: output.extraTime,
    penalties: output.penalties,
  };
}

function matchInvolvesTeam(fixture: KnockoutBracketMatch, teamId: string): boolean {
  return fixture.homeTeamId === teamId || fixture.awayTeamId === teamId;
}

function simulateEngineFixture(
  fixture: KnockoutBracketMatch,
  ratings: Record<string, TeamRating>,
  seed: string | number,
): KnockoutStageMatch {
  const homeTeamId = fixture.homeTeamId!;
  const awayTeamId = fixture.awayTeamId!;
  const outcome = simulateKnockoutMatch({
    homeTeam: { id: homeTeamId },
    awayTeam: { id: awayTeamId },
    homeRating: ratings[homeTeamId],
    awayRating: ratings[awayTeamId],
    random: createSeededRandom(`${seed}:${fixture.id}`),
  });

  return {
    id: fixture.id,
    round: fixture.round,
    slot: fixture.slot,
    homeTeamId,
    awayTeamId,
    result: toMatchResult(outcome),
    winnerTeamId: outcome.winnerTeamId,
  };
}

function resolveUserPredictedFixture(
  fixture: KnockoutBracketMatch,
  prediction: PeriodScore | MatchResult,
): KnockoutStageMatch {
  const homeTeamId = fixture.homeTeamId!;
  const awayTeamId = fixture.awayTeamId!;
  const result: MatchResult = isMatchResult(prediction)
    ? prediction
    : { regulation: prediction };
  const winnerTeamId = getKnockoutWinnerTeamId(homeTeamId, awayTeamId, result);

  return {
    id: fixture.id,
    round: fixture.round,
    slot: fixture.slot,
    homeTeamId,
    awayTeamId,
    result,
    winnerTeamId,
  };
}

export function simulateKnockoutRound(input: SimulateKnockoutRoundInput): KnockoutStageMatch[] {
  const { fixtures, ratings, seed, userTeamId, userPredictions } = input;

  return fixtures.map((fixture) => {
    if (userTeamId && matchInvolvesTeam(fixture, userTeamId)) {
      const prediction = userPredictions?.[fixture.id];

      if (!prediction) {
        throw new Error(`Missing user prediction for match: ${fixture.id}`);
      }

      return resolveUserPredictedFixture(fixture, prediction);
    }

    return simulateEngineFixture(fixture, ratings, seed);
  });
}

export function buildKnockoutRoundForTimeline(
  input: SimulateKnockoutRoundInput,
): KnockoutStageMatch[] {
  const { fixtures, ratings, seed, userTeamId, userPredictions } = input;

  return fixtures.flatMap((fixture) => {
    if (userTeamId && matchInvolvesTeam(fixture, userTeamId)) {
      const prediction = userPredictions?.[fixture.id];

      if (!prediction) {
        return [];
      }

      return [resolveUserPredictedFixture(fixture, prediction)];
    }

    return [simulateEngineFixture(fixture, ratings, seed)];
  });
}
