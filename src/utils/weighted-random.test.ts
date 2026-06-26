import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSeededRandom } from '@/utils/seeded-random';
import { pickWeighted } from '@/utils/weighted-random';

const matchOutcomes = [
  { outcome: 'win', weight: 50 },
  { outcome: 'draw', weight: 25 },
  { outcome: 'loss', weight: 25 },
] as const;

function pickMany<T>(
  outcomes: { outcome: T; weight: number }[],
  seed: string,
  count: number,
): T[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, () => pickWeighted(outcomes, random));
}

describe('pickWeighted', () => {
  it('rejects empty input', () => {
    const random = createSeededRandom('empty-input');

    assert.throws(
      () => pickWeighted([], random),
      /requires at least one weighted outcome/,
    );
  });

  it('rejects zero total weight', () => {
    const random = createSeededRandom('zero-weight');

    assert.throws(
      () =>
        pickWeighted(
          [
            { outcome: 'a', weight: 0 },
            { outcome: 'b', weight: 0 },
          ],
          random,
        ),
      /requires a positive total weight/,
    );
  });

  it('rejects negative weights', () => {
    const random = createSeededRandom('negative-weight');

    assert.throws(
      () =>
        pickWeighted(
          [
            { outcome: 'a', weight: 1 },
            { outcome: 'b', weight: -1 },
          ],
          random,
        ),
      /finite non-negative numbers/,
    );
  });

  it('returns a valid outcome from weighted options', () => {
    const random = createSeededRandom('valid-outcome');
    const result = pickWeighted([...matchOutcomes], random);

    assert.ok(['win', 'draw', 'loss'].includes(result));
  });

  it('returns the same outcome for the same seed and weights', () => {
    const first = pickWeighted([...matchOutcomes], createSeededRandom('weighted-deterministic'));
    const second = pickWeighted([...matchOutcomes], createSeededRandom('weighted-deterministic'));

    assert.equal(second, first);
  });

  it('can return different outcomes for different seeds', () => {
    const seeds = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5'];
    const results = new Set(
      seeds.map((seed) => pickWeighted([...matchOutcomes], createSeededRandom(seed))),
    );

    assert.ok(results.size > 1);
  });

  it('respects weighting over repeated picks', () => {
    const picks = pickMany(
      [
        { outcome: 'common', weight: 90 },
        { outcome: 'rare', weight: 10 },
      ],
      'weighting-distribution',
      100,
    );

    const commonCount = picks.filter((pick) => pick === 'common').length;
    const rareCount = picks.filter((pick) => pick === 'rare').length;

    assert.ok(commonCount > rareCount);
    assert.equal(commonCount + rareCount, 100);
  });

  it('returns the only outcome when a single option is provided', () => {
    const random = createSeededRandom('single-outcome');
    const result = pickWeighted([{ outcome: 'only', weight: 42 }], random);

    assert.equal(result, 'only');
  });
});
