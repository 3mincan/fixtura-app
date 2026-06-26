import type { TournamentStage } from '@/types/tournament';

export type KnockoutRound = Exclude<TournamentStage, 'group'>;

export type KnockoutRoundDefinition = {
  round: KnockoutRound;
  name: string;
  matchCount: number;
};

export type KnockoutBracketMatch = {
  id: string;
  round: KnockoutRound;
  slot: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  fixtureNum?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  ground?: string;
};

export type KnockoutBracket = {
  rounds: KnockoutRoundDefinition[];
  matches: KnockoutBracketMatch[];
};

export const KNOCKOUT_ROUNDS: KnockoutRoundDefinition[] = [
  { round: 'round-of-32', name: 'Round of 32', matchCount: 16 },
  { round: 'round-of-16', name: 'Round of 16', matchCount: 8 },
  { round: 'quarter-final', name: 'Quarter Final', matchCount: 4 },
  { round: 'semi-final', name: 'Semi Final', matchCount: 2 },
  { round: 'third-place', name: 'Third Place Match', matchCount: 1 },
  { round: 'final', name: 'Final', matchCount: 1 },
];
