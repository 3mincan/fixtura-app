import { simulateKnockoutMatch } from '@/simulation/simulate-knockout-match';
import { ROUND_OF_32_MATCH_COUNT } from '@/simulation/knockout-bracket-mapping';
import type { SimulateKnockoutMatchOutput } from '@/simulation/types';
import type { KnockoutBracketMatch, KnockoutRound } from '@/types/knockout';
import type { MatchResult } from '@/types/match';
import type { TeamRating } from '@/types/team';
import { createSeededRandom } from '@/utils/seeded-random';

export type KnockoutStageMatch = {
  id: string;
  round: KnockoutRound;
  slot: number;
  homeTeamId: string;
  awayTeamId: string;
  result: MatchResult;
  winnerTeamId: string;
};

export type KnockoutRoundResult = {
  round: KnockoutRound;
  matches: KnockoutStageMatch[];
};

export type SimulateKnockoutStageInput = {
  roundOf32: KnockoutBracketMatch[];
  ratings: Record<string, TeamRating>;
  seed: string | number;
};

export type SimulateKnockoutStageOutput = {
  rounds: KnockoutRoundResult[];
  final: KnockoutStageMatch;
  championId: string;
  runnerUpId: string;
  thirdPlaceId: string;
};

const KNOCKOUT_ROUND_ORDER: KnockoutRound[] = [
  'round-of-32',
  'round-of-16',
  'quarter-final',
  'semi-final',
  'third-place',
  'final',
];

function toMatchResult(output: SimulateKnockoutMatchOutput): MatchResult {
  return {
    regulation: output.regulation,
    extraTime: output.extraTime,
    penalties: output.penalties,
  };
}

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

function validateRoundOf32(roundOf32: KnockoutBracketMatch[]): void {
  if (roundOf32.length !== ROUND_OF_32_MATCH_COUNT) {
    throw new Error(`Expected ${ROUND_OF_32_MATCH_COUNT} Round of 32 fixtures`);
  }

  for (const fixture of roundOf32) {
    if (fixture.round !== 'round-of-32') {
      throw new Error(`Expected round-of-32 fixture, received ${fixture.round}`);
    }

    if (!fixture.homeTeamId || !fixture.awayTeamId) {
      throw new Error(`Round of 32 fixture ${fixture.id} is missing teams`);
    }
  }
}

function simulateFixture(
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

function buildNextRoundFixtures(
  round: KnockoutRound,
  previousMatches: KnockoutStageMatch[],
): KnockoutBracketMatch[] {
  const sortedMatches = [...previousMatches].sort((matchA, matchB) => matchA.slot - matchB.slot);
  const winners = sortedMatches.map((match) => match.winnerTeamId);

  return Array.from({ length: winners.length / 2 }, (_, index) => {
    const homeTeamId = winners[index * 2];
    const awayTeamId = winners[index * 2 + 1];
    const slot = index + 1;

    return {
      id: `${round}-${slot}`,
      round,
      slot,
      homeTeamId,
      awayTeamId,
    };
  });
}

function getLoser(match: KnockoutStageMatch): string {
  return match.winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
}

export function simulateKnockoutStage(input: SimulateKnockoutStageInput): SimulateKnockoutStageOutput {
  const { roundOf32, ratings, seed } = input;

  validateRoundOf32(roundOf32);

  const teamIds = roundOf32.flatMap((fixture) => [fixture.homeTeamId!, fixture.awayTeamId!]);
  assertRatingsForTeams(teamIds, ratings);

  const roundResults: KnockoutRoundResult[] = [];
  let currentMatches = roundOf32.map((fixture) => simulateFixture(fixture, ratings, seed));
  roundResults.push({ round: 'round-of-32', matches: currentMatches });

  for (const round of ['round-of-16', 'quarter-final', 'semi-final'] as const) {
    const fixtures = buildNextRoundFixtures(round, currentMatches);
    const teamIdsInRound = fixtures.flatMap((fixture) => [fixture.homeTeamId!, fixture.awayTeamId!]);
    assertRatingsForTeams(teamIdsInRound, ratings);
    currentMatches = fixtures.map((fixture) => simulateFixture(fixture, ratings, seed));
    roundResults.push({ round, matches: currentMatches });
  }

  const semiFinalMatches = currentMatches;
  const semiFinalLosers = semiFinalMatches.map(getLoser);

  const thirdPlaceFixture: KnockoutBracketMatch = {
    id: 'third-place-1',
    round: 'third-place',
    slot: 1,
    homeTeamId: semiFinalLosers[0],
    awayTeamId: semiFinalLosers[1],
  };
  const thirdPlaceMatch = simulateFixture(thirdPlaceFixture, ratings, seed);
  roundResults.push({ round: 'third-place', matches: [thirdPlaceMatch] });

  const finalFixture: KnockoutBracketMatch = {
    id: 'final-1',
    round: 'final',
    slot: 1,
    homeTeamId: semiFinalMatches[0].winnerTeamId,
    awayTeamId: semiFinalMatches[1].winnerTeamId,
  };
  const finalMatch = simulateFixture(finalFixture, ratings, seed);
  roundResults.push({ round: 'final', matches: [finalMatch] });

  const runnerUpId = getLoser(finalMatch);

  return {
    rounds: roundResults,
    final: finalMatch,
    championId: finalMatch.winnerTeamId,
    runnerUpId,
    thirdPlaceId: thirdPlaceMatch.winnerTeamId,
  };
}

export { KNOCKOUT_ROUND_ORDER };
