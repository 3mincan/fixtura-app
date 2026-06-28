import { getWorldCupKnockoutFixtures } from '@/data/worldcup-fixtures';
import { teamRatingsById } from '@/data/team-ratings';
import { buildKnockoutRoundForTimeline } from '@/simulation/simulate-knockout-round';
import type { KnockoutRoundResult } from '@/simulation/simulate-knockout-stage';
import type { KnockoutBracketMatch, KnockoutRound } from '@/types/knockout';
import type { Match, PeriodScore , MatchResult } from '@/types/match';
import type { TeamRating } from '@/types/team';

export type KnockoutTimelineState = {
  round: KnockoutRound;
  fixtures: Match[];
  resultMatches: Match[];
};

function getKnockoutTemplateRoundName(round: KnockoutRound): string {
  switch (round) {
    case 'round-of-32':
      return 'Round of 32';
    case 'round-of-16':
      return 'Round of 16';
    case 'quarter-final':
      return 'Quarter-final';
    case 'semi-final':
      return 'Semi-final';
    case 'third-place':
      return 'Match for third place';
    case 'final':
      return 'Final';
  }
}

function getKnockoutFixtureTemplate(round: KnockoutRound, slot: number) {
  return getWorldCupKnockoutFixtures(getKnockoutTemplateRoundName(round))[slot - 1];
}

function buildNextRoundFixtures(
  round: KnockoutRound,
  previousMatches: KnockoutRoundResult['matches'],
): KnockoutBracketMatch[] {
  const sortedMatches = [...previousMatches].sort((matchA, matchB) => matchA.slot - matchB.slot);
  const winners = sortedMatches.map((match) => match.winnerTeamId);

  return Array.from({ length: winners.length / 2 }, (_, index) => {
    const homeTeamId = winners[index * 2];
    const awayTeamId = winners[index * 2 + 1];
    const slot = index + 1;
    const template = getKnockoutFixtureTemplate(round, slot);

    return {
      id: `${round}-${slot}`,
      round,
      slot,
      homeTeamId,
      awayTeamId,
      fixtureNum: template?.num,
      scheduledDate: template?.scheduledDate,
      scheduledTime: template?.scheduledTime,
      ground: template?.ground,
    };
  });
}

function getPreviousKnockoutRound(round: KnockoutRound): KnockoutRound | null {
  switch (round) {
    case 'round-of-16':
      return 'round-of-32';
    case 'quarter-final':
      return 'round-of-16';
    case 'semi-final':
      return 'quarter-final';
    case 'final':
      return 'semi-final';
    default:
      return null;
  }
}

function getLoser(match: KnockoutRoundResult['matches'][number]): string {
  return match.winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
}

function buildThirdPlaceFixtures(
  semiFinalMatches: KnockoutRoundResult['matches'],
): KnockoutBracketMatch[] {
  const sortedMatches = [...semiFinalMatches].sort((matchA, matchB) => matchA.slot - matchB.slot);
  const semiFinalLosers = sortedMatches.map(getLoser);
  const template = getKnockoutFixtureTemplate('third-place', 1);

  return [
    {
      id: 'third-place-1',
      round: 'third-place',
      slot: 1,
      homeTeamId: semiFinalLosers[0]!,
      awayTeamId: semiFinalLosers[1]!,
      fixtureNum: template?.num,
      scheduledDate: template?.scheduledDate,
      scheduledTime: template?.scheduledTime,
      ground: template?.ground,
    },
  ];
}

function buildFinalFixtures(
  semiFinalMatches: KnockoutRoundResult['matches'],
): KnockoutBracketMatch[] {
  const sortedMatches = [...semiFinalMatches].sort((matchA, matchB) => matchA.slot - matchB.slot);
  const template = getKnockoutFixtureTemplate('final', 1);

  return [
    {
      id: 'final-1',
      round: 'final',
      slot: 1,
      homeTeamId: sortedMatches[0]!.winnerTeamId,
      awayTeamId: sortedMatches[1]!.winnerTeamId,
      fixtureNum: template?.num,
      scheduledDate: template?.scheduledDate,
      scheduledTime: template?.scheduledTime,
      ground: template?.ground,
    },
  ];
}

export function fixturesFromRoundResult(roundResult: KnockoutRoundResult): KnockoutBracketMatch[] {
  const templates = getWorldCupKnockoutFixtures(getKnockoutTemplateRoundName(roundResult.round));

  return [...roundResult.matches]
    .sort((matchA, matchB) => matchA.slot - matchB.slot)
    .map((match) => {
      const template = templates[match.slot - 1];

      return {
        id: match.id,
        round: match.round,
        slot: match.slot,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        fixtureNum: template?.num,
        scheduledDate: template?.scheduledDate,
        scheduledTime: template?.scheduledTime,
        ground: template?.ground,
      };
    });
}

