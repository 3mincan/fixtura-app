import { teams } from '@/data/teams';
import { advanceThroughMatchdays } from '@/simulation/play-matchday';
import type { PeriodScore } from '@/types/match';
import { getUserGroupMatches } from '@/utils/user-matches';

export function completeGroupStageForUser(input: {
  userTeamId: string;
  userPredictions: Record<string, PeriodScore>;
  seed?: string | number;
}) {
  const { userTeamId, userPredictions, seed = 'complete-group-stage' } = input;
  const userMatches = getUserGroupMatches(userTeamId, teams);
  const userMatchIds = userMatches.map((match) => match.id);
  let progress = advanceThroughMatchdays({
    fromMatchday: userMatches[0]!.round!,
    completedMatches: [],
    userTeamId,
    userPredictions,
    userMatchIds,
    seed,
  });

  for (const userMatch of userMatches.slice(1)) {
    progress = advanceThroughMatchdays({
      fromMatchday: userMatch.round!,
      completedMatches: progress.completedMatches,
      userTeamId,
      userPredictions,
      userMatchIds,
      seed: `${seed}:${userMatch.id}`,
    });
  }

  return progress;
}
