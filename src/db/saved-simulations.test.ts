import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { listSavedSimulations, saveTournamentProgress, toPersistableState } from '@/db/persistence';
import { createTestDatabase } from '@/db/test-database';
import type { DatabaseClient } from '@/db/types';
import { openSavedSimulation } from '@/store/tournament-persistence';
import { useTournamentStore } from '@/store/tournament-store';
import { formatSimulationDate } from '@/utils/format-simulation-date';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('saved simulations screen data', () => {
  let db: DatabaseClient;
  let closeDatabase: () => void;

  afterEach(() => {
    resetStore();
    closeDatabase();
  });

  it('shows selected team, champion and created date for saved tournaments', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex');
    await saveTournamentProgress(db, toPersistableState(useTournamentStore.getState()));

    const [savedSimulation] = await listSavedSimulations(db);

    assert.ok(savedSimulation);
    assert.equal(savedSimulation.teamId, 'mex');
    assert.equal(savedSimulation.championId, null);
    assert.ok(savedSimulation.createdAt > 0);
    assert.match(formatSimulationDate(savedSimulation.createdAt), /\d/);
  });

  it('includes game mode for saved tournaments', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex', { gameMode: 'random' });
    await saveTournamentProgress(db, toPersistableState(useTournamentStore.getState()));

    const [savedSimulation] = await listSavedSimulations(db);

    assert.ok(savedSimulation);
    assert.equal(savedSimulation.gameMode, 'random');
  });

  it('opens a saved simulation into the active tournament store', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex');
    const savedState = useTournamentStore.getState();
    await saveTournamentProgress(db, toPersistableState(savedState));

    resetStore();

    const opened = await openSavedSimulation(db, savedState.activeSimulationId!);
    assert.equal(opened, 'restored');

    const state = useTournamentStore.getState();
    assert.equal(state.selectedTeamId, 'mex');
    assert.equal(state.activeSimulationId, savedState.activeSimulationId);
    assert.equal(state.pendingUserMatch?.id, 'group-A-mex-rsa');
  });
});
