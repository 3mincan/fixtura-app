import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getOfficialFixtureResult,
  getWorldCupGroupFixtures,
  getWorldCupKnockoutFixtures,
  hasOfficialFixtureResult,
  worldCupGroupFixtures,
} from '@/data/worldcup-fixtures';
import { getUserGroupMatches } from '@/utils/user-matches';
import { teams } from '@/data/teams';

describe('world cup fixtures', () => {
  it('loads 72 group stage matches from fixtures.json', () => {
    assert.equal(worldCupGroupFixtures.length, 72);
  });

  it('orders group A matches by scheduled date and time', () => {
    const groupA = getWorldCupGroupFixtures('A');

    assert.equal(groupA.length, 6);
    assert.deepEqual(
      groupA.map((match) => match.id),
      [
        'group-A-mex-rsa',
        'group-A-kor-cze',
        'group-A-cze-rsa',
        'group-A-mex-kor',
        'group-A-cze-mex',
        'group-A-rsa-kor',
      ],
    );
    assert.equal(groupA[0]?.scheduledDate, '2026-06-11');
    assert.equal(groupA[0]?.ground, 'Mexico City');
  });

  it('returns user matches in chronological order', () => {
    const mexMatches = getUserGroupMatches('mex', teams);

    assert.deepEqual(
      mexMatches.map((match) => match.id),
      ['group-A-mex-rsa', 'group-A-mex-kor', 'group-A-cze-mex'],
    );
  });

  it('loads official results for played group matches from fixtures.json', () => {
    assert.equal(hasOfficialFixtureResult('group-A-mex-rsa'), true);
    assert.deepEqual(getOfficialFixtureResult('group-A-mex-rsa'), { home: 2, away: 0 });
    assert.equal(hasOfficialFixtureResult('group-A-mex-kor'), false);
  });

  it('loads third-place and final knockout fixtures', () => {
    const thirdPlaceFixtures = getWorldCupKnockoutFixtures('Match for third place');
    const finalFixtures = getWorldCupKnockoutFixtures('Final');

    assert.equal(thirdPlaceFixtures.length, 1);
    assert.equal(finalFixtures.length, 1);
    assert.equal(thirdPlaceFixtures[0]?.scheduledDate, '2026-07-18');
    assert.equal(finalFixtures[0]?.scheduledDate, '2026-07-19');
  });
});
