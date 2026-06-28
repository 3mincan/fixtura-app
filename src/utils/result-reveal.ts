import { teamRatingsById } from '@/data/team-ratings';
import { hasAllUserGroupPredictions } from '@/simulation/tournament-journey';
import { simulateGroup } from '@/simulation/simulate-group';
import type { Match, UserMatchPrediction } from '@/types/match';
import type { Team, TeamRating } from '@/types/team';
import { selectPeriodScorePredictions } from '@/utils/match-predictions';
import { matchInvolvesTeam } from '@/utils/user-matches';

const DEFAULT_RESULT_REVEAL_SEED = 'result-reveal';

export type GetSimulatedRevealMatchesInput = {
  selectedTeamId: string | null;
  teamList: Team[];
  userPredictions?: Record<string, UserMatchPrediction>;
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
};

export function getSimulatedGroupMatchesToReveal(
  input: GetSimulatedRevealMatchesInput,
): Match[] | null {
  const {
    selectedTeamId,
    teamList,
    userPredictions = {},
    ratings = teamRatingsById,
    seed = DEFAULT_RESULT_REVEAL_SEED,
  } = input;

  if (!selectedTeamId) {
    return null;
  }

  const selectedTeam = teamList.find((team) => team.id === selectedTeamId);

  if (!selectedTeam) {
    return null;
  }

  if (!hasAllUserGroupPredictions(selectedTeamId, teamList, userPredictions)) {
    return null;
  }

  const groupUserPredictions = selectPeriodScorePredictions(userPredictions);
  const groupId = selectedTeam.group;
  const teamIds = teamList
    .filter((team) => team.group === groupId)
    .map((team) => team.id);
  const groupOutput = simulateGroup({
    groupId,
    teamIds,
    ratings,
    seed,
    userTeamId: selectedTeamId,
    userPredictions: groupUserPredictions,
  });

  return groupOutput.results.filter((match) => !matchInvolvesTeam(match, selectedTeamId));
}

export function getCurrentRevealMatch(
  matches: Match[],
  revealIndex: number,
): Match | null {
  if (revealIndex < 0 || revealIndex >= matches.length) {
    return null;
  }

  return matches[revealIndex] ?? null;
}

export function canAdvanceReveal(matches: Match[], revealIndex: number): boolean {
  return revealIndex < matches.length - 1;
}

export function formatMatchScore(match: Match): string | null {
  if (!match.result) {
    return null;
  }

  const { home, away } = match.result.regulation;

  return `${home} - ${away}`;
}
