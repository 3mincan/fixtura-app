import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import { buildRoundOf32FromFixtures } from '@/simulation/build-round-of-32-from-fixtures';
import { simulateGroupStage } from '@/simulation/simulate-group-stage';
import { simulateKnockoutStage } from '@/simulation/simulate-knockout-stage';
import { groups } from '@/data/groups';
import {
  fixturesFromRoundResult,
  resolveKnockoutRoundFixtures,
} from '@/utils/knockout-timeline';

describe('knockout timeline fixtures', () => {
  it('resolves third-place and final fixtures from semi-final results', () => {
    const groupStage = simulateGroupStage({
      groups,
      teams,
      ratings: teamRatingsById,
      seed: 'knockout-timeline-third-place',
    });
    const roundOf32 = buildRoundOf32FromFixtures(groupStage.standings);
    const knockoutStage = simulateKnockoutStage({
      roundOf32,
      ratings: teamRatingsById,
      seed: 'knockout-timeline-third-place',
    });

    const thirdPlaceFixtures = resolveKnockoutRoundFixtures({
      round: 'third-place',
      roundOf32Fixtures: roundOf32,
      knockoutRoundResults: knockoutStage.rounds,
    });
    const finalFixtures = resolveKnockoutRoundFixtures({
      round: 'final',
      roundOf32Fixtures: roundOf32,
      knockoutRoundResults: knockoutStage.rounds,
    });
    const thirdPlaceResult = knockoutStage.rounds.find((round) => round.round === 'third-place')!;
    const finalResult = knockoutStage.rounds.find((round) => round.round === 'final')!;

    assert.equal(thirdPlaceFixtures.length, 1);
    assert.equal(finalFixtures.length, 1);
    assert.deepEqual(
      fixturesFromRoundResult(thirdPlaceResult).map((fixture) => fixture.id),
      ['third-place-1'],
    );
    assert.deepEqual(
      fixturesFromRoundResult(finalResult).map((fixture) => fixture.id),
      ['final-1'],
    );
  });
});
