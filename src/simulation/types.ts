import type { PeriodScore } from '@/types/match';
import type { Team, TeamRating } from '@/types/team';
import type { SeededRandom } from '@/utils/seeded-random';

export type SimulateMatchInput = {
  homeTeam: Pick<Team, 'id'>;
  awayTeam: Pick<Team, 'id'>;
  homeRating: TeamRating;
  awayRating: TeamRating;
  random: SeededRandom;
  goalRateMultiplier?: number;
};

export type SimulateKnockoutMatchInput = {
  homeTeam: Pick<Team, 'id'>;
  awayTeam: Pick<Team, 'id'>;
  homeRating: TeamRating;
  awayRating: TeamRating;
  random: SeededRandom;
};

export type SimulateMatchOutput = {
  homeGoals: number;
  awayGoals: number;
  winnerTeamId: string | null;
  isDraw: boolean;
};

export type SimulateKnockoutMatchOutput = {
  regulation: PeriodScore;
  extraTime?: PeriodScore;
  penalties?: PeriodScore;
  winnerTeamId: string;
};
