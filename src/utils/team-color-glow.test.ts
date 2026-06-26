import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { teams } from '@/data/teams';
import { teamColorsById } from '@/data/team-colors';
import {
  areTeamPrimaryColorsSimilar,
  buildTeamHalfGradientColors,
  getMatchCardTeamGlowColors,
  resolveAwayTeamGlowColor,
  TEAM_HALF_GRADIENT_ALPHAS,
  TEAM_HALF_GRADIENT_LOCATIONS,
  toRgba,
} from '@/utils/team-color-glow';

describe('team color glow', () => {
  it('defines primary and secondary colors for every team', () => {
    for (const team of teams) {
      const colors = teamColorsById[team.id];

      assert.ok(colors, `Missing colors for ${team.id}`);
      assert.match(colors.primary, /^#[0-9A-F]{6}$/i);
      assert.match(colors.secondary, /^#[0-9A-F]{6}$/i);
    }
  });

  it('always uses the home team primary color on the left', () => {
    const colors = getMatchCardTeamGlowColors('mex', 'usa');

    assert.equal(colors.home, teamColorsById.mex.primary);
  });

  it('uses away secondary when primaries are too similar', () => {
    assert.equal(areTeamPrimaryColorsSimilar('usa', 'fra'), true);
    assert.equal(
      resolveAwayTeamGlowColor('usa', 'fra'),
      teamColorsById.fra.secondary,
    );
  });

  it('uses away primary when colors are distinct', () => {
    assert.equal(
      resolveAwayTeamGlowColor('mex', 'kor'),
      teamColorsById.kor.primary,
    );
  });

  it('builds rgba strings for gradients', () => {
    assert.equal(toRgba('#FF0000', 0.5), 'rgba(255, 0, 0, 0.5)');
  });

  it('fades each team half from 0% at center to 100% at the edge', () => {
    assert.deepEqual(TEAM_HALF_GRADIENT_LOCATIONS, [0, 0.5, 1]);
    assert.deepEqual(TEAM_HALF_GRADIENT_ALPHAS, [1, 0.25, 0]);
    assert.deepEqual(buildTeamHalfGradientColors('#006847', 'home'), [
      'rgba(0, 104, 71, 1)',
      'rgba(0, 104, 71, 0.25)',
      'rgba(0, 104, 71, 0)',
    ]);
    assert.deepEqual(buildTeamHalfGradientColors('#006847', 'away'), [
      'rgba(0, 104, 71, 0)',
      'rgba(0, 104, 71, 0.25)',
      'rgba(0, 104, 71, 1)',
    ]);
  });
});
