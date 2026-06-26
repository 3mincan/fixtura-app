import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  enableTournamentPersistence,
  flushTournamentPersistence,
  hydrateTournamentStore,
} from '@/store/tournament-persistence';
import {
  listSavedSimulations,
  loadTournamentProgress,
  loadTournamentProgressById,
} from '@/db/persistence';
import { teams } from '@/data/teams';
import { createTestDatabase } from '@/db/test-database';
import type { DatabaseClient } from '@/db/types';
import { useTournamentStore } from '@/store/tournament-store';
import { getGroupTable } from '@/utils/group-standings';
import { getUserGroupMatches } from '@/utils/user-matches';

function resetStore() {
  useTournamentStore.getState().resetTournamentProgress();
}

describe('MVP flow verification', () => {
  let db: DatabaseClient;
  let closeDatabase: () => void;

  afterEach(() => {
    resetStore();
    closeDatabase?.();
  });

  it('completes the full tournament journey from team selection to champion', () => {
    useTournamentStore.getState().selectTeam('mex');

    const remainingGroupMatches = ['group-A-mex-kor', 'group-A-cze-mex'];

    assert.equal(getUserGroupMatches('mex', teams).length, 3);

    for (const matchId of remainingGroupMatches) {
      const { pendingUserMatch, tournamentPhase } = useTournamentStore.getState();
      assert.equal(tournamentPhase, 'group');
      assert.equal(pendingUserMatch?.id, matchId);
      useTournamentStore.getState().saveUserPrediction(pendingUserMatch!, 3, 0);
    }

    const afterGroup = useTournamentStore.getState();
    assert.equal(afterGroup.tournamentPhase, 'group');
    assert.equal(afterGroup.pendingUserMatch, null);

    useTournamentStore.getState().beginKnockoutStage();

    const afterKnockoutStart = useTournamentStore.getState();
    assert.equal(afterKnockoutStart.tournamentPhase, 'knockout');
    assert.ok(afterKnockoutStart.pendingUserMatch);
    assert.ok(afterKnockoutStart.roundOf32Fixtures.length > 0);

    useTournamentStore.getState().prepareSimulatedReveal();
    const revealState = useTournamentStore.getState();
    assert.ok(revealState.simulatedRevealMatches.length > 0);

    const table = getGroupTable({
      selectedTeamId: 'mex',
      teamList: teams,
      userPredictions: revealState.userPredictions,
    });
    assert.ok(table);
    assert.equal(table.groupId, 'A');
    assert.equal(table.rows.length, 4);

    let state = useTournamentStore.getState();
    while (state.tournamentPhase === 'knockout') {
      const match = state.pendingUserMatch!;

      useTournamentStore.getState().saveKnockoutPrediction(match, {
        regulation:
          match.homeTeamId === 'mex' ? { home: 2, away: 0 } : { home: 0, away: 2 },
      });

      state = useTournamentStore.getState();
    }

    assert.equal(state.tournamentPhase, 'champion');
    assert.equal(state.championId, 'mex');
    assert.equal(state.pendingUserMatch, null);
  });

  it('restarts with a fresh tournament after the user picks a new team', () => {
    useTournamentStore.getState().selectTeam('mex');

    for (const matchId of ['group-A-mex-kor', 'group-A-cze-mex']) {
      const { pendingUserMatch } = useTournamentStore.getState();
      assert.equal(pendingUserMatch?.id, matchId);
      useTournamentStore.getState().saveUserPrediction(pendingUserMatch!, 3, 0);
    }

    useTournamentStore.getState().beginKnockoutStage();

    while (useTournamentStore.getState().tournamentPhase === 'knockout') {
      const match = useTournamentStore.getState().pendingUserMatch!;

      useTournamentStore.getState().saveKnockoutPrediction(match, {
        regulation:
          match.homeTeamId === 'mex' ? { home: 2, away: 0 } : { home: 0, away: 2 },
      });
    }

    const finished = useTournamentStore.getState();
    assert.equal(finished.tournamentPhase, 'champion');

    useTournamentStore.getState().selectTeam('bra');

    const restarted = useTournamentStore.getState();
    assert.equal(restarted.selectedTeamId, 'bra');
    assert.equal(restarted.tournamentPhase, 'group');
    assert.equal(restarted.championId, null);
    assert.deepEqual(restarted.completedMatches, []);
    assert.deepEqual(restarted.userPredictions, {});
    assert.notEqual(restarted.activeSimulationId, finished.activeSimulationId);
    assert.equal(restarted.pendingUserMatch?.homeTeamId, 'bra');
  });

  it('auto-saves progress and restores after a simulated app restart', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    const unsubscribe = enableTournamentPersistence(db);

    try {
      useTournamentStore.getState().selectTeam('mex');

      for (const matchId of ['group-A-mex-kor', 'group-A-cze-mex']) {
        const { pendingUserMatch } = useTournamentStore.getState();
        assert.equal(pendingUserMatch?.id, matchId);
        useTournamentStore.getState().saveUserPrediction(pendingUserMatch!, 2, 1);
      }

      await flushTournamentPersistence();

      useTournamentStore.getState().beginKnockoutStage();
      await flushTournamentPersistence();

      const beforeRestart = useTournamentStore.getState();
      assert.equal(beforeRestart.tournamentPhase, 'knockout');
      assert.ok(beforeRestart.activeSimulationId);

      const savedBeforeRestart = await loadTournamentProgress(db);
      assert.ok(savedBeforeRestart);
      assert.equal(savedBeforeRestart.selectedTeamId, 'mex');

      resetStore();

      const restored = await hydrateTournamentStore(db);
      assert.equal(restored, 'restored');

      const afterRestart = useTournamentStore.getState();
      assert.equal(afterRestart.selectedTeamId, 'mex');
      assert.equal(afterRestart.tournamentPhase, 'knockout');
      assert.deepEqual(afterRestart.userPredictions, beforeRestart.userPredictions);
      assert.equal(afterRestart.pendingUserMatch?.id, beforeRestart.pendingUserMatch?.id);
    } finally {
      unsubscribe();
      await flushTournamentPersistence();
    }
  });

  it('lists saved simulations and opens a specific save', async () => {
    ({ client: db, close: closeDatabase } = await createTestDatabase());

    const unsubscribe = enableTournamentPersistence(db);

    try {
      useTournamentStore.getState().selectTeam('mex');
      await flushTournamentPersistence();

      const mexSimulationId = useTournamentStore.getState().activeSimulationId!;

      useTournamentStore.getState().selectTeam('bra');
      await flushTournamentPersistence();

      const braSimulationId = useTournamentStore.getState().activeSimulationId!;

      const savedSimulations = await listSavedSimulations(db);
      assert.equal(savedSimulations.length, 2);

      resetStore();

      const restored = await loadTournamentProgressById(db, mexSimulationId);
      assert.ok(restored);
      useTournamentStore.getState().hydrateFromPersistence(restored!);

      const state = useTournamentStore.getState();
      assert.equal(state.selectedTeamId, 'mex');
      assert.equal(state.activeSimulationId, mexSimulationId);
      assert.notEqual(state.activeSimulationId, braSimulationId);
    } finally {
      unsubscribe();
      await flushTournamentPersistence();
    }
  });
});
