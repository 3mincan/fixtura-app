import { teams } from '@/data/teams';
import { knockoutFixtureToMatch } from '@/simulation/tournament-journey';
import type { KnockoutRoundResult } from '@/simulation/simulate-knockout-stage';
import type { TournamentJourneyPhase } from '@/simulation/tournament-journey';
import type { KnockoutBracketMatch } from '@/types/knockout';
import type { Match, UserMatchPrediction } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { TournamentStage, TournamentState } from '@/types/tournament';
import type { TournamentProgressState } from '@/store/tournament-store';
import { getNextUserMatch } from '@/utils/user-matches';
import type { DatabaseClient } from '@/db/types';

export type SavedSimulationSummary = {
  id: string;
  teamId: string;
  championId: string | null;
  gameMode: TournamentProgressState['gameMode'];
  createdAt: number;
};

type SimulationProgressJson = {
  gameMode?: TournamentProgressState['gameMode'];
  completedMatches: Match[];
  userPredictions: Record<string, UserMatchPrediction>;
  roundOf32Fixtures: KnockoutBracketMatch[];
  knockoutRoundResults: KnockoutRoundResult[];
  pendingKnockoutFixture: KnockoutBracketMatch | null;
  simulatedRevealMatches: Match[];
  simulatedRevealIndex: number;
  groupStandings: Record<string, Standing[]>;
  tournamentState: TournamentState | null;
};

type SimulationRow = {
  id: string;
  seed: string | null;
  team_id: string | null;
  current_stage: TournamentStage;
  tournament_phase: TournamentJourneyPhase;
  user_qualified: number;
  champion_id: string | null;
  progress_json: string | null;
  created_at: number;
  updated_at: number;
};

type MatchRow = {
  id: string;
  simulation_id: string;
  stage: TournamentStage;
  home_team_id: string;
  away_team_id: string;
  status: Match['status'];
  group_id: string | null;
  regulation_home: number | null;
  regulation_away: number | null;
  extra_time_home: number | null;
  extra_time_away: number | null;
  penalties_home: number | null;
  penalties_away: number | null;
};

const EMPTY_PROGRESS: SimulationProgressJson = {
  completedMatches: [],
  userPredictions: {},
  roundOf32Fixtures: [],
  knockoutRoundResults: [],
  pendingKnockoutFixture: null,
  simulatedRevealMatches: [],
  simulatedRevealIndex: 0,
  groupStandings: {},
  tournamentState: null,
};

export function toPersistableState(state: TournamentProgressState): TournamentProgressState {
  return {
    selectedTeamId: state.selectedTeamId,
    gameMode: state.gameMode,
    activeSimulationId: state.activeSimulationId,
    currentStage: state.currentStage,
    tournamentPhase: state.tournamentPhase,
    userQualified: state.userQualified,
    championId: state.championId,
    completedMatches: state.completedMatches,
    pendingUserMatch: state.pendingUserMatch,
    userPredictions: state.userPredictions,
    roundOf32Fixtures: state.roundOf32Fixtures,
    knockoutRoundResults: state.knockoutRoundResults,
    pendingKnockoutFixture: state.pendingKnockoutFixture,
    simulatedRevealMatches: state.simulatedRevealMatches,
    simulatedRevealIndex: state.simulatedRevealIndex,
    groupStandings: state.groupStandings,
    tournamentState: state.tournamentState,
  };
}

function derivePendingUserMatch(state: TournamentProgressState): Match | null {
  if (state.pendingKnockoutFixture) {
    return knockoutFixtureToMatch(state.pendingKnockoutFixture);
  }

  return getNextUserMatch(state.selectedTeamId, teams, state.completedMatches);
}

