import { teamRatingsById } from '@/data/team-ratings';
import type { AppLanguage } from '@/types/app-settings';
import type { Match, PeriodScore } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { TeamRating } from '@/types/team';
import { resolveBackendMatchScore } from '@/services/backend-api';
import { createSeededRandom } from '@/utils/seeded-random';
import type { SeededRandom } from '@/utils/seeded-random';
import { pickWeighted, type WeightedOutcome } from '@/utils/weighted-random';

const FALLBACK_BASE_EXPECTED_GOALS = 1.18;
const FALLBACK_MAX_GOALS = 9;

export type ResolveMatchScoreInput = {
  fixture: Match;
  useBackendAi?: boolean;
  backendUserId?: string | null;
  completedMatches?: Match[];
  groupStandings?: Record<string, Standing[]>;
  language?: AppLanguage;
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
};

export type ResolveMatchScoresInput = Omit<ResolveMatchScoreInput, 'fixture'> & {
  fixtures: Match[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOrDefault(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value! : fallback;
}

function ratingProfile(rating: TeamRating) {
  return {
    elo: finiteOrDefault(rating.elo, 1400 + rating.overall * 7),
    attackStrength: finiteOrDefault(rating.attackStrength, rating.attack / 70),
    defensiveStrength: finiteOrDefault(rating.defensiveStrength, 2 - rating.defence / 70),
    overallStrength: rating.overall,
    championshipProbability: finiteOrDefault(
      rating.championshipProbability,
      Math.max(0.0005, (rating.tournamentExperience - 35) / 3000),
    ),
  };
}

function highGoalWeightMultiplier(goals: number): number {
  if (goals <= 4) {
    return 1;
  }

  if (goals === 5) {
    return 0.11;
  }

  if (goals === 6) {
    return 0.035;
  }

  if (goals === 7) {
    return 0.008;
  }

  if (goals === 8) {
    return 0.003;
  }

  return 0.001;
}

function buildGoalWeights(expectedGoals: number): WeightedOutcome<number>[] {
  const target = clamp(expectedGoals, 0.18, 3.2);

  return Array.from({ length: FALLBACK_MAX_GOALS + 1 }, (_, goals) => {
    const distance = Math.abs(goals - target);
    const weight = Math.exp(-(distance * distance) / 2.35) * highGoalWeightMultiplier(goals);

    return { outcome: goals, weight };
  });
}

function pickGoals(expectedGoals: number, random: SeededRandom): number {
  return pickWeighted(buildGoalWeights(expectedGoals), random);
}

function calculateFallbackExpectedGoals(
  teamRating: TeamRating,
  opponentRating: TeamRating,
  isHome: boolean,
): number {
  const team = ratingProfile(teamRating);
  const opponent = ratingProfile(opponentRating);
  const eloScale = clamp(1 + (team.elo - opponent.elo) / 900, 0.62, 1.42);
  const overallScale = clamp(
    1 + (team.overallStrength - opponent.overallStrength) / 260,
    0.72,
    1.28,
  );
  const probabilityScale = clamp(
    1 +
      (Math.log1p(team.championshipProbability * 100) -
        Math.log1p(opponent.championshipProbability * 100)) *
        0.08,
    0.86,
    1.16,
  );
  const homeScale = isHome ? 1.07 : 1;

  return (
    FALLBACK_BASE_EXPECTED_GOALS *
    team.attackStrength *
    opponent.defensiveStrength *
    eloScale *
    overallScale *
    probabilityScale *
    homeScale
  );
}

export function simulateRatingBasedFallbackScore(
  fixture: Match,
  ratings: Record<string, TeamRating>,
  seed: string | number,
): PeriodScore {
  const random = createSeededRandom(`${seed}:${fixture.id}`);
  const homeRating = ratings[fixture.homeTeamId];
  const awayRating = ratings[fixture.awayTeamId];

  if (!homeRating || !awayRating) {
    throw new Error(`Missing team rating for fallback match: ${fixture.id}`);
  }

  const homeExpectedGoals = calculateFallbackExpectedGoals(homeRating, awayRating, true);
  const awayExpectedGoals = calculateFallbackExpectedGoals(awayRating, homeRating, false);

  return {
    home: pickGoals(homeExpectedGoals, random),
    away: pickGoals(awayExpectedGoals, random),
  };
}

export async function resolveMatchScore(input: ResolveMatchScoreInput): Promise<PeriodScore> {
  const {
    fixture,
    useBackendAi = true,
    backendUserId,
    completedMatches = [],
    groupStandings,
    language = 'en',
    ratings = teamRatingsById,
    seed = 'ai-match-score',
  } = input;

  if (useBackendAi) {
    const backendScore = await tryResolveBackendScore({
      fixture,
      backendUserId,
      completedMatches,
      groupStandings,
      language,
    });

    if (backendScore) {
      return backendScore;
    }
  }

  return simulateRatingBasedFallbackScore(fixture, ratings, seed);
}

export async function resolveMatchScores(
  input: ResolveMatchScoresInput,
): Promise<Record<string, PeriodScore>> {
  const {
    fixtures,
    useBackendAi = true,
    backendUserId,
    completedMatches = [],
    groupStandings,
    language = 'en',
    ratings = teamRatingsById,
    seed = 'ai-match-score',
  } = input;

  if (fixtures.length === 0) {
    return {};
  }

  const fallbackScores = () =>
    Object.fromEntries(
      fixtures.map((fixture) => [
        fixture.id,
        simulateRatingBasedFallbackScore(fixture, ratings, `${seed}:${fixture.id}`),
      ]),
    );

  if (useBackendAi) {
    const backendScores = await resolveBackendScores({
      fixtures,
      backendUserId,
      completedMatches,
      groupStandings,
      language,
    });

    if (backendScores) {
      return backendScores;
    }
  }

  return fallbackScores();
}

async function tryResolveBackendScore(input: {
  fixture: Match;
  backendUserId?: string | null;
  completedMatches: Match[];
  groupStandings?: Record<string, Standing[]>;
  language: AppLanguage;
}): Promise<PeriodScore | null> {
  try {
    return await resolveBackendMatchScore({
      fixture: input.fixture,
      userId: input.backendUserId,
      completedMatches: input.completedMatches,
      groupStandings: input.groupStandings,
      language: input.language,
    });
  } catch {
    return null;
  }
}

async function resolveBackendScores(input: {
  fixtures: Match[];
  backendUserId?: string | null;
  completedMatches: Match[];
  groupStandings?: Record<string, Standing[]>;
  language: AppLanguage;
}): Promise<Record<string, PeriodScore> | null> {
  try {
    const scores = await Promise.all(
      input.fixtures.map(async (fixture) => {
        const score = await resolveBackendMatchScore({
          fixture,
          userId: input.backendUserId,
          completedMatches: input.completedMatches,
          groupStandings: input.groupStandings,
          language: input.language,
        });

        return [fixture.id, score] as const;
      }),
    );

    if (scores.some(([, score]) => score === null)) {
      return null;
    }

    return Object.fromEntries(scores) as Record<string, PeriodScore>;
  } catch {
    return null;
  }
}
