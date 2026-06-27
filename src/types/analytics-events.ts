import type { GameMode, TournamentStartMode } from '@/store/tournament-store';
import type { TournamentStage } from '@/types/tournament';

export type AnalyticsEventName =
  | 'app_opened'
  | 'session_started'
  | 'session_ended'
  | 'onboarding_completed'
  | 'team_selected'
  | 'tournament_started'
  | 'user_prediction_made'
  | 'matchday_viewed'
  | 'phase_reached'
  | 'user_eliminated'
  | 'tournament_completed'
  | 'new_game_started'
  | 'saved_simulation_opened'
  | 'share_created'
  | 'share_opened'
  | 'setting_changed'
  | 'restore_failure';

export type AnalyticsPhase =
  | 'group_complete'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'final'
  | 'champion';

export type QueuedAnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  payload: Record<string, unknown>;
  createdAt: number;
};

export type SessionStartedPayload = {
  sessionId: string;
  platform: string;
  appVersion: string;
  language: string;
};

export type SessionEndedPayload = {
  sessionId: string;
  durationMs: number;
};

export type TeamSelectedPayload = {
  teamId: string;
  gameMode: GameMode;
  startMode: TournamentStartMode;
};

export type TournamentStartedPayload = {
  teamId: string;
  gameMode: GameMode;
  simulationId: string;
};

export type UserPredictionMadePayload = {
  matchId: string;
  stage: TournamentStage;
  teamId: string;
};

export type MatchdayViewedPayload = {
  matchday: string;
  phase: string;
};

export type PhaseReachedPayload = {
  phase: AnalyticsPhase;
  teamId: string;
};

export type UserEliminatedPayload = {
  phase: AnalyticsPhase | string;
  teamId: string;
};

export type TournamentCompletedPayload = {
  teamId: string;
  championId: string | null;
  userQualified: boolean;
  gameMode: GameMode;
};

export type NewGameStartedPayload = {
  previousTeamId: string | null;
  previousChampionId: string | null;
};

export type SavedSimulationOpenedPayload = {
  simulationId: string;
  teamId: string;
};

export type ShareCreatedPayload = {
  shareId: string;
  phase: string;
  teamId: string;
  championId: string | null;
};

export type ShareOpenedPayload = {
  shareId: string;
  source: 'link' | 'deep_link';
};

export type SettingChangedPayload = {
  key: string;
  value: string | boolean | number;
};

export type RestoreFailurePayload = {
  source: 'startup' | 'saved_simulation';
  simulationId?: string;
};

export function stageToAnalyticsPhase(stage: TournamentStage): AnalyticsPhase | null {
  switch (stage) {
    case 'round-of-32':
      return 'round_of_32';
    case 'round-of-16':
      return 'round_of_16';
    case 'quarter-final':
      return 'quarter_final';
    case 'semi-final':
    case 'third-place':
      return 'semi_final';
    case 'final':
      return 'final';
    default:
      return null;
  }
}

export function tournamentPhaseToAnalyticsPhase(
  phase: string,
  stage: TournamentStage,
): AnalyticsPhase | string {
  if (phase === 'champion') {
    return 'champion';
  }

  const mappedStage = stageToAnalyticsPhase(stage);

  if (mappedStage) {
    return mappedStage;
  }

  if (phase === 'not-qualified') {
    return 'group_complete';
  }

  return phase;
}
