import { groups } from '@/data/groups';
import { teamRatingsById } from '@/data/team-ratings';
import { teamsById } from '@/data/teams';
import { computeAllGroupStandings } from '@/simulation/compute-group-standings';
import { selectBestThirdPlaceTeams } from '@/simulation/resolve-knockout-placeholders';
import { hasAllUserGroupPredictions } from '@/simulation/tournament-journey';
import { calculateStandings } from '@/simulation/calculate-standings';
import { simulateGroup } from '@/simulation/simulate-group';
import type { Match, UserMatchPrediction } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { Team, TeamRating } from '@/types/team';
import { selectPeriodScorePredictions } from '@/utils/match-predictions';
import { mergeMatchdayResults } from '@/utils/matchday-board';

const DEFAULT_GROUP_TABLE_SEED = 'group-table';

export type GroupTableRow = {
  position: number;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type ThirdPlaceRankingRow = GroupTableRow & {
  groupId: string;
  qualifies: boolean;
};

export function computeFinalGroupStandings(
  completedMatches: Match[],
  previewMatches: Match[] = [],
  options: { useOfficialResults?: boolean } = {},
): Record<string, Standing[]> {
  return computeAllGroupStandings(
    mergeMatchdayResults(completedMatches, previewMatches),
    options,
  );
}

export function getQualifiedThirdPlaceTeamIds(
  groupStandings: Record<string, Standing[]>,
): Set<string> {
  return new Set(selectBestThirdPlaceTeams(groupStandings).map((entry) => entry.teamId));
}

export function isTeamQualifiedFromGroupStage(
  teamId: string,
  groupStandings: Record<string, Standing[]>,
): boolean {
  const groupId = teamsById[teamId]?.group;

  if (!groupId) {
    return false;
  }

  const standings = groupStandings[groupId];

  if (!standings) {
    return false;
  }

  const position = standings.findIndex((standing) => standing.teamId === teamId) + 1;

  if (position === 1 || position === 2) {
    return true;
  }

  if (position === 3) {
    return getQualifiedThirdPlaceTeamIds(groupStandings).has(teamId);
  }

  return false;
}

export function isGroupTableRowQualified(
  row: GroupTableRow,
  qualifiedThirdPlaceTeamIds: Set<string>,
): boolean {
  if (row.position <= 2) {
    return true;
  }

  if (row.position === 3) {
    return qualifiedThirdPlaceTeamIds.has(row.teamId);
  }

  return false;
}

export function buildThirdPlaceRankingRows(
  groupStandings: Record<string, Standing[]>,
): ThirdPlaceRankingRow[] {
  const qualifiedThirdPlaceTeamIds = getQualifiedThirdPlaceTeamIds(groupStandings);

  return groups
    .map((group) => {
      const standing = groupStandings[group.id]?.[2];

      if (!standing) {
        return null;
      }

      return {
        groupId: group.id,
        standing,
      };
    })
    .filter((entry): entry is { groupId: string; standing: Standing } => entry !== null)
    .sort((entryA, entryB) => {
      if (entryA.standing.points !== entryB.standing.points) {
        return entryB.standing.points - entryA.standing.points;
      }

      if (entryA.standing.goalDifference !== entryB.standing.goalDifference) {
        return entryB.standing.goalDifference - entryA.standing.goalDifference;
      }

      if (entryA.standing.goalsFor !== entryB.standing.goalsFor) {
        return entryB.standing.goalsFor - entryA.standing.goalsFor;
      }

      return entryA.standing.teamId.localeCompare(entryB.standing.teamId);
    })
    .map((entry, index) => ({
      ...buildGroupTableRows([entry.standing])[0]!,
      position: index + 1,
      groupId: entry.groupId,
      qualifies: qualifiedThirdPlaceTeamIds.has(entry.standing.teamId),
    }));
}

export type GroupTable = {
  groupId: string;
  rows: GroupTableRow[];
};

export type GetGroupTableInput = {
  selectedTeamId: string | null;
  teamList: Team[];
  userPredictions?: Record<string, UserMatchPrediction>;
  completedMatches?: Match[];
  groupStandings?: Record<string, Standing[]>;
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
  useOfficialResults?: boolean;
};

export function buildGroupTableRows(standings: Standing[]): GroupTableRow[] {
  return standings.map((standing, index) => ({
    position: index + 1,
    teamId: standing.teamId,
    played: standing.played,
    won: standing.won,
    drawn: standing.drawn,
    lost: standing.lost,
    goalsFor: standing.goalsFor,
    goalsAgainst: standing.goalsAgainst,
    goalDifference: standing.goalDifference,
    points: standing.points,
  }));
}

function getCompletedGroupMatches(groupId: string, completedMatches: Match[]): Match[] {
  return completedMatches.filter(
    (match) => match.groupId === groupId && match.status === 'completed' && match.result,
  );
}

export function getGroupTable(input: GetGroupTableInput): GroupTable | null {
  const {
    selectedTeamId,
    teamList,
    userPredictions = {},
    completedMatches = [],
    groupStandings = {},
    ratings = teamRatingsById,
    seed = DEFAULT_GROUP_TABLE_SEED,
    useOfficialResults = true,
  } = input;

  if (!selectedTeamId) {
    return null;
  }

  const selectedTeam = teamList.find((team) => team.id === selectedTeamId);

  if (!selectedTeam) {
    return null;
  }

  const groupId = selectedTeam.group;
  const teamIds = teamList
    .filter((team) => team.group === groupId)
    .map((team) => team.id);

  if (groupStandings[groupId]) {
    return {
      groupId,
      rows: buildGroupTableRows(groupStandings[groupId]),
    };
  }

  let matchResults: Match[];
  const groupUserPredictions = selectPeriodScorePredictions(userPredictions);

  if (
    hasAllUserGroupPredictions(selectedTeamId, teamList, userPredictions, {
      useOfficialResults,
    })
  ) {
    const groupOutput = simulateGroup({
      groupId,
      teamIds,
      ratings,
      seed,
      userTeamId: selectedTeamId,
      userPredictions: groupUserPredictions,
    });

    matchResults = groupOutput.results;
  } else {
    matchResults = getCompletedGroupMatches(groupId, completedMatches);
  }

  const standings = calculateStandings({ teamIds, matches: matchResults });

  return {
    groupId,
    rows: buildGroupTableRows(standings),
  };
}
