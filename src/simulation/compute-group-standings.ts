import { calculateStandings } from '@/simulation/calculate-standings';
import { groups } from '@/data/groups';
import { mergeOfficialGroupResults } from '@/data/worldcup-fixtures';
import type { Match } from '@/types/match';
import type { Standing } from '@/types/standing';

export function computeAllGroupStandings(
  completedMatches: Match[],
  options: { useOfficialResults?: boolean } = {},
): Record<string, Standing[]> {
  const useOfficialResults = options.useOfficialResults ?? true;
  const matches = useOfficialResults ? mergeOfficialGroupResults(completedMatches) : completedMatches;
  const completedGroupMatches = matches.filter(
    (match) => match.stage === 'group' && match.status === 'completed' && match.result,
  );
  const standings: Record<string, Standing[]> = {};

  for (const group of groups) {
    const groupMatches = completedGroupMatches.filter((match) => match.groupId === group.id);
    standings[group.id] = calculateStandings({ teamIds: group.teamIds, matches: groupMatches });
  }

  return standings;
}
