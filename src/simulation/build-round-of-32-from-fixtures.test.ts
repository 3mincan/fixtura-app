import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { completeGroupStageForUser } from '@/simulation/complete-group-stage';
import { buildRoundOf32FromFixtures } from '@/simulation/build-round-of-32-from-fixtures';
import { getUserGroupMatches } from '@/utils/user-matches';
import { teams } from '@/data/teams';

function completeGroupStageForMexico() {
  const userMatches = getUserGroupMatches('mex', teams);
  const predictions = Object.fromEntries(
    userMatches.map((match) => [match.id, { home: 3, away: 0 }]),
  );

  return completeGroupStageForUser({
    userTeamId: 'mex',
    userPredictions: predictions,
    seed: 'r32-full-group',
  });
}

describe('buildRoundOf32FromFixtures', () => {
  it('resolves fixture 77 placeholders from final group standings', () => {
    const { groupStandings } = completeGroupStageForMexico();
    const roundOf32 = buildRoundOf32FromFixtures(groupStandings);
    const fixture77 = roundOf32.find((fixture) => fixture.fixtureNum === 77);

    assert.ok(fixture77);
    assert.equal(fixture77.homeTeamId, groupStandings.I[0]?.teamId);
    assert.ok(fixture77.awayTeamId);
    assert.notEqual(fixture77.homeTeamId, fixture77.awayTeamId);
    assert.equal(roundOf32.length, 16);
  });
});
