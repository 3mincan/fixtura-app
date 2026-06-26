import worldCupTeamsJson from '../../worldcup.teams.json';

import {
  loadTeamsFromWorldCupJson,
  type WorldCupTeamSource,
} from '@/data/worldcup-team-source';
import type { Team } from '@/types/team';

export const teams: Team[] = loadTeamsFromWorldCupJson(
  worldCupTeamsJson as WorldCupTeamSource[],
);

export const teamsById: Record<string, Team> = Object.fromEntries(
  teams.map((team) => [team.id, team]),
);

function assertUniqueTeamIds(teamList: Team[]): void {
  const seen = new Set<string>();

  for (const team of teamList) {
    if (seen.has(team.id)) {
      throw new Error(`Duplicate team id: ${team.id}`);
    }
    seen.add(team.id);
  }
}

assertUniqueTeamIds(teams);
