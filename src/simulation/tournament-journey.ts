import { buildRoundOf32FromFixtures } from '@/simulation/build-round-of-32-from-fixtures';
import { hasOfficialFixtureResult , getWorldCupKnockoutFixtures } from '@/data/worldcup-fixtures';
import { computeAllGroupStandings } from '@/simulation/compute-group-standings';
import { continueKnockoutStage } from '@/simulation/continue-knockout-stage';
import { simulateKnockoutRound } from '@/simulation/simulate-knockout-round';
import { simulateKnockoutStage } from '@/simulation/simulate-knockout-stage';
import type { KnockoutRoundResult } from '@/simulation/simulate-knockout-stage';
import type { KnockoutBracketMatch, KnockoutRound } from '@/types/knockout';
import type { Match, UserMatchPrediction } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { Team, TeamRating } from '@/types/team';
import type { TournamentStage } from '@/types/tournament';
import { isPeriodScorePrediction } from '@/utils/match-predictions';
import { getUserGroupMatches } from '@/utils/user-matches';
import { isTeamQualifiedFromGroupStage } from '@/utils/group-standings';

const DEFAULT_JOURNEY_SEED = 'tournament-journey';

export type TournamentJourneyPhase =
  | 'group'
  | 'knockout'
  | 'eliminated'
  | 'champion'
  | 'not-qualified';

export type TournamentJourneyState = {
  phase: TournamentJourneyPhase;
  userQualified: boolean;
  currentStage: TournamentStage;
  championId: string | null;
  roundOf32Fixtures: KnockoutBracketMatch[];
  knockoutRoundResults: KnockoutRoundResult[];
  pendingKnockoutFixture: KnockoutBracketMatch | null;
};

export type TournamentJourneyInput = {
  selectedTeamId: string;
  teamList: Team[];
  userPredictions: Record<string, UserMatchPrediction>;
  ratings: Record<string, TeamRating>;
  seed?: string | number;
  completedMatches?: Match[];
  groupStandings?: Record<string, Standing[]>;
};

export function hasAllUserGroupPredictions(
  selectedTeamId: string,
  teamList: Team[],
  userPredictions: Record<string, UserMatchPrediction>,
): boolean {
  return getUserGroupMatches(selectedTeamId, teamList).every(
    (match) =>
      isPeriodScorePrediction(userPredictions[match.id]) || hasOfficialFixtureResult(match.id),
  );
}

export function knockoutFixtureToMatch(fixture: KnockoutBracketMatch): Match {
  return {
    id: fixture.id,
    stage: fixture.round,
    homeTeamId: fixture.homeTeamId!,
    awayTeamId: fixture.awayTeamId!,
    status: 'scheduled',
    scheduledDate: fixture.scheduledDate,
    scheduledTime: fixture.scheduledTime,
    ground: fixture.ground,
  };
}

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

