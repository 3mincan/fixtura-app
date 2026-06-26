import { teams } from '@/data/teams';
import type { Group } from '@/types/group';
import type { Team } from '@/types/team';

export function getTeamsInGroup(teamList: Team[], groupId: string): Team[] {
  return teamList.filter((team) => team.group === groupId);
}

export function buildGroupsFromTeams(teamList: Team[]): Group[] {
  const teamIdsByGroup = new Map<string, string[]>();

  for (const team of teamList) {
    const groupTeamIds = teamIdsByGroup.get(team.group) ?? [];
    groupTeamIds.push(team.id);
    teamIdsByGroup.set(team.group, groupTeamIds);
  }

  return [...teamIdsByGroup.entries()]
    .sort(([groupA], [groupB]) => groupA.localeCompare(groupB))
    .map(([id, teamIds]) => ({ id, teamIds }));
}

export const groups: Group[] = buildGroupsFromTeams(teams);
