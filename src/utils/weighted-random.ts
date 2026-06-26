import type { SeededRandom } from '@/utils/seeded-random';

export type WeightedOutcome<T> = {
  outcome: T;
  weight: number;
};

export function pickWeighted<T>(
  outcomes: WeightedOutcome<T>[],
  random: SeededRandom,
): T {
  if (outcomes.length === 0) {
    throw new Error('pickWeighted requires at least one weighted outcome');
  }

  let totalWeight = 0;

  for (const { weight } of outcomes) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error('pickWeighted weights must be finite non-negative numbers');
    }

    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    throw new Error('pickWeighted requires a positive total weight');
  }

  let roll = random.next() * totalWeight;

  for (const { outcome, weight } of outcomes) {
    roll -= weight;

    if (roll < 0) {
      return outcome;
    }
  }

  return outcomes[outcomes.length - 1].outcome;
}
