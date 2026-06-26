import { simulateGroup } from '@/simulation/simulate-group';
import type { Group } from '@/types/group';
import type { Match, PeriodScore } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { Team, TeamRating } from '@/types/team';

const QUALIFIERS_PER_GROUP = 2;

export type SimulateGroupStageInput = {
  groups: Group[];
  teams: Team[];
  ratings: Record<string, TeamRating>;
  seed: string | number;
  userTeamId?: string | null;
  userPredictions?: Record<string, PeriodScore>;
};

export type SimulateGroupStageOutput = {
  results: Match[];
  standings: Record<string, Standing[]>;
  qualifiedTeamIds: string[];
};

function validateTeamsAndGroups(groups: Group[], teams: Team[]): void {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const assignedTeamIds = new Set<string>();

  for (const group of groups) {
    for (const teamId of group.teamIds) {
      const team = teamById.get(teamId);

      if (!team) {
        throw new Error(`Unknown team in group ${group.id}: ${teamId}`);
      }

      if (team.group !== group.id) {
        throw new Error(`Team ${teamId} is assigned to group ${group.id} but has group ${team.group}`);
      }

      if (assignedTeamIds.has(teamId)) {
        throw new Error(`Team ${teamId} is assigned to multiple groups`);
      }

      assignedTeamIds.add(teamId);
    }
  }

  for (const team of teams) {
    if (!assignedTeamIds.has(team.id)) {
      throw new Error(`Team ${team.id} is not assigned to any group`);
    }
  }
}

export function simulateGroupStage(input: SimulateGroupStageInput): SimulateGroupStageOutput {
  const { groups, teams, ratings, seed, userTeamId, userPredictions } = input;

  validateTeamsAndGroups(groups, teams);

  const results: Match[] = [];
  const standings: Record<string, Standing[]> = {};
  const qualifiedTeamIds: string[] = [];

  const sortedGroups = [...groups].sort((groupA, groupB) => groupA.id.localeCompare(groupB.id));

  for (const group of sortedGroups) {
    const groupOutput = simulateGroup({
      groupId: group.id,
      teamIds: group.teamIds,
      ratings,
      seed: `${seed}:${group.id}`,
      userTeamId,
      userPredictions,
    });

    results.push(...groupOutput.results);
    standings[group.id] = groupOutput.standings;
    qualifiedTeamIds.push(...groupOutput.qualifiedTeamIds);
  }

  if (qualifiedTeamIds.length !== groups.length * QUALIFIERS_PER_GROUP) {
    throw new Error('Group stage did not produce the expected number of qualifiers');
  }

  return {
    results,
    standings,
    qualifiedTeamIds,
  };
}
