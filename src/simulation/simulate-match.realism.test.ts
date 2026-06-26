import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { simulateMatch } from '@/simulation/simulate-match';
import type { TeamRating } from '@/types/team';
import { createSeededRandom } from '@/utils/seeded-random';

const BALANCED_STATS = {
  overall: 65,
  attack: 65,
  defence: 65,
  form: 65,
  tournamentExperience: 65,
};

const MATCH_COUNT = 1000;

function makeBalancedRating(teamId: string): TeamRating {
  return {
    teamId,
    ...BALANCED_STATS,
  };
}

function simulateBalancedMatches(count: number) {
  const homeRating = makeBalancedRating('balanced-home');
  const awayRating = makeBalancedRating('balanced-away');

  return Array.from({ length: count }, (_, index) =>
    simulateMatch({
      homeTeam: { id: homeRating.teamId },
      awayTeam: { id: awayRating.teamId },
      homeRating,
      awayRating,
      random: createSeededRandom(`realism-${index}`),
    }),
  );
}

describe('simulateMatch score realism', () => {
  it('keeps most team scores between 0 and 3 goals across 1000 balanced matches', () => {
    const results = simulateBalancedMatches(MATCH_COUNT);
    const teamGoals = results.flatMap((result) => [result.homeGoals, result.awayGoals]);
    const commonGoalShare = teamGoals.filter((goals) => goals <= 3).length / teamGoals.length;

    assert.ok(
      commonGoalShare >= 0.85,
      `Expected at least 85% of team goals to be 0-3, got ${(commonGoalShare * 100).toFixed(1)}%`,
    );
  });

  it('makes 7+ goal team totals extremely rare across 1000 balanced matches', () => {
    const results = simulateBalancedMatches(MATCH_COUNT);
    const teamGoals = results.flatMap((result) => [result.homeGoals, result.awayGoals]);
    const extremeGoalShare = teamGoals.filter((goals) => goals >= 7).length / teamGoals.length;

    assert.ok(
      extremeGoalShare <= 0.005,
      `Expected 7+ team goals in at most 0.5% of outcomes, got ${(extremeGoalShare * 100).toFixed(2)}%`,
    );
  });

  it('produces mixed outcomes between balanced teams across 1000 matches', () => {
    const results = simulateBalancedMatches(MATCH_COUNT);

    const homeWins = results.filter((result) => result.winnerTeamId === 'balanced-home').length;
    const awayWins = results.filter((result) => result.winnerTeamId === 'balanced-away').length;
    const draws = results.filter((result) => result.isDraw).length;

    assert.ok(homeWins > 0, 'Expected at least one home win');
    assert.ok(awayWins > 0, 'Expected at least one away win');
    assert.ok(draws > 0, 'Expected at least one draw');

    assert.ok(homeWins > awayWins * 0.5, 'Expected home wins to stay competitive with away wins');
    assert.ok(awayWins > homeWins * 0.5, 'Expected away wins to stay competitive with home wins');
    assert.ok(draws > results.length * 0.1, 'Expected draws to remain a meaningful share of results');
  });
});
