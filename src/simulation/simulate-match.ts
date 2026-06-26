import type { TeamRating } from '@/types/team';
import type { SeededRandom } from '@/utils/seeded-random';
import { pickWeighted, type WeightedOutcome } from '@/utils/weighted-random';

import type { SimulateMatchInput, SimulateMatchOutput } from '@/simulation/types';

const HOME_ADVANTAGE = 1.08;
const BASE_EXPECTED_GOALS = 1.15;
const MAX_GOALS = 9;

function assertRatingMatchesTeam(
  rating: TeamRating,
  teamId: string,
  side: 'home' | 'away',
): void {
  if (rating.teamId !== teamId) {
    throw new Error(`${side}Rating teamId must match ${side}Team.id`);
  }
}

function calculateExpectedGoals(
  attack: number,
  opponentDefence: number,
  form: number,
  overall: number,
  isHome: boolean,
): number {
  const attackStrength = attack / 100;
  const defenceStrength = Math.max(0.35, opponentDefence / 100);
  const formBoost = 0.85 + (form / 100) * 0.3;
  const overallBoost = 0.9 + (overall / 100) * 0.2;
  const homeBoost = isHome ? HOME_ADVANTAGE : 1;

  return BASE_EXPECTED_GOALS * (attackStrength / defenceStrength) * formBoost * overallBoost * homeBoost;
}

function highGoalWeightMultiplier(goals: number): number {
  if (goals <= 4) {
    return 1;
  }

  if (goals === 5) {
    return 0.12;
  }

  if (goals === 6) {
    return 0.04;
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
  const target = Math.max(0.25, Math.min(3, expectedGoals));

  return Array.from({ length: MAX_GOALS + 1 }, (_, goals) => {
    const distance = Math.abs(goals - target);
    const weight = Math.exp(-(distance * distance) / 2.5) * highGoalWeightMultiplier(goals);

    return { outcome: goals, weight };
  });
}

function pickGoals(expectedGoals: number, random: SeededRandom): number {
  return pickWeighted(buildGoalWeights(expectedGoals), random);
}

export function simulateMatch(input: SimulateMatchInput): SimulateMatchOutput {
  const { homeTeam, awayTeam, homeRating, awayRating, random, goalRateMultiplier = 1 } = input;

  assertRatingMatchesTeam(homeRating, homeTeam.id, 'home');
  assertRatingMatchesTeam(awayRating, awayTeam.id, 'away');

  const homeExpectedGoals =
    calculateExpectedGoals(
      homeRating.attack,
      awayRating.defence,
      homeRating.form,
      homeRating.overall,
      true,
    ) * goalRateMultiplier;

  const awayExpectedGoals =
    calculateExpectedGoals(
      awayRating.attack,
      homeRating.defence,
      awayRating.form,
      awayRating.overall,
      false,
    ) * goalRateMultiplier;

  const homeGoals = pickGoals(homeExpectedGoals, random);
  const awayGoals = pickGoals(awayExpectedGoals, random);
  const isDraw = homeGoals === awayGoals;
  const winnerTeamId = isDraw
    ? null
    : homeGoals > awayGoals
      ? homeTeam.id
      : awayTeam.id;

  return {
    homeGoals,
    awayGoals,
    winnerTeamId,
    isDraw,
  };
}
