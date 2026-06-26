import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { simulateKnockoutMatch } from '@/simulation/simulate-knockout-match';
import type { TeamRating } from '@/types/team';
import { createSeededRandom } from '@/utils/seeded-random';

function makeRating(
  teamId: string,
  overrides: Partial<Omit<TeamRating, 'teamId'>> = {},
): TeamRating {
  return {
    teamId,
    overall: 65,
    attack: 65,
    defence: 65,
    form: 65,
    tournamentExperience: 65,
    ...overrides,
  };
}

function simulateKnockoutWithSeed(
  seed: string,
  homeRating: TeamRating,
  awayRating: TeamRating,
) {
  return simulateKnockoutMatch({
    homeTeam: { id: homeRating.teamId },
    awayTeam: { id: awayRating.teamId },
    homeRating,
    awayRating,
    random: createSeededRandom(seed),
  });
}

function simulateManyKnockout(
  count: number,
  homeRating: TeamRating,
  awayRating: TeamRating,
  seedPrefix: string,
) {
  return Array.from({ length: count }, (_, index) =>
    simulateKnockoutWithSeed(`${seedPrefix}-${index}`, homeRating, awayRating),
  );
}

describe('simulateKnockoutMatch', () => {
  it('always produces a winner', () => {
    const homeRating = makeRating('home', { attack: 70, defence: 68, overall: 69 });
    const awayRating = makeRating('away', { attack: 68, defence: 67, overall: 68 });
    const results = simulateManyKnockout(100, homeRating, awayRating, 'knockout-winner');

    for (const result of results) {
      assert.ok(result.winnerTeamId);
      assert.ok(['home', 'away'].includes(result.winnerTeamId));
    }
  });

  it('can end after regulation time without extra time or penalties', () => {
    const homeRating = makeRating('home', { attack: 88, defence: 84, overall: 86 });
    const awayRating = makeRating('away', { attack: 42, defence: 44, overall: 43 });
    const result = simulateKnockoutWithSeed('regulation-winner', homeRating, awayRating);

    assert.equal(result.extraTime, undefined);
    assert.equal(result.penalties, undefined);
    assert.equal(result.winnerTeamId, 'home');
    assert.ok(result.regulation.home !== result.regulation.away);
  });

  it('adds extra time when regulation ends level', () => {
    const lowScoring = { attack: 28, defence: 88, form: 50, overall: 55, tournamentExperience: 50 };
    const homeRating = makeRating('home', lowScoring);
    const awayRating = makeRating('away', lowScoring);
    const results = simulateManyKnockout(200, homeRating, awayRating, 'extra-time-path');
    const extraTimeResult = results.find(
      (result) =>
        result.regulation.home === result.regulation.away &&
        result.extraTime &&
        !result.penalties,
    );

    assert.ok(extraTimeResult, 'Expected at least one extra-time finish');

    const totalHome = extraTimeResult.regulation.home + extraTimeResult.extraTime!.home;
    const totalAway = extraTimeResult.regulation.away + extraTimeResult.extraTime!.away;

    assert.notEqual(totalHome, totalAway);
    assert.equal(
      extraTimeResult.winnerTeamId,
      totalHome > totalAway ? 'home' : 'away',
    );
  });

  it('uses penalties when the match is still level after extra time', () => {
    const lowScoring = { attack: 28, defence: 88, form: 50, overall: 55, tournamentExperience: 50 };
    const homeRating = makeRating('home', lowScoring);
    const awayRating = makeRating('away', lowScoring);
    const results = simulateManyKnockout(200, homeRating, awayRating, 'penalty-path');
    const penaltyResult = results.find((result) => result.penalties);

    assert.ok(penaltyResult, 'Expected at least one penalty shootout');
    assert.ok(penaltyResult.extraTime);
    assert.notEqual(penaltyResult.penalties!.home, penaltyResult.penalties!.away);

    if (penaltyResult.penalties!.home > penaltyResult.penalties!.away) {
      assert.equal(penaltyResult.winnerTeamId, 'home');
    } else {
      assert.equal(penaltyResult.winnerTeamId, 'away');
    }
  });

  it('produces deterministic output for the same seed', () => {
    const homeRating = makeRating('home');
    const awayRating = makeRating('away');
    const first = simulateKnockoutWithSeed('deterministic-knockout', homeRating, awayRating);
    const second = simulateKnockoutWithSeed('deterministic-knockout', homeRating, awayRating);

    assert.deepEqual(second, first);
  });

  it('gives stronger teams a slight advantage in penalty shootouts', () => {
    const strong = makeRating('strong', {
      overall: 88,
      attack: 90,
      defence: 86,
      form: 88,
      tournamentExperience: 90,
    });
    const weak = makeRating('weak', {
      overall: 42,
      attack: 40,
      defence: 44,
      form: 42,
      tournamentExperience: 40,
    });

    const results = simulateManyKnockout(200, strong, weak, 'penalty-advantage');
    const penaltyResults = results.filter((result) => result.penalties);
    const strongWins = penaltyResults.filter((result) => result.winnerTeamId === 'strong').length;
    const weakWins = penaltyResults.filter((result) => result.winnerTeamId === 'weak').length;

    assert.ok(penaltyResults.length > 0);
    assert.ok(strongWins > weakWins);
  });
});
