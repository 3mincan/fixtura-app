import type { MatchResult, PeriodScore } from '@/types/match';

export type KnockoutPredictionPhase = 'regulation' | 'extra-time' | 'penalties';

export const MAX_PENALTY_GOALS_PER_SIDE = 5;
export const MAX_PENALTY_MARGIN = 3;

export function isMatchResult(
  prediction: PeriodScore | MatchResult,
): prediction is MatchResult {
  return 'regulation' in prediction;
}

export function getKnockoutWinnerTeamId(
  homeTeamId: string,
  awayTeamId: string,
  result: MatchResult,
): string {
  if (result.penalties) {
    return result.penalties.home > result.penalties.away ? homeTeamId : awayTeamId;
  }

  const homeTotal = result.regulation.home + (result.extraTime?.home ?? 0);
  const awayTotal = result.regulation.away + (result.extraTime?.away ?? 0);

  if (homeTotal === awayTotal) {
    throw new Error('Knockout result must have a winner');
  }

  return homeTotal > awayTotal ? homeTeamId : awayTeamId;
}

export function isValidPenaltyPrediction(homeGoals: number, awayGoals: number): boolean {
  if (homeGoals === awayGoals) {
    return false;
  }

  if (homeGoals < 0 || awayGoals < 0) {
    return false;
  }

  if (homeGoals > MAX_PENALTY_GOALS_PER_SIDE || awayGoals > MAX_PENALTY_GOALS_PER_SIDE) {
    return false;
  }

  return Math.abs(homeGoals - awayGoals) <= MAX_PENALTY_MARGIN;
}
