import {
  clearSavedProgress,
  loadTournamentProgress,
  loadTournamentProgressById,
  saveTournamentProgress,
  toPersistableState,
} from '@/db/persistence';
import type { DatabaseClient } from '@/db/types';
import { useTournamentStore } from '@/store/tournament-store';

let isHydrating = false;
let pendingSaveChain = Promise.resolve();

export async function flushTournamentPersistence(): Promise<void> {
  await pendingSaveChain;
}

export type RestoreResult = 'restored' | 'empty' | 'failed';

async function hasSavedSimulation(db: DatabaseClient): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM simulations WHERE team_id IS NOT NULL LIMIT 1',
  );

  return row !== null;
}

export async function hydrateTournamentStore(db: DatabaseClient): Promise<RestoreResult> {
  try {
    const saved = await loadTournamentProgress(db);

    if (!saved) {
      return (await hasSavedSimulation(db)) ? 'failed' : 'empty';
    }

    isHydrating = true;
    useTournamentStore.getState().hydrateFromPersistence(saved);
    isHydrating = false;

    return 'restored';
  } catch {
    return 'failed';
  }
}

export async function openSavedSimulation(
  db: DatabaseClient,
  simulationId: string,
): Promise<RestoreResult> {
  try {
    const saved = await loadTournamentProgressById(db, simulationId);

    if (!saved) {
      return 'failed';
    }

    isHydrating = true;
    useTournamentStore.getState().hydrateFromPersistence(saved);
    isHydrating = false;

    return 'restored';
  } catch {
    return 'failed';
  }
}

export function enableTournamentPersistence(db: DatabaseClient): () => void {
  return useTournamentStore.subscribe((state, previousState) => {
    if (isHydrating || state === previousState) {
      return;
    }

    pendingSaveChain = pendingSaveChain.then(() =>
      saveTournamentProgress(db, toPersistableState(useTournamentStore.getState())),
    );
  });
}

export async function clearTournamentPersistence(db: DatabaseClient): Promise<void> {
  await clearSavedProgress(db);
}
