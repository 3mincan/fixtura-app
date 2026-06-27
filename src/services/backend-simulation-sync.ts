import type { DatabaseClient } from '@/db/types';
import { saveBackendSimulation } from '@/services/backend-api';
import { getOrCreateBackendUserId } from '@/services/backend-session';
import type { TournamentProgressState } from '@/store/tournament-store';

export async function syncTournamentProgressToBackend(
  db: DatabaseClient,
  state: TournamentProgressState,
): Promise<void> {
  if (!state.selectedTeamId || !state.activeSimulationId) {
    return;
  }

  const userId = await getOrCreateBackendUserId(db);

  if (!userId) {
    return;
  }

  await saveBackendSimulation({
    userId,
    simulation: {
      id: state.activeSimulationId,
      selectedTeamId: state.selectedTeamId,
      gameMode: state.gameMode,
      tournamentPhase: state.tournamentPhase,
      currentStage: state.currentStage,
      championId: state.championId,
      progress: toJsonObject(state),
    },
  });
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
