export type SeededRandom = {
  /** Returns a float in the range [0, 1). */
  next: () => number;
  /** Returns an integer in the range [min, max] (inclusive). */
  nextInt: (min: number, max: number) => number;
};

function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') {
    return seed >>> 0 || 1;
  }

  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) >>> 0;
  }

  return hash || 1;
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed: string | number): SeededRandom {
  const next = createMulberry32(hashSeed(seed));

  return {
    next,
    nextInt(min: number, max: number) {
      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        throw new Error('nextInt requires integer min and max');
      }

      if (min > max) {
        throw new Error('nextInt min cannot be greater than max');
      }

      const range = max - min + 1;
      return min + Math.floor(next() * range);
    },
  };
}
