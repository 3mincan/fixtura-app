import { generateKnockoutBracket, type GroupQualifier } from '@/simulation/generate-knockout-bracket';
import { simulateGroupStage, type SimulateGroupStageOutput } from '@/simulation/simulate-group-stage';
import {
  simulateKnockoutStage,
  type SimulateKnockoutStageOutput,
} from '@/simulation/simulate-knockout-stage';
import type { RoundOf32Mapping } from '@/simulation/knockout-bracket-mapping';
import type { Group } from '@/types/group';
import type { PeriodScore } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { Team, TeamRating } from '@/types/team';

const BEST_THIRD_PLACE_COUNT = 8;

export type SimulateTournamentInput = {
  teams: Team[];
  groups: Group[];
  ratings: Record<string, TeamRating>;
  seed: string | number;
  knockoutMapping?: RoundOf32Mapping;
  userTeamId?: string | null;
  userPredictions?: Record<string, PeriodScore>;
};

export type SimulateTournamentOutput = {
  groupStage: SimulateGroupStageOutput;
  knockoutStage: SimulateKnockoutStageOutput;
  championId: string;
};

function compareStandingEntries(teamA: Standing, teamB: Standing): number {
  if (teamA.points !== teamB.points) {
    return teamB.points - teamA.points;
  }

  if (teamA.goalDifference !== teamB.goalDifference) {
    return teamB.goalDifference - teamA.goalDifference;
  }

  if (teamA.goalsFor !== teamB.goalsFor) {
    return teamB.goalsFor - teamA.goalsFor;
  }

  return teamA.teamId.localeCompare(teamB.teamId);
}

function buildGroupQualifiers(
  groups: Group[],
  standings: Record<string, Standing[]>,
): GroupQualifier[] {
  const sortedGroups = [...groups].sort((groupA, groupB) => groupA.id.localeCompare(groupB.id));

  return sortedGroups.map((group) => ({
    groupId: group.id,
    firstPlaceTeamId: standings[group.id][0].teamId,
    secondPlaceTeamId: standings[group.id][1].teamId,
  }));
}

function selectBestThirdPlaceTeams(
  groups: Group[],
  standings: Record<string, Standing[]>,
): string[] {
  const thirdPlaceTeams = groups.map((group) => standings[group.id][2]);

  return [...thirdPlaceTeams]
    .sort(compareStandingEntries)
    .slice(0, BEST_THIRD_PLACE_COUNT)
    .map((standing) => standing.teamId);
}

export function simulateTournament(input: SimulateTournamentInput): SimulateTournamentOutput {
  const { teams, groups, ratings, seed, knockoutMapping, userTeamId, userPredictions } = input;

  const groupStage = simulateGroupStage({
    teams,
    groups,
    ratings,
    seed: `${seed}:group`,
    userTeamId,
    userPredictions,
  });

  const groupQualifiers = buildGroupQualifiers(groups, groupStage.standings);
  const additionalTeamIds = selectBestThirdPlaceTeams(groups, groupStage.standings);
  const { roundOf32 } = generateKnockoutBracket({
    groupQualifiers,
    additionalTeamIds,
    mapping: knockoutMapping,
  });

  const knockoutStage = simulateKnockoutStage({
    roundOf32,
    ratings,
    seed: `${seed}:knockout`,
  });

  return {
    groupStage,
    knockoutStage,
    championId: knockoutStage.championId,
  };
}
