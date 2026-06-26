import { simulateMatch } from '@/simulation/simulate-match';
import type { SimulateKnockoutMatchInput, SimulateKnockoutMatchOutput } from '@/simulation/types';
import type { PeriodScore } from '@/types/match';
import type { TeamRating } from '@/types/team';
import type { SeededRandom } from '@/utils/seeded-random';
import { pickWeighted } from '@/utils/weighted-random';

const EXTRA_TIME_GOAL_RATE = 0.45;

function simulatePenalties(
  homeTeamId: string,
  awayTeamId: string,
  homeRating: TeamRating,
  awayRating: TeamRating,
  random: SeededRandom,
): { penalties: PeriodScore; winnerTeamId: string } {
  const strengthDifference = homeRating.overall - awayRating.overall;
  const homeWinWeight = Math.max(15, 50 + strengthDifference * 0.25);
  const awayWinWeight = Math.max(15, 50 - strengthDifference * 0.25);
  const homeWinsShootout = pickWeighted(
    [
      { outcome: true, weight: homeWinWeight },
      { outcome: false, weight: awayWinWeight },
    ],
    random,
  );

  const winningScore = random.nextInt(3, 5);
  const losingScore = random.nextInt(0, winningScore - 1);

  if (homeWinsShootout) {
    return {
      penalties: { home: winningScore, away: losingScore },
      winnerTeamId: homeTeamId,
    };
  }

  return {
    penalties: { home: losingScore, away: winningScore },
    winnerTeamId: awayTeamId,
  };
}

export function simulateKnockoutMatch(input: SimulateKnockoutMatchInput): SimulateKnockoutMatchOutput {
  const { homeTeam, awayTeam, homeRating, awayRating, random } = input;

  const regulationResult = simulateMatch({
    homeTeam,
    awayTeam,
    homeRating,
    awayRating,
    random,
  });

  const regulation = {
    home: regulationResult.homeGoals,
    away: regulationResult.awayGoals,
  };

  if (!regulationResult.isDraw && regulationResult.winnerTeamId) {
    return {
      regulation,
      winnerTeamId: regulationResult.winnerTeamId,
    };
  }

  const extraTimeResult = simulateMatch({
    homeTeam,
    awayTeam,
    homeRating,
    awayRating,
    random,
    goalRateMultiplier: EXTRA_TIME_GOAL_RATE,
  });

  const extraTime = {
    home: extraTimeResult.homeGoals,
    away: extraTimeResult.awayGoals,
  };

  const totalHomeGoals = regulation.home + extraTime.home;
  const totalAwayGoals = regulation.away + extraTime.away;

  if (totalHomeGoals !== totalAwayGoals) {
    return {
      regulation,
      extraTime,
      winnerTeamId: totalHomeGoals > totalAwayGoals ? homeTeam.id : awayTeam.id,
    };
  }

  const { penalties, winnerTeamId } = simulatePenalties(
    homeTeam.id,
    awayTeam.id,
    homeRating,
    awayRating,
    random,
  );

  return {
    regulation,
    extraTime,
    penalties,
    winnerTeamId,
  };
}
