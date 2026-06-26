import type { SimulationSpeed } from '@/types/app-settings';

export function normalizeSimulationSpeed(value: unknown): SimulationSpeed {
  if (value === 'fast' || value === 'instant') {
    return 'instant';
  }

  if (value === 'slow' || value === 'normal') {
    return value;
  }

  return 'normal';
}

export function isInstantSimulationSpeed(speed: SimulationSpeed): boolean {
  return speed === 'instant';
}
