import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  listSavedSimulations,
  loadTournamentProgress,
  loadTournamentProgressById,
  saveTournamentProgress,
  toPersistableState,
} from '@/db/persistence';
import { teams } from '@/data/teams';
import { createTestDatabase } from '@/db/test-database';
import type { DatabaseClient } from '@/db/types';
import { useTournamentStore } from '@/store/tournament-store';
import { getUserGroupMatches } from '@/utils/user-matches';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

async function getSavedMatchCount(db: DatabaseClient, simulationId: string) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM matches WHERE simulation_id = ?',
    simulationId,
  );

  return row?.count ?? 0;
}

describe('tournament persistence', () => {
  let db: DatabaseClient;
  let closeDatabase: () => void;

  afterEach(() => {
    resetStore();
    closeDatabase();
  });

  it('restores selected team after a simulated app restart', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex');
    await saveTournamentProgress(db, toPersistableState(useTournamentStore.getState()));

    resetStore();

    const restored = await loadTournamentProgress(db);
    assert.ok(restored);
    useTournamentStore.getState().hydrateFromPersistence(restored!);

    const state = useTournamentStore.getState();
    assert.equal(state.selectedTeamId, 'mex');
    assert.equal(state.pendingUserMatch?.id, 'group-A-mex-kor');
    assert.ok(state.activeSimulationId);
  });

  it('restores predictions and tournament progress after a simulated app restart', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex');

    const expectedMatchIds = ['group-A-mex-kor', 'group-A-cze-mex'];

    for (const expectedMatchId of expectedMatchIds) {
      const { pendingUserMatch } = useTournamentStore.getState();
      assert.equal(pendingUserMatch?.id, expectedMatchId);
      useTournamentStore.getState().saveUserPrediction(pendingUserMatch!, 2, 1);
    }

    useTournamentStore.getState().prepareSimulatedReveal();
    useTournamentStore.getState().revealNextResult();
    useTournamentStore.getState().beginKnockoutStage();

    const beforeRestart = useTournamentStore.getState();
    await saveTournamentProgress(db, toPersistableState(beforeRestart));

    assert.ok(beforeRestart.userPredictions['group-A-mex-kor']);
    assert.equal(beforeRestart.tournamentPhase, 'knockout');
    assert.ok(beforeRestart.roundOf32Fixtures.length > 0);
    assert.ok(beforeRestart.simulatedRevealMatches.length > 0);
    assert.ok(beforeRestart.activeSimulationId);
    assert.ok((await getSavedMatchCount(db, beforeRestart.activeSimulationId!)) > 0);

    resetStore();

    const restored = await loadTournamentProgress(db);
    assert.ok(restored);
    useTournamentStore.getState().hydrateFromPersistence(restored!);

    const state = useTournamentStore.getState();

    assert.equal(state.selectedTeamId, 'mex');
    assert.deepEqual(state.userPredictions, beforeRestart.userPredictions);
    assert.equal(state.completedMatches.length, beforeRestart.completedMatches.length);
    assert.equal(state.tournamentPhase, beforeRestart.tournamentPhase);
    assert.equal(state.currentStage, beforeRestart.currentStage);
    assert.equal(state.userQualified, beforeRestart.userQualified);
    assert.equal(state.simulatedRevealIndex, beforeRestart.simulatedRevealIndex);
    assert.deepEqual(
      state.simulatedRevealMatches.map((match) => match.id),
      beforeRestart.simulatedRevealMatches.map((match) => match.id),
    );
    assert.deepEqual(
      state.roundOf32Fixtures.map((fixture) => fixture.id),
      beforeRestart.roundOf32Fixtures.map((fixture) => fixture.id),
    );
    assert.equal(state.pendingUserMatch?.id, beforeRestart.pendingUserMatch?.id);
    assert.equal(state.pendingKnockoutFixture?.id, beforeRestart.pendingKnockoutFixture?.id);
  });

  it('lists saved tournaments and opens a saved simulation', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    useTournamentStore.getState().selectTeam('mex');
    const mexState = useTournamentStore.getState();
    await saveTournamentProgress(db, toPersistableState(mexState));

    useTournamentStore.getState().resetTournamentProgress();
    useTournamentStore.getState().selectTeam('bra');
    const braState = useTournamentStore.getState();
    await saveTournamentProgress(db, toPersistableState(braState));

    const savedSimulations = await listSavedSimulations(db);
    const mexSimulation = savedSimulations.find((simulation) => simulation.teamId === 'mex');
    const braSimulation = savedSimulations.find((simulation) => simulation.teamId === 'bra');

    assert.equal(savedSimulations.length, 2);
    assert.ok(mexSimulation);
    assert.ok(braSimulation);
    assert.ok(mexSimulation.createdAt);
    assert.equal(mexSimulation.championId, null);

    resetStore();

    const restored = await loadTournamentProgressById(db, mexState.activeSimulationId!);
    assert.ok(restored);
    useTournamentStore.getState().hydrateFromPersistence(restored!);

    const state = useTournamentStore.getState();
    assert.equal(state.selectedTeamId, 'mex');
    assert.equal(state.activeSimulationId, mexState.activeSimulationId);
    assert.equal(state.pendingUserMatch?.id, 'group-A-mex-kor');
  });
});
