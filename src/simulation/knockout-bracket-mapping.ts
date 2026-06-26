export type RoundOf32Pairing = {
  homeSlot: string;
  awaySlot: string;
};

export type RoundOf32Mapping = {
  pairings: RoundOf32Pairing[];
};

export const ROUND_OF_32_MATCH_COUNT = 16;
export const ROUND_OF_32_TEAM_COUNT = ROUND_OF_32_MATCH_COUNT * 2;

export const DEFAULT_ROUND_OF_32_MAPPING: RoundOf32Mapping = {
  pairings: Array.from({ length: ROUND_OF_32_MATCH_COUNT }, (_, index) => ({
    homeSlot: `SEED-${index * 2}`,
    awaySlot: `SEED-${index * 2 + 1}`,
  })),
};
