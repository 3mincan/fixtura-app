import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isInstantSimulationSpeed,
  normalizeSimulationSpeed,
} from '@/utils/normalize-simulation-speed';

describe('normalizeSimulationSpeed', () => {
  it('maps legacy fast speed to instant', () => {
    assert.equal(normalizeSimulationSpeed('fast'), 'instant');
  });

  it('keeps supported speeds unchanged', () => {
    assert.equal(normalizeSimulationSpeed('slow'), 'slow');
    assert.equal(normalizeSimulationSpeed('normal'), 'normal');
    assert.equal(normalizeSimulationSpeed('instant'), 'instant');
  });

  it('falls back to normal for unknown values', () => {
    assert.equal(normalizeSimulationSpeed('turbo'), 'normal');
  });

  it('detects instant speed', () => {
    assert.equal(isInstantSimulationSpeed('instant'), true);
    assert.equal(isInstantSimulationSpeed('normal'), false);
  });
});
