import type { TournamentStage } from '@/types/tournament';

export type PeriodScore = {
  home: number;
  away: number;
};

export type UserMatchPrediction = PeriodScore | MatchResult;

export type MatchResult = {
  regulation: PeriodScore;
  extraTime?: PeriodScore;
  penalties?: PeriodScore;
};

export type MatchStatus = 'scheduled' | 'completed';

export type Match = {
  id: string;
  stage: TournamentStage;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  groupId?: string;
  round?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  ground?: string;
  result?: MatchResult;
};
