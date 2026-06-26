import type { SimulationSpeed } from '@/types/app-settings';

import { INSTANT_REVEAL_ANIMATION_MS } from '@/utils/matchday-clock';

const REVEAL_DELAYS_MS: Record<SimulationSpeed, number> = {
  slow: 2000,
  normal: 800,
  instant: INSTANT_REVEAL_ANIMATION_MS,
};

export function getRevealDelayMs(speed: SimulationSpeed): number {
  return REVEAL_DELAYS_MS[speed];
}