export function resolveKnockoutRoundFixtures(input: {
  round: KnockoutRound;
  roundOf32Fixtures: KnockoutBracketMatch[];
  knockoutRoundResults: KnockoutRoundResult[];
  pendingKnockoutFixture?: KnockoutBracketMatch | null;
}): KnockoutBracketMatch[] {
  const { round, roundOf32Fixtures, knockoutRoundResults, pendingKnockoutFixture } = input;

  if (round === 'round-of-32') {
    return roundOf32Fixtures;
  }

  if (round === 'final') {
    if (pendingKnockoutFixture) {
      return [pendingKnockoutFixture];
    }

    const semiFinalResult = knockoutRoundResults.find((result) => result.round === 'semi-final');

    if (!semiFinalResult) {
      throw new Error(`Missing previous knockout round results for ${round}`);
    }

    return buildFinalFixtures(semiFinalResult.matches);
  }

  if (round === 'third-place') {
    const semiFinalResult = knockoutRoundResults.find((result) => result.round === 'semi-final');

    if (!semiFinalResult) {
      throw new Error(`Missing previous knockout round results for ${round}`);
    }

    return buildThirdPlaceFixtures(semiFinalResult.matches);
  }

  const previousRound = getPreviousKnockoutRound(round);

  if (!previousRound) {
    throw new Error(`Unable to resolve fixtures for knockout round: ${round}`);
  }

  const previousResult = knockoutRoundResults.find((result) => result.round === previousRound);

  if (!previousResult) {
    throw new Error(`Missing previous knockout round results for ${round}`);
  }

  return buildNextRoundFixtures(round, previousResult.matches);
}

export function buildKnockoutTimelineState(input: {
  round: KnockoutRound;
  fixtures: KnockoutBracketMatch[];
  resolvedMatches: KnockoutRoundResult['matches'];
}): KnockoutTimelineState {
  const templates = getWorldCupKnockoutFixtures(getKnockoutTemplateRoundName(input.round));
  const sortedFixtures = [...input.fixtures].sort((fixtureA, fixtureB) => fixtureA.slot - fixtureB.slot);
  const resolvedById = new Map(input.resolvedMatches.map((match) => [match.id, match]));

  const fixtures = sortedFixtures.map((fixture): Match => {
    const template = templates[fixture.slot - 1];

    return {
      id: fixture.id,
      stage: fixture.round,
      homeTeamId: fixture.homeTeamId!,
      awayTeamId: fixture.awayTeamId!,
      status: 'scheduled',
      scheduledDate: fixture.scheduledDate ?? template?.scheduledDate,
      scheduledTime: fixture.scheduledTime ?? template?.scheduledTime,
      ground: fixture.ground ?? template?.ground,
    };
  });

  const resultMatches = fixtures
    .filter((fixture) => resolvedById.has(fixture.id))
    .map((fixture) => ({
      ...fixture,
      status: 'completed' as const,
      result: resolvedById.get(fixture.id)!.result,
    }));

  return {
    round: input.round,
    fixtures,
    resultMatches,
  };
}

export function buildKnockoutTimelineStateFromRoundResult(
  roundResult: KnockoutRoundResult,
  fixtures: KnockoutBracketMatch[],
): KnockoutTimelineState {
  return buildKnockoutTimelineState({
    round: roundResult.round,
    fixtures,
    resolvedMatches: roundResult.matches,
  });
}

export function getKnockoutTimelineUserMatch(
  timeline: KnockoutTimelineState | null,
  selectedTeamId: string | null,
): Match | null {
  if (!timeline || !selectedTeamId) {
    return null;
  }

  return (
    timeline.fixtures.find(
      (fixture) =>
        fixture.homeTeamId === selectedTeamId || fixture.awayTeamId === selectedTeamId,
    ) ?? null
  );
}

export function buildPendingKnockoutTimelineState(input: {
  round: KnockoutRound;
  roundOf32Fixtures: KnockoutBracketMatch[];
  knockoutRoundResults: KnockoutRoundResult[];
  pendingKnockoutFixture?: KnockoutBracketMatch | null;
  selectedTeamId: string;
  userPredictions: Record<string, PeriodScore | MatchResult>;
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
}): KnockoutTimelineState {
  const fixtures = resolveKnockoutRoundFixtures(input);
  const resolvedMatches = buildKnockoutRoundForTimeline({
    fixtures,
    ratings: input.ratings ?? teamRatingsById,
    seed: input.seed ?? 'knockout-timeline',
    userTeamId: input.selectedTeamId,
    userPredictions: input.userPredictions,
  });

  return buildKnockoutTimelineState({
    round: input.round,
    fixtures,
    resolvedMatches,
  });
}
