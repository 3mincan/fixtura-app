import type { Group } from '@/types/group';
import type { Match } from '@/types/match';
import type { Standing } from '@/types/standing';

export type TournamentStage =
  | 'group'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-final'
  | 'semi-final'
  | 'third-place'
  | 'final';

export type TournamentState = {
  currentStage: TournamentStage;
  groups: Group[];
  matches: Match[];
  standings: Record<string, Standing[]>;
  userTeamId: string | null;
  championId?: string;
};