function findUserFixture(
  fixtures: KnockoutBracketMatch[],
  userTeamId: string,
): KnockoutBracketMatch | null {
  return fixtures.find(
    (fixture) => fixture.homeTeamId === userTeamId || fixture.awayTeamId === userTeamId,
  ) ?? null;
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

function getNextUserKnockoutRound(round: KnockoutRound): KnockoutRound | null {
  switch (round) {
    case 'round-of-32':
      return 'round-of-16';
    case 'round-of-16':
      return 'quarter-final';
    case 'quarter-final':
      return 'semi-final';
    case 'semi-final':
      return 'final';
    default:
      return null;
  }
}

function simulateThirdPlaceMatch(
  semiFinalMatches: KnockoutRoundResult['matches'],
  ratings: Record<string, TeamRating>,
  seed: string | number,
): KnockoutRoundResult {
  const semiFinalLosers = semiFinalMatches.map((match) =>
    match.winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId,
  );
  const template = getKnockoutFixtureTemplate('third-place', 1);

  const fixtures: KnockoutBracketMatch[] = [
    {
      id: 'third-place-1',
      round: 'third-place',
      slot: 1,
      homeTeamId: semiFinalLosers[0],
      awayTeamId: semiFinalLosers[1],
      fixtureNum: template?.num,
      scheduledDate: template?.scheduledDate,
      scheduledTime: template?.scheduledTime,
      ground: template?.ground,
    },
  ];

  return {
    round: 'third-place',
    matches: simulateKnockoutRound({ fixtures, ratings, seed }),
  };
}

function buildFinalFixture(
  semiFinalMatches: KnockoutRoundResult['matches'],
): KnockoutBracketMatch {
  const sortedMatches = [...semiFinalMatches].sort((matchA, matchB) => matchA.slot - matchB.slot);
  const template = getKnockoutFixtureTemplate('final', 1);

  return {
    id: 'final-1',
    round: 'final',
    slot: 1,
    homeTeamId: sortedMatches[0].winnerTeamId,
    awayTeamId: sortedMatches[1].winnerTeamId,
    fixtureNum: template?.num,
    scheduledDate: template?.scheduledDate,
    scheduledTime: template?.scheduledTime,
    ground: template?.ground,
  };
}

export function startKnockoutJourney(input: TournamentJourneyInput): TournamentJourneyState {
  const {
    selectedTeamId,
    teamList,
    ratings,
    seed = DEFAULT_JOURNEY_SEED,
  } = input;

  const standings =
    input.groupStandings ?? computeAllGroupStandings(input.completedMatches ?? []);

  const userGroupId = teamList.find((team) => team.id === selectedTeamId)?.group;

  if (!userGroupId) {
    throw new Error(`Unknown selected team: ${selectedTeamId}`);
  }

  const userQualified = isTeamQualifiedFromGroupStage(selectedTeamId, standings);

  const roundOf32 = buildRoundOf32FromFixtures(standings);

  if (!userQualified) {
    const knockoutStage = simulateKnockoutStage({
      roundOf32,
      ratings,
      seed: `${seed}:knockout`,
    });

    return {
      phase: 'not-qualified',
      userQualified: false,
      currentStage: 'final',
      championId: knockoutStage.championId,
      roundOf32Fixtures: roundOf32,
      knockoutRoundResults: knockoutStage.rounds,
      pendingKnockoutFixture: null,
    };
  }

  const pendingKnockoutFixture = findUserFixture(roundOf32, selectedTeamId);

  if (!pendingKnockoutFixture) {
    throw new Error(`Selected team ${selectedTeamId} qualified but has no Round of 32 fixture`);
  }

  return {
    phase: 'knockout',
    userQualified: true,
    currentStage: 'round-of-32',
    championId: null,
    roundOf32Fixtures: roundOf32,
    knockoutRoundResults: [],
    pendingKnockoutFixture,
  };
}

export function advanceKnockoutJourney(
  input: TournamentJourneyInput & {
    roundOf32Fixtures: KnockoutBracketMatch[];
    knockoutRoundResults: KnockoutRoundResult[];
    pendingKnockoutFixture: KnockoutBracketMatch;
  },
): TournamentJourneyState {
  const {
    selectedTeamId,
    userPredictions,
    ratings,
    seed = DEFAULT_JOURNEY_SEED,
    roundOf32Fixtures,
    knockoutRoundResults,
    pendingKnockoutFixture,
  } = input;

  const currentRound = pendingKnockoutFixture.round;
  const fixtures =
    currentRound === 'round-of-32'
      ? roundOf32Fixtures
      : currentRound === 'final'
        ? [pendingKnockoutFixture]
        : buildNextRoundFixtures(
            currentRound,
            knockoutRoundResults.find((round) => {
              const previousRound =
                currentRound === 'round-of-16'
                  ? 'round-of-32'
                  : currentRound === 'quarter-final'
                    ? 'round-of-16'
                    : currentRound === 'semi-final'
                      ? 'quarter-final'
                      : 'semi-final';

              return round.round === previousRound;
            })!.matches,
          );

  const roundResult: KnockoutRoundResult = {
    round: currentRound,
    matches: simulateKnockoutRound({
      fixtures,
      ratings,
      seed: `${seed}:knockout`,
      userTeamId: selectedTeamId,
      userPredictions,
    }),
  };

  const updatedRounds = [...knockoutRoundResults, roundResult];
  const userMatch = roundResult.matches.find(
    (match) => match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId,
  )!;

  if (userMatch.winnerTeamId !== selectedTeamId) {
    const completedKnockout = continueKnockoutStage({
      completedRounds: updatedRounds,
      ratings,
      seed: `${seed}:knockout`,
    });

    return {
      phase: 'eliminated',
      userQualified: true,
      currentStage: 'final',
      championId: completedKnockout.championId,
      roundOf32Fixtures,
      knockoutRoundResults: completedKnockout.rounds,
      pendingKnockoutFixture: null,
    };
  }

  if (currentRound === 'final') {
    return {
      phase: 'champion',
      userQualified: true,
      currentStage: 'final',
      championId: selectedTeamId,
      roundOf32Fixtures,
      knockoutRoundResults: updatedRounds,
      pendingKnockoutFixture: null,
    };
  }

  if (currentRound === 'semi-final') {
    const thirdPlaceRound = simulateThirdPlaceMatch(
      roundResult.matches,
      ratings,
      `${seed}:knockout`,
    );
    const finalFixture = buildFinalFixture(roundResult.matches);
    const roundsWithThirdPlace = [...updatedRounds, thirdPlaceRound];

    return {
      phase: 'knockout',
      userQualified: true,
      currentStage: 'final',
      championId: null,
      roundOf32Fixtures,
      knockoutRoundResults: roundsWithThirdPlace,
      pendingKnockoutFixture: finalFixture,
    };
  }

  const nextRound = getNextUserKnockoutRound(currentRound);

  if (!nextRound) {
    throw new Error(`Cannot advance from knockout round: ${currentRound}`);
  }

  const nextFixtures = buildNextRoundFixtures(nextRound, roundResult.matches);
  const nextPendingKnockoutFixture = findUserFixture(nextFixtures, selectedTeamId);

  if (!nextPendingKnockoutFixture) {
    throw new Error(`Selected team ${selectedTeamId} has no fixture in ${nextRound}`);
  }

  return {
    phase: 'knockout',
    userQualified: true,
    currentStage: nextRound,
    championId: null,
    roundOf32Fixtures,
    knockoutRoundResults: updatedRounds,
    pendingKnockoutFixture: nextPendingKnockoutFixture,
  };
}
