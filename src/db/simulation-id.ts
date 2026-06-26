export function createSimulationId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
