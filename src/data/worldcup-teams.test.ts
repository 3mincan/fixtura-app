import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teamRatingsById } from '@/data/team-ratings';
import { teams, teamsById } from '@/data/teams';

describe('world cup teams', () => {
  it('loads all 48 teams from worldcup.teams.json', () => {
    assert.equal(teams.length, 48);
  });

  it('uses the real 2026 group A draw', () => {
    const groupA = teams.filter((team) => team.group === 'A').map((team) => team.id);

    assert.deepEqual(groupA, ['mex', 'rsa', 'kor', 'cze']);
  });

  it('maps fifa codes to team metadata', () => {
    const mexico = teamsById.mex;

    assert.equal(mexico.name, 'Mexico');
    assert.equal(mexico.shortName, 'MEX');
    assert.equal(mexico.flagEmoji, '🇲🇽');
    assert.equal(mexico.confederation, 'CONCACAF');
  });

  it('prefers normalised display names when provided', () => {
    assert.equal(teamsById.usa.name, 'United States');
    assert.equal(teamsById.civ.name, "Cote d'Ivoire");
  });

  it('derives simulation ratings from team strength fields', () => {
    const mexicoRating = teamRatingsById.mex;

    assert.equal(mexicoRating.elo, 1780);
    assert.equal(mexicoRating.attackStrength, 1.15);
    assert.equal(mexicoRating.defensiveStrength, 0.95);
    assert.equal(mexicoRating.overall, 78);
    assert.equal(mexicoRating.championshipProbability, 0.015);
  });
});
