import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { simulateMatch } from '@/simulation/simulate-match';
import type { TeamRating } from '@/types/team';
import { createSeededRandom } from '@/utils/seeded-random';

function makeRating(
  teamId: string,
  overrides: Partial<Omit<TeamRating, 'teamId'>> = {},
): TeamRating {
  return {
    teamId,
    overall: 50,
    attack: 50,
    defence: 50,
    form: 50,
    tournamentExperience: 50,
    ...overrides,
  };
}

function simulateWithSeed(
  seed: string,
  homeRating: TeamRating,
  awayRating: TeamRating,
  homeTeamId = homeRating.teamId,
  awayTeamId = awayRating.teamId,
) {
  return simulateMatch({
    homeTeam: { id: homeTeamId },
    awayTeam: { id: awayTeamId },
    homeRating,
    awayRating,
    random: createSeededRandom(seed),
  });
}

function simulateMany(
  count: number,
  homeRating: TeamRating,
  awayRating: TeamRating,
) {
  return Array.from({ length: count }, (_, index) =>
    simulateWithSeed(`match-${index}`, homeRating, awayRating),
  );
}

describe('simulateMatch', () => {
  it('returns the same result for the same seed and teams', () => {
    const homeRating = makeRating('home', { attack: 72, defence: 70, overall: 71 });
    const awayRating = makeRating('away', { attack: 68, defence: 69, overall: 68 });

    const first = simulateWithSeed('deterministic-match', homeRating, awayRating);
    const second = simulateWithSeed('deterministic-match', homeRating, awayRating);

    assert.deepEqual(second, first);
  });

  it('sets winnerTeamId and isDraw correctly', () => {
    const homeRating = makeRating('home');
    const awayRating = makeRating('away');

    const results = simulateMany(200, homeRating, awayRating);

    for (const result of results) {
      assert.ok(Number.isInteger(result.homeGoals));
      assert.ok(Number.isInteger(result.awayGoals));
      assert.ok(result.homeGoals >= 0);
      assert.ok(result.awayGoals >= 0);

      if (result.isDraw) {
        assert.equal(result.homeGoals, result.awayGoals);
        assert.equal(result.winnerTeamId, null);
      } else {
        assert.notEqual(result.homeGoals, result.awayGoals);

        if (result.homeGoals > result.awayGoals) {
          assert.equal(result.winnerTeamId, 'home');
        } else {
          assert.equal(result.winnerTeamId, 'away');
        }
      }
    }
  });

  it('rejects ratings that do not match team ids', () => {
    const homeRating = makeRating('home');
    const awayRating = makeRating('away');

    assert.throws(
      () =>
        simulateMatch({
          homeTeam: { id: 'home' },
          awayTeam: { id: 'away' },
          homeRating,
          awayRating: makeRating('different-away'),
          random: createSeededRandom('invalid-rating'),
        }),
      /awayRating teamId must match awayTeam.id/,
    );
  });

  it('allows draws between evenly matched teams', () => {
    const balancedStats = { attack: 60, defence: 60, form: 60, overall: 60 };
    const homeRating = makeRating('equal-home', balancedStats);
    const awayRating = makeRating('equal-away', balancedStats);
    const results = simulateMany(120, homeRating, awayRating);

    const drawCount = results.filter((result) => result.isDraw).length;

    assert.ok(drawCount > 0);
  });

  it('favours stronger teams over many simulations', () => {
    const strong = makeRating('strong', {
      attack: 88,
      defence: 86,
      form: 85,
      overall: 87,
    });

    const weak = makeRating('weak', {
      attack: 42,
      defence: 44,
      form: 43,
      overall: 43,
    });

    const results = simulateMany(150, strong, weak);
    const strongWins = results.filter((result) => result.winnerTeamId === 'strong').length;
    const weakWins = results.filter((result) => result.winnerTeamId === 'weak').length;

    assert.ok(strongWins > weakWins);
    assert.ok(strongWins > results.length * 0.45);
  });

  it('produces mostly common low scorelines', () => {
    const homeRating = makeRating('home', { attack: 65, defence: 64, overall: 64 });
    const awayRating = makeRating('away', { attack: 63, defence: 62, overall: 62 });
    const results = simulateMany(250, homeRating, awayRating);

    const teamGoals = results.flatMap((result) => [result.homeGoals, result.awayGoals]);
    const commonGoals = teamGoals.filter((goals) => goals <= 2).length;

    assert.ok(commonGoals / teamGoals.length > 0.7);
  });

  it('rarely produces very high team goal counts', () => {
    const homeRating = makeRating('home', { attack: 70, defence: 68, overall: 69 });
    const awayRating = makeRating('away', { attack: 69, defence: 67, overall: 68 });
    const results = simulateMany(300, homeRating, awayRating);

    const teamGoals = results.flatMap((result) => [result.homeGoals, result.awayGoals]);
    const highGoals = teamGoals.filter((goals) => goals >= 5).length;

    assert.ok(highGoals / teamGoals.length < 0.03);
  });
});
