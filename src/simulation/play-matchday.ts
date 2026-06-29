import { teamRatingsById } from '@/data/team-ratings';
import {
  getMatchesForMatchday,
  getMatchdayOrder,
  getOfficialFixtureResult,
  hasOfficialFixtureResult,
} from '@/data/worldcup-fixtures';
import { simulateMatch } from '@/simulation/simulate-match';
import { computeAllGroupStandings } from '@/simulation/compute-group-standings';
import type { Match, PeriodScore } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { TeamRating } from '@/types/team';
import { matchInvolvesTeam } from '@/utils/user-matches';
import { createSeededRandom } from '@/utils/seeded-random';

export type PlayMatchdayInput = {
  matchday: string;
  completedMatches: Match[];
  userTeamId: string | null;
  userPredictions: Record<string, PeriodScore>;
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
  autoSimulateUserMatches?: boolean;
  useOfficialResults?: boolean;
};

export type PlayMatchdayOutput = {
  completedMatches: Match[];
  groupStandings: Record<string, Standing[]>;
  playedMatchIds: string[];
};

export function getDefaultMatchdaySimulationSeed(
  matchday: string,
  seedPrefix = 'matchday-progress',
): string {
  return `${seedPrefix}:${matchday}:${matchday}`;
}

export function simulateFixture(
  fixture: Match,
  ratings: Record<string, TeamRating>,
  seed: string | number,
): Match {
  const random = createSeededRandom(`${seed}:${fixture.id}`);
  const outcome = simulateMatch({
    homeTeam: { id: fixture.homeTeamId },
    awayTeam: { id: fixture.awayTeamId },
    homeRating: ratings[fixture.homeTeamId],
    awayRating: ratings[fixture.awayTeamId],
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

function applyOfficialFixtureResult(fixture: Match, useOfficialResults = true): Match | null {
  if (!useOfficialResults) {
    return null;
  }

  const officialResult = getOfficialFixtureResult(fixture.id);

  if (!officialResult) {
    return null;
  }

  return {
    ...fixture,
    status: 'completed',
    result: {
      regulation: officialResult,
    },
  };
}

function resolveSimulatedFixtureResult(
  fixture: Match,
  ratings: Record<string, TeamRating>,
  seed: string | number,
  aiScores?: Record<string, PeriodScore>,
  requireAiScores?: boolean,
  useOfficialResults = true,
): Match | null {
  const official = applyOfficialFixtureResult(fixture, useOfficialResults);

  if (official) {
    return official;
  }

  if (requireAiScores && !aiScores?.[fixture.id]) {
    return null;
  }

  if (aiScores?.[fixture.id]) {
    return {
      ...fixture,
      status: 'completed',
      result: {
        regulation: aiScores[fixture.id],
      },
    };
  }

  return simulateFixture(fixture, ratings, seed);
}

function resolveFixtureResult(
  fixture: Match,
  userTeamId: string | null,
  userPredictions: Record<string, PeriodScore>,
  ratings: Record<string, TeamRating>,
  seed: string | number,
  aiScores?: Record<string, PeriodScore>,
  autoSimulateUserMatches?: boolean,
  requireAiScores?: boolean,
  useOfficialResults?: boolean,
): Match {
  const official = applyOfficialFixtureResult(fixture, useOfficialResults);

  if (official) {
    return official;
  }

  if (userTeamId && matchInvolvesTeam(fixture, userTeamId)) {
    const prediction = userPredictions[fixture.id];

    if (prediction) {
      return {
        ...fixture,
        status: 'completed',
        result: {
          regulation: prediction,
        },
      };
    }

    if (autoSimulateUserMatches) {
      const simulated = resolveSimulatedFixtureResult(
        fixture,
        ratings,
        seed,
        aiScores,
        requireAiScores,
        useOfficialResults,
      );

      if (simulated) {
        return simulated;
      }

      throw new Error(`Missing simulated score for user match: ${fixture.id}`);
    }

    throw new Error(`Missing user prediction for match: ${fixture.id}`);
  }

  const simulated = resolveSimulatedFixtureResult(
    fixture,
    ratings,
    seed,
    aiScores,
    requireAiScores,
    useOfficialResults,
  );

  if (!simulated) {
    throw new Error(`Missing simulated score for match: ${fixture.id}`);
  }

  return simulated;
}

export function previewAllGroupMatchdayResults(input: {
  userTeamId: string;
  userPredictions: Record<string, PeriodScore>;
  completedMatches: Match[];
  ratings?: Record<string, TeamRating>;
  seedPrefix?: string;
  aiScores?: Record<string, PeriodScore>;
  requireAiScores?: boolean;
  autoSimulateUserMatches?: boolean;
  useOfficialResults?: boolean;
}): Match[] {
  const {
    userTeamId,
    userPredictions,
    completedMatches,
    ratings,
    seedPrefix = 'matchday-progress',
    aiScores,
    requireAiScores = false,
    autoSimulateUserMatches = false,
    useOfficialResults = true,
  } = input;

  return getMatchdayOrder().flatMap((matchday) =>
    previewMatchdayResults({
      matchday,
      userTeamId,
      userPredictions,
      completedMatches,
      ratings,
      seed: `${seedPrefix}:${matchday}`,
      aiScores,
      requireAiScores,
      autoSimulateUserMatches,
      useOfficialResults,
    }),
  );
}

export function previewMatchdayResults(input: {
  matchday: string;
  userTeamId: string;
  userPredictions: Record<string, PeriodScore>;
  completedMatches: Match[];
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
  aiScores?: Record<string, PeriodScore>;
  requireAiScores?: boolean;
  autoSimulateUserMatches?: boolean;
  useOfficialResults?: boolean;
}): Match[] {
  const {
    matchday,
    userTeamId,
    userPredictions,
    completedMatches,
    ratings = teamRatingsById,
    seed = 'matchday',
    aiScores,
    requireAiScores = false,
    autoSimulateUserMatches = false,
    useOfficialResults = true,
  } = input;

  const completedMatchIds = new Set(completedMatches.map((match) => match.id));

  return getMatchesForMatchday(matchday).flatMap((fixture) => {
    if (completedMatchIds.has(fixture.id)) {
      return [];
    }

    if (matchInvolvesTeam(fixture, userTeamId)) {
      const prediction = userPredictions[fixture.id];

      if (prediction) {
        return [
          {
            ...fixture,
            status: 'completed' as const,
            result: {
              regulation: prediction,
            },
          },
        ];
      }

      const official = applyOfficialFixtureResult(fixture, useOfficialResults);

      if (official) {
        return [official];
      }

      if (!autoSimulateUserMatches) {
        return [];
      }

      const simulated = resolveSimulatedFixtureResult(
        fixture,
        ratings,
        `${seed}:${matchday}`,
        aiScores,
        false,
        useOfficialResults,
      );

      return simulated ? [simulated] : [];
    }

    const simulated = resolveSimulatedFixtureResult(
      fixture,
      ratings,
      `${seed}:${matchday}`,
      aiScores,
      requireAiScores,
      useOfficialResults,
    );

    return simulated ? [simulated] : [];
  });
}

export function playMatchday(
  input: PlayMatchdayInput & { aiScores?: Record<string, PeriodScore> },
): PlayMatchdayOutput {
  const {
    matchday,
    completedMatches,
    userTeamId,
    userPredictions,
    ratings = teamRatingsById,
    seed = 'matchday',
    aiScores,
    autoSimulateUserMatches = false,
    useOfficialResults = true,
  } = input;

  const completedMatchIds = new Set(completedMatches.map((match) => match.id));
  const matchdayFixtures = getMatchesForMatchday(matchday).filter(
    (fixture) => !completedMatchIds.has(fixture.id),
  );

  const playedMatches = matchdayFixtures.map((fixture) =>
    resolveFixtureResult(
      fixture,
      userTeamId,
      userPredictions,
      ratings,
      `${seed}:${matchday}`,
      aiScores,
      autoSimulateUserMatches,
      undefined,
      useOfficialResults,
    ),
  );

  const nextCompletedMatches = [...completedMatches, ...playedMatches];

  return {
    completedMatches: nextCompletedMatches,
    groupStandings: computeAllGroupStandings(nextCompletedMatches, { useOfficialResults }),
    playedMatchIds: playedMatches.map((match) => match.id),
  };
}

export function isGroupStageComplete(completedMatches: Match[]): boolean {
  const completedGroupMatchIds = new Set(
    completedMatches
      .filter((match) => match.stage === 'group' && match.status === 'completed')
      .map((match) => match.id),
  );

  return getMatchdayOrder().every((matchday) =>
    getMatchesForMatchday(matchday).every((fixture) => completedGroupMatchIds.has(fixture.id)),
  );
}

function isUserMatchResolvedForProgress(
  matchId: string,
  completedMatchIds: Set<string>,
  userPredictions: Record<string, PeriodScore>,
  useOfficialResults = true,
): boolean {
  return (
    completedMatchIds.has(matchId) ||
    (useOfficialResults && hasOfficialFixtureResult(matchId)) ||
    userPredictions[matchId] !== undefined
  );
}

function getNextUncompletedUserMatchday(
  userMatchIds: string[],
  completedMatchIds: Set<string>,
  matchdayOrder: string[],
  userPredictions: Record<string, PeriodScore>,
  useOfficialResults: boolean,
): string | null {
  for (const matchday of matchdayOrder) {
    const hasUncompletedUserMatch = getMatchesForMatchday(matchday).some(
      (fixture) =>
        userMatchIds.includes(fixture.id) &&
        !isUserMatchResolvedForProgress(
          fixture.id,
          completedMatchIds,
          userPredictions,
          useOfficialResults,
        ),
    );

    if (hasUncompletedUserMatch) {
      return matchday;
    }
  }

  return null;
}

export function advanceThroughMatchdays(input: {
  fromMatchday: string;
  completedMatches: Match[];
  userTeamId: string | null;
  userPredictions: Record<string, PeriodScore>;
  userMatchIds: string[];
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
  aiScores?: Record<string, PeriodScore>;
  autoSimulateUserMatches?: boolean;
  useOfficialResults?: boolean;
}): PlayMatchdayOutput & { lastPlayedMatchday: string } {
  const {
    fromMatchday,
    completedMatches,
    userTeamId,
    userPredictions,
    userMatchIds,
    ratings,
    seed = 'matchday-progress',
    aiScores,
    autoSimulateUserMatches = false,
    useOfficialResults = true,
  } = input;

  const matchdayOrder = getMatchdayOrder();
  const startIndex = matchdayOrder.indexOf(fromMatchday);

  if (startIndex === -1) {
    throw new Error(`Unknown matchday: ${fromMatchday}`);
  }

  let state: PlayMatchdayOutput = {
    completedMatches,
    groupStandings: computeAllGroupStandings(completedMatches, { useOfficialResults }),
    playedMatchIds: [],
  };
  let lastPlayedMatchday = fromMatchday;

  for (let index = startIndex; index < matchdayOrder.length; index++) {
    const matchday = matchdayOrder[index]!;
    const completedIds = new Set(state.completedMatches.map((match) => match.id));
    const nextUserMatchday = getNextUncompletedUserMatchday(
      userMatchIds,
      completedIds,
      matchdayOrder,
      userPredictions,
      useOfficialResults,
    );

    if (
      nextUserMatchday &&
      matchday === nextUserMatchday &&
      index > startIndex
    ) {
      break;
    }

    const hasUnplayedFixtures = getMatchesForMatchday(matchday).some(
      (fixture) => !completedIds.has(fixture.id),
    );

    if (hasUnplayedFixtures) {
      const matchdayState = playMatchday({
        matchday,
        completedMatches: state.completedMatches,
        userTeamId,
        userPredictions,
        ratings,
        seed: `${seed}:${matchday}`,
        aiScores,
        autoSimulateUserMatches,
        useOfficialResults,
      });

      state = {
        completedMatches: matchdayState.completedMatches,
        groupStandings: matchdayState.groupStandings,
        playedMatchIds: [...state.playedMatchIds, ...matchdayState.playedMatchIds],
      };
      lastPlayedMatchday = matchday;
    }

    if (isGroupStageComplete(state.completedMatches)) {
      break;
    }

    if (nextUserMatchday) {
      const nextUserMatchdayIndex = matchdayOrder.indexOf(nextUserMatchday);

      if (index + 1 === nextUserMatchdayIndex) {
        break;
      }
    }
  }

  return {
    ...state,
    lastPlayedMatchday,
  };
}
