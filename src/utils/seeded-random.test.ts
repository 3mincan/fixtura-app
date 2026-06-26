import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSeededRandom } from '@/utils/seeded-random';

function takeSequence(seed: string | number, count: number): number[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, () => random.next());
}

describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const first = takeSequence('worldcup2026', 10);
    const second = takeSequence('worldcup2026', 10);

    assert.deepEqual(second, first);
  });

  it('produces the same sequence for the same numeric seed', () => {
    const first = takeSequence(42, 8);
    const second = takeSequence(42, 8);

    assert.deepEqual(second, first);
  });

  it('produces different sequences for different seeds', () => {
    const sequenceA = takeSequence('seed-a', 10);
    const sequenceB = takeSequence('seed-b', 10);

    assert.notDeepEqual(sequenceB, sequenceA);
  });

  it('returns values in the range [0, 1)', () => {
    const random = createSeededRandom('range-check');

    for (let i = 0; i < 100; i++) {
      const value = random.next();
      assert.ok(value >= 0);
      assert.ok(value < 1);
    }
  });

  it('generates deterministic integers within bounds', () => {
    const random = createSeededRandom('integer-check');
    const firstRun = Array.from({ length: 20 }, () => random.nextInt(1, 6));
    const secondRandom = createSeededRandom('integer-check');
    const secondRun = Array.from({ length: 20 }, () => secondRandom.nextInt(1, 6));

    assert.deepEqual(secondRun, firstRun);

    for (const value of firstRun) {
      assert.ok(value >= 1);
      assert.ok(value <= 6);
    }
  });
});
