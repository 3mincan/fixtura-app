import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Team } from '@/types/team';
import { filterTeams } from '@/utils/filter-teams';

const sampleTeams: Team[] = [
  {
    id: 'usa',
    name: 'United States',
    shortName: 'USA',
    flagEmoji: '🇺🇸',
    group: 'D',
    confederation: 'CONCACAF',
  },
  {
    id: 'bra',
    name: 'Brazil',
    shortName: 'BRA',
    flagEmoji: '🇧🇷',
    group: 'C',
    confederation: 'CONMEBOL',
  },
  {
    id: 'jpn',
    name: 'Japan',
    shortName: 'JPN',
    flagEmoji: '🇯🇵',
    group: 'F',
    confederation: 'AFC',
  },
];

describe('filterTeams', () => {
  it('returns all teams when the query is empty', () => {
    assert.deepEqual(filterTeams(sampleTeams, ''), sampleTeams);
    assert.deepEqual(filterTeams(sampleTeams, '   '), sampleTeams);
  });

  it('filters teams by name, short name, id, group and confederation', () => {
    assert.deepEqual(filterTeams(sampleTeams, 'united'), [sampleTeams[0]]);
    assert.deepEqual(filterTeams(sampleTeams, 'bra'), [sampleTeams[1]]);
    assert.deepEqual(filterTeams(sampleTeams, 'jpn'), [sampleTeams[2]]);
    assert.deepEqual(filterTeams(sampleTeams, 'concacaf'), [sampleTeams[0]]);
    assert.deepEqual(filterTeams(sampleTeams, 'group c'), [sampleTeams[1]]);
  });
});