function matchToRow(match: Match, simulationId: string): MatchRow {
  return {
    id: match.id,
    simulation_id: simulationId,
    stage: match.stage,
    home_team_id: match.homeTeamId,
    away_team_id: match.awayTeamId,
    status: match.status,
    group_id: match.groupId ?? null,
    regulation_home: match.result?.regulation.home ?? null,
    regulation_away: match.result?.regulation.away ?? null,
    extra_time_home: match.result?.extraTime?.home ?? null,
    extra_time_away: match.result?.extraTime?.away ?? null,
    penalties_home: match.result?.penalties?.home ?? null,
    penalties_away: match.result?.penalties?.away ?? null,
  };
}

function collectPersistedMatches(state: TournamentProgressState): Match[] {
  const byId = new Map<string, Match>();

  for (const match of state.completedMatches) {
    byId.set(match.id, match);
  }

  for (const match of state.simulatedRevealMatches) {
    byId.set(match.id, match);
  }

  for (const round of state.knockoutRoundResults) {
    for (const knockoutMatch of round.matches) {
      byId.set(knockoutMatch.id, {
        id: knockoutMatch.id,
        stage: knockoutMatch.round,
        homeTeamId: knockoutMatch.homeTeamId,
        awayTeamId: knockoutMatch.awayTeamId,
        status: 'completed',
        result: knockoutMatch.result,
      });
    }
  }

  if (state.tournamentState) {
    for (const match of state.tournamentState.matches) {
      if (match.status === 'completed') {
        byId.set(match.id, match);
      }
    }
  }

  return [...byId.values()];
}

function toProgressJson(state: TournamentProgressState): string {
  const progress: SimulationProgressJson = {
    gameMode: state.gameMode,
    completedMatches: state.completedMatches,
    userPredictions: state.userPredictions,
    roundOf32Fixtures: state.roundOf32Fixtures,
    knockoutRoundResults: state.knockoutRoundResults,
    pendingKnockoutFixture: state.pendingKnockoutFixture,
    simulatedRevealMatches: state.simulatedRevealMatches,
    simulatedRevealIndex: state.simulatedRevealIndex,
    groupStandings: state.groupStandings,
    tournamentState: state.tournamentState,
  };

  return JSON.stringify(progress);
}

function parseProgressJson(progressJson: string | null): SimulationProgressJson | null {
  if (!progressJson) {
    return EMPTY_PROGRESS;
  }

  try {
    return {
      ...EMPTY_PROGRESS,
      ...JSON.parse(progressJson),
    };
  } catch {
    return null;
  }
}

function buildLoadedState(simulation: SimulationRow | null): TournamentProgressState | null {
  if (!simulation?.team_id) {
    return null;
  }

  const progress = parseProgressJson(simulation.progress_json);

  if (!progress) {
    return null;
  }

  const state: TournamentProgressState = {
    selectedTeamId: simulation.team_id,
    gameMode: progress.gameMode ?? 'predict',
    activeSimulationId: simulation.id,
    currentStage: simulation.current_stage,
    tournamentPhase: simulation.tournament_phase,
    userQualified: simulation.user_qualified === 1,
    championId: simulation.champion_id,
    completedMatches: progress.completedMatches,
    pendingUserMatch: null,
    userPredictions: progress.userPredictions,
    roundOf32Fixtures: progress.roundOf32Fixtures,
    knockoutRoundResults: progress.knockoutRoundResults,
    pendingKnockoutFixture: progress.pendingKnockoutFixture,
    simulatedRevealMatches: progress.simulatedRevealMatches,
    simulatedRevealIndex: progress.simulatedRevealIndex,
    groupStandings: progress.groupStandings ?? {},
    tournamentState: progress.tournamentState,
  };

  state.pendingUserMatch = derivePendingUserMatch(state);
  return state;
}

export async function clearSavedProgress(db: DatabaseClient): Promise<void> {
  await db.execAsync(`
    DELETE FROM matches;
    DELETE FROM standings;
    DELETE FROM simulations;
    DELETE FROM selected_team;
  `);
}

