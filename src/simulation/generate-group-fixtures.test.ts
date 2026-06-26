import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateGroupFixtures } from '@/simulation/generate-group-fixtures';

function pairingKey(homeTeamId: string, awayTeamId: string): string {
  return [homeTeamId, awayTeamId].sort().join('-');
}

describe('generateGroupFixtures', () => {
  it('creates 6 matches for a 4-team group', () => {
    const fixtures = generateGroupFixtures({
      groupId: 'A',
      teamIds: ['mex', 'rsa', 'kor', 'cze'],
    });

    assert.equal(fixtures.length, 6);
  });

  it('creates round-robin fixtures where every team plays every other team once', () => {
    const teamIds = ['mex', 'rsa', 'kor', 'cze'];
    const fixtures = generateGroupFixtures({
      groupId: 'A',
      teamIds,
    });

    const pairings = new Set(
      fixtures.map((fixture) => pairingKey(fixture.homeTeamId, fixture.awayTeamId)),
    );

    assert.equal(pairings.size, 6);

    for (const teamId of teamIds) {
      const opponents = fixtures
        .filter((fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId)
        .map((fixture) => (fixture.homeTeamId === teamId ? fixture.awayTeamId : fixture.homeTeamId));

      assert.deepEqual(opponents.sort(), teamIds.filter((id) => id !== teamId).sort());
    }
  });

  it('does not create duplicate pairings', () => {
    const fixtures = generateGroupFixtures({
      groupId: 'B',
      teamIds: ['can', 'mar', 'par', 'aus'],
    });

    const pairings = fixtures.map((fixture) =>
      pairingKey(fixture.homeTeamId, fixture.awayTeamId),
    );

    assert.equal(new Set(pairings).size, pairings.length);
  });

  it('creates scheduled group-stage matches with stable ids', () => {
    const fixtures = generateGroupFixtures({
      groupId: 'C',
      teamIds: ['bra', 'tun', 'hai', 'sco'],
    });

    for (const fixture of fixtures) {
      assert.equal(fixture.stage, 'group');
      assert.equal(fixture.status, 'scheduled');
      assert.equal(fixture.groupId, 'C');
      assert.notEqual(fixture.homeTeamId, fixture.awayTeamId);
      assert.equal(fixture.id, `group-C-${fixture.homeTeamId}-${fixture.awayTeamId}`);
    }
  });

  it('creates n * (n - 1) / 2 matches for groups of other sizes', () => {
    const twoTeamFixtures = generateGroupFixtures({
      groupId: 'X',
      teamIds: ['a', 'b'],
    });

    const threeTeamFixtures = generateGroupFixtures({
      groupId: 'Y',
      teamIds: ['a', 'b', 'c'],
    });

    assert.equal(twoTeamFixtures.length, 1);
    assert.equal(threeTeamFixtures.length, 3);
  });
});
