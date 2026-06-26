import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { simulateMatch } from '@/simulation/simulate-match';
import type { TeamRating } from '@/types/team';
import { createSeededRandom } from '@/utils/seeded-random';

const MATCH_COUNT = 500;

const STRONG_RATING: TeamRating = {
  teamId: 'strong',
  overall: 88,
  attack: 90,
  defence: 86,
  form: 88,
  tournamentExperience: 90,
};

const WEAK_RATING: TeamRating = {
  teamId: 'weak',
  overall: 42,
  attack: 40,
  defence: 44,
  form: 42,
  tournamentExperience: 40,
};

function simulateStrengthMismatch(count: number) {
  return Array.from({ length: count }, (_, index) =>
    simulateMatch({
      homeTeam: { id: STRONG_RATING.teamId },
      awayTeam: { id: WEAK_RATING.teamId },
      homeRating: STRONG_RATING,
      awayRating: WEAK_RATING,
      random: createSeededRandom(`strength-${index}`),
    }),
  );
}

describe('simulateMatch team strength influence', () => {
  it('favours the strong team over many simulations', () => {
    const results = simulateStrengthMismatch(MATCH_COUNT);

    const strongWins = results.filter((result) => result.winnerTeamId === 'strong').length;
    const weakWins = results.filter((result) => result.winnerTeamId === 'weak').length;

    assert.ok(
      strongWins > weakWins,
      `Expected strong team to win more often, got strong=${strongWins} weak=${weakWins}`,
    );
  });

  it('still allows the weak team to win occasionally', () => {
    const results = simulateStrengthMismatch(MATCH_COUNT);
    const weakWins = results.filter((result) => result.winnerTeamId === 'weak').length;

    assert.ok(weakWins > 0, 'Expected the weak team to win at least once');
  });

  it('still produces draws between mismatched teams', () => {
    const results = simulateStrengthMismatch(MATCH_COUNT);
    const draws = results.filter((result) => result.isDraw).length;

    assert.ok(draws > 0, 'Expected at least one draw between strong and weak teams');
  });
});
