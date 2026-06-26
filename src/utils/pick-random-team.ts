import { teams } from '@/data/teams';
import type { Team } from '@/types/team';

export function pickRandomTeam(): Team {
  const index = Math.floor(Math.random() * teams.length);

  return teams[index]!;
}