export async function listSavedSimulations(
  db: DatabaseClient,
): Promise<SavedSimulationSummary[]> {
  const rows = await db.getAllAsync<{
    id: string;
    team_id: string;
    champion_id: string | null;
    progress_json: string | null;
    created_at: number;
  }>(
    `SELECT id, team_id, champion_id, progress_json, created_at
     FROM simulations
     WHERE team_id IS NOT NULL
     ORDER BY created_at DESC, updated_at DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    championId: row.champion_id,
    gameMode: parseProgressJson(row.progress_json)?.gameMode ?? 'predict',
    createdAt: row.created_at,
  }));
}

export async function saveTournamentProgress(
  db: DatabaseClient,
  state: TournamentProgressState,
): Promise<void> {
  if (!state.selectedTeamId || !state.activeSimulationId) {
    return;
  }

  const simulationId = state.activeSimulationId;
  const now = Date.now();
  const progressJson = toProgressJson(state);
  const matches = collectPersistedMatches(state);
  const standings = state.tournamentState?.standings ?? {};

  const existingSimulation = await db.getFirstAsync<Pick<SimulationRow, 'created_at'>>(
    'SELECT created_at FROM simulations WHERE id = ?',
    simulationId,
  );

  await db.runAsync(
    `INSERT INTO simulations (
      id, seed, team_id, current_stage, tournament_phase, user_qualified, champion_id,
      progress_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      seed = excluded.seed,
      team_id = excluded.team_id,
      current_stage = excluded.current_stage,
      tournament_phase = excluded.tournament_phase,
      user_qualified = excluded.user_qualified,
      champion_id = excluded.champion_id,
      progress_json = excluded.progress_json,
      updated_at = excluded.updated_at`,
    simulationId,
    null,
    state.selectedTeamId,
    state.currentStage,
    state.tournamentPhase,
    state.userQualified ? 1 : 0,
    state.championId,
    progressJson,
    existingSimulation?.created_at ?? now,
    now,
  );

  await db.runAsync('DELETE FROM matches WHERE simulation_id = ?', simulationId);
  await db.runAsync('DELETE FROM standings WHERE simulation_id = ?', simulationId);

  for (const match of matches) {
    const row = matchToRow(match, simulationId);
    await db.runAsync(
      `INSERT INTO matches (
        id, simulation_id, stage, home_team_id, away_team_id, status, group_id,
        regulation_home, regulation_away, extra_time_home, extra_time_away,
        penalties_home, penalties_away
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.simulation_id,
      row.stage,
      row.home_team_id,
      row.away_team_id,
      row.status,
      row.group_id,
      row.regulation_home,
      row.regulation_away,
      row.extra_time_home,
      row.extra_time_away,
      row.penalties_home,
      row.penalties_away,
    );
  }

  for (const [groupId, groupStandings] of Object.entries(standings)) {
    for (const standing of groupStandings) {
      await insertStanding(db, simulationId, groupId, standing);
    }
  }
}

async function insertStanding(
  db: DatabaseClient,
  simulationId: string,
  groupId: string,
  standing: Standing,
) {
  await db.runAsync(
    `INSERT INTO standings (
      simulation_id, group_id, team_id, played, won, drawn, lost,
      goals_for, goals_against, goal_difference, points
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    simulationId,
    groupId,
    standing.teamId,
    standing.played,
    standing.won,
    standing.drawn,
    standing.lost,
    standing.goalsFor,
    standing.goalsAgainst,
    standing.goalDifference,
    standing.points,
  );
}

export async function loadTournamentProgressById(
  db: DatabaseClient,
  simulationId: string,
): Promise<TournamentProgressState | null> {
  const simulation = await db.getFirstAsync<SimulationRow>(
    'SELECT * FROM simulations WHERE id = ?',
    simulationId,
  );

  return buildLoadedState(simulation);
}

export async function loadTournamentProgress(
  db: DatabaseClient,
): Promise<TournamentProgressState | null> {
  const simulation = await db.getFirstAsync<SimulationRow>(
    `SELECT * FROM simulations
     WHERE team_id IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
  );

  return buildLoadedState(simulation);
}
