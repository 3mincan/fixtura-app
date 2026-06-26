import { teamRatingsById } from '@/data/team-ratings';
import { simulateKnockoutMatch } from '@/simulation/simulate-knockout-match';
import type { Match, MatchResult } from '@/types/match';
import { createSeededRandom } from '@/utils/seeded-random';

export function simulateRandomKnockoutResult(
  match: Match,
  seed: string | number = 'random-knockout',
): MatchResult {
  const outcome = simulateKnockoutMatch({
    homeTeam: { id: match.homeTeamId },
    awayTeam: { id: match.awayTeamId },
    homeRating: teamRatingsById[match.homeTeamId],
    awayRating: teamRatingsById[match.awayTeamId],
    random: createSeededRandom(`${seed}:${match.id}`),
  });

  const result: MatchResult = {
    regulation: outcome.regulation,
  };

  if (outcome.extraTime) {
    result.extraTime = outcome.extraTime;
  }

  if (outcome.penalties) {
    result.penalties = outcome.penalties;
  }

  return result;
}
