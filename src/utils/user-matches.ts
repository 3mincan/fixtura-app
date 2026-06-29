import { getWorldCupGroupFixtures, hasOfficialFixtureResult } from '@/data/worldcup-fixtures';
import type { Match } from '@/types/match';
import type { Team } from '@/types/team';

type OfficialResultsOptions = {
  useOfficialResults?: boolean;
};

export function matchInvolvesTeam(match: Match, teamId: string): boolean {
  return match.homeTeamId === teamId || match.awayTeamId === teamId;
}

export function getOpponentTeamId(match: Match, teamId: string): string {
  return match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;
}

export function getUserGroupMatches(selectedTeamId: string, teamList: Team[]): Match[] {
  const selectedTeam = teamList.find((team) => team.id === selectedTeamId);

  if (!selectedTeam) {
    return [];
  }

  const groupFixtures = getWorldCupGroupFixtures(selectedTeam.group);

  return groupFixtures.filter((match) => matchInvolvesTeam(match, selectedTeamId));
}

export function getNextUserMatch(
  selectedTeamId: string | null,
  teamList: Team[],
  completedMatches: Match[] = [],
  options: OfficialResultsOptions = {},
): Match | null {
  if (!selectedTeamId) {
    return null;
  }

  const useOfficialResults = options.useOfficialResults ?? true;
  const completedMatchIds = new Set(completedMatches.map((match) => match.id));
  const userMatches = getUserGroupMatches(selectedTeamId, teamList);

  return (
    userMatches.find(
      (match) =>
        !completedMatchIds.has(match.id) &&
        (!useOfficialResults || !hasOfficialFixtureResult(match.id)),
    ) ?? null
  );
}
