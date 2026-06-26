import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { saveTournamentProgress, toPersistableState } from '@/db/persistence';
import { createTestDatabase } from '@/db/test-database';
import type { DatabaseClient } from '@/db/types';
import {
  hydrateTournamentStore,
  openSavedSimulation,
} from '@/store/tournament-persistence';
import { useTournamentStore } from '@/store/tournament-store';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('failed restore handling', () => {
  let db: DatabaseClient;
  let closeDatabase: () => void;

  afterEach(() => {
    resetStore();
    closeDatabase();
  });

  it('reports failed restore when saved progress is corrupted', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex');
    const savedState = useTournamentStore.getState();
    await saveTournamentProgress(db, toPersistableState(savedState));

    await db.runAsync(
      'UPDATE simulations SET progress_json = ? WHERE id = ?',
      '{ invalid json',
      savedState.activeSimulationId!,
    );

    resetStore();

    const result = await hydrateTournamentStore(db);
    assert.equal(result, 'failed');
  });

  it('reports failed restore when opening a corrupted simulation', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex');
    const savedState = useTournamentStore.getState();
    await saveTournamentProgress(db, toPersistableState(savedState));

    await db.runAsync(
      'UPDATE simulations SET progress_json = ? WHERE id = ?',
      '{ invalid json',
      savedState.activeSimulationId!,
    );

    resetStore();

    const result = await openSavedSimulation(db, savedState.activeSimulationId!);
    assert.equal(result, 'failed');
  });
});
