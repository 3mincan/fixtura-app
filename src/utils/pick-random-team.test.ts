import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { pickRandomTeam } from '@/utils/pick-random-team';

describe('pickRandomTeam', () => {
  it('returns a team from the tournament roster', () => {
    const team = pickRandomTeam();
    const knownTeam = teams.find((entry) => entry.id === team.id);

    assert.ok(knownTeam);
  });
});
