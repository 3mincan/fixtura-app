import { randomUUID } from 'node:crypto';

import type { JsonStore } from '../storage/json-store.js';
import type { JsonObject, SimulationRecord, SimulationSummary } from '../types.js';

export type SaveSimulationInput = {
  id?: string;
  selectedTeamId: string;
  gameMode: 'predict' | 'random';
  tournamentPhase: string;
  currentStage: string;
  championId: string | null;
  progress: JsonObject;
};

export class SimulationService {
  constructor(private readonly store: JsonStore) {}

  async list(userId: string): Promise<SimulationSummary[]> {
    const snapshot = await this.store.read();
    return snapshot.simulations
      .filter((simulation) => simulation.userId === userId)
      .map(({ progress: _progress, ...summary }) => summary)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  async get(userId: string, simulationId: string): Promise<SimulationRecord | null> {
    const snapshot = await this.store.read();
    return (
      snapshot.simulations.find(
        (simulation) => simulation.userId === userId && simulation.id === simulationId,
      ) ?? null
    );
  }

  async save(userId: string, input: SaveSimulationInput): Promise<SimulationRecord> {
    const now = Date.now();
    const simulationId = input.id ?? randomUUID();
    let saved: SimulationRecord | undefined;

    await this.store.update((snapshot) => {
      const existing = snapshot.simulations.find(
        (simulation) => simulation.userId === userId && simulation.id === simulationId,
      );

      saved = {
        id: simulationId,
        userId,
        selectedTeamId: input.selectedTeamId,
        gameMode: input.gameMode,
        tournamentPhase: input.tournamentPhase,
        currentStage: input.currentStage,
        championId: input.championId,
        progress: input.progress,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      return {
        ...snapshot,
        simulations: [
          ...snapshot.simulations.filter(
            (simulation) => !(simulation.userId === userId && simulation.id === simulationId),
          ),
          saved,
        ],
      };
    });

    return saved!;
  }

  async delete(userId: string, simulationId: string): Promise<boolean> {
    let deleted = false;

    await this.store.update((snapshot) => {
      const nextSimulations = snapshot.simulations.filter((simulation) => {
        const shouldDelete = simulation.userId === userId && simulation.id === simulationId;
        deleted ||= shouldDelete;
        return !shouldDelete;
      });

      return {
        ...snapshot,
        simulations: nextSimulations,
      };
    });

    return deleted;
  }
}
