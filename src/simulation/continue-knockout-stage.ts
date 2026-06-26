import { simulateKnockoutRound } from '@/simulation/simulate-knockout-round';
import {
  type KnockoutRoundResult,
  type KnockoutStageMatch,
  type SimulateKnockoutStageOutput,
} from '@/simulation/simulate-knockout-stage';
import type { KnockoutBracketMatch, KnockoutRound } from '@/types/knockout';
import type { TeamRating } from '@/types/team';

export type ContinueKnockoutStageInput = {
  completedRounds: KnockoutRoundResult[];
  ratings: Record<string, TeamRating>;
  seed: string | number;
};

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

function getNextCompetitiveRound(round: KnockoutRound): KnockoutRound | null {
  switch (round) {
    case 'round-of-32':
      return 'round-of-16';
    case 'round-of-16':
      return 'quarter-final';
    case 'quarter-final':
      return 'semi-final';
    case 'semi-final':
      return null;
    default:
      return null;
  }
}

function simulateClosingRounds(
  semiFinalMatches: KnockoutStageMatch[],
  ratings: Record<string, TeamRating>,
  seed: string | number,
): KnockoutRoundResult[] {
  const semiFinalLosers = semiFinalMatches.map(getLoser);
  const thirdPlaceFixture: KnockoutBracketMatch = {
    id: 'third-place-1',
    round: 'third-place',
    slot: 1,
    homeTeamId: semiFinalLosers[0],
    awayTeamId: semiFinalLosers[1],
  };
  const thirdPlaceMatches = simulateKnockoutRound({
    fixtures: [thirdPlaceFixture],
    ratings,
    seed,
  });

  const finalFixture: KnockoutBracketMatch = {
    id: 'final-1',
    round: 'final',
    slot: 1,
    homeTeamId: semiFinalMatches[0].winnerTeamId,
    awayTeamId: semiFinalMatches[1].winnerTeamId,
  };
  const finalMatches = simulateKnockoutRound({
    fixtures: [finalFixture],
    ratings,
    seed,
  });

  return [
    { round: 'third-place', matches: thirdPlaceMatches },
    { round: 'final', matches: finalMatches },
  ];
}

export function continueKnockoutStage(
  input: ContinueKnockoutStageInput,
): SimulateKnockoutStageOutput {
  const { completedRounds, ratings, seed } = input;

  if (completedRounds.length === 0) {
    throw new Error('Cannot continue knockout stage without completed rounds');
  }

  const roundResults: KnockoutRoundResult[] = [...completedRounds];
  let currentMatches = completedRounds.at(-1)!.matches;
  let currentRound = completedRounds.at(-1)!.round;

  if (currentRound === 'final') {
    const finalMatch = currentMatches[0];
    const thirdPlaceRound = roundResults.find((round) => round.round === 'third-place');

    if (!thirdPlaceRound) {
      throw new Error('Cannot continue knockout stage: final completed without third-place round');
    }

    const thirdPlaceMatch = thirdPlaceRound.matches[0];

    return {
      rounds: roundResults,
      final: finalMatch,
      championId: finalMatch.winnerTeamId,
      runnerUpId: getLoser(finalMatch),
      thirdPlaceId: thirdPlaceMatch.winnerTeamId,
    };
  }

  while (true) {
    const nextRound = getNextCompetitiveRound(currentRound);

    if (!nextRound) {
      break;
    }

    const fixtures = buildNextRoundFixtures(nextRound, currentMatches);
    currentMatches = simulateKnockoutRound({
      fixtures,
      ratings,
      seed,
    });
    roundResults.push({ round: nextRound, matches: currentMatches });
    currentRound = nextRound;
  }

  if (currentRound !== 'semi-final') {
    throw new Error(`Knockout continuation cannot continue from round: ${currentRound}`);
  }

  const closingRounds = simulateClosingRounds(currentMatches, ratings, seed);
  roundResults.push(...closingRounds);

  const finalMatch = closingRounds.find((round) => round.round === 'final')!.matches[0];
  const thirdPlaceMatch = closingRounds.find((round) => round.round === 'third-place')!.matches[0];

  return {
    rounds: roundResults,
    final: finalMatch,
    championId: finalMatch.winnerTeamId,
    runnerUpId: getLoser(finalMatch),
    thirdPlaceId: thirdPlaceMatch.winnerTeamId,
  };
}
