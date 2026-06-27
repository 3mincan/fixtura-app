import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { createSimulationId } from '@/db/simulation-id';
import type { DatabaseClient } from '@/db/types';
import {
  bindAnalyticsQueue,
  enqueueAnalyticsEvent,
  flushAnalyticsQueue,
} from '@/services/analytics-queue';
import type { GameMode, TournamentStartMode } from '@/store/tournament-store';
import {
  stageToAnalyticsPhase,
  tournamentPhaseToAnalyticsPhase,
  type MatchdayViewedPayload,
  type NewGameStartedPayload,
  type PhaseReachedPayload,
  type SavedSimulationOpenedPayload,
  type SessionEndedPayload,
  type SessionStartedPayload,
  type RestoreFailurePayload,
  type SettingChangedPayload,
  type ShareCreatedPayload,
  type ShareOpenedPayload,
  type TeamSelectedPayload,
  type TournamentCompletedPayload,
  type TournamentStartedPayload,
  type UserEliminatedPayload,
  type UserPredictionMadePayload,
} from '@/types/analytics-events';
import type { TournamentStage } from '@/types/tournament';
import { useAppStore } from '@/store/app-store';

let activeSessionId: string | null = null;
let sessionStartedAtMs: number | null = null;

export function initAnalytics(db: DatabaseClient): void {
  bindAnalyticsQueue(db);
}

export function trackAppOpened(): void {
  enqueueAnalyticsEvent('app_opened');
}

export function trackSessionStarted(): void {
  activeSessionId = createSimulationId();
  sessionStartedAtMs = Date.now();

  const payload: SessionStartedPayload = {
    sessionId: activeSessionId,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    language: useAppStore.getState().language,
  };

  enqueueAnalyticsEvent('session_started', payload);
}

export function trackSessionEnded(): void {
  if (!activeSessionId || sessionStartedAtMs === null) {
    return;
  }

  const payload: SessionEndedPayload = {
    sessionId: activeSessionId,
    durationMs: Math.max(0, Date.now() - sessionStartedAtMs),
  };

  enqueueAnalyticsEvent('session_ended', payload);
  activeSessionId = null;
  sessionStartedAtMs = null;
}

export function trackOnboardingCompleted(): void {
  enqueueAnalyticsEvent('onboarding_completed');
}

export function trackTeamSelected(input: TeamSelectedPayload): void {
  enqueueAnalyticsEvent('team_selected', input);
}

export function trackTournamentStarted(input: TournamentStartedPayload): void {
  enqueueAnalyticsEvent('tournament_started', input);
}

export function trackUserPredictionMade(input: UserPredictionMadePayload): void {
  enqueueAnalyticsEvent('user_prediction_made', input);
}

export function trackMatchdayViewed(input: MatchdayViewedPayload): void {
  enqueueAnalyticsEvent('matchday_viewed', input);
}

export function trackPhaseReached(input: PhaseReachedPayload): void {
  enqueueAnalyticsEvent('phase_reached', input);
}

export function trackUserEliminated(input: UserEliminatedPayload): void {
  enqueueAnalyticsEvent('user_eliminated', input);
}

export function trackTournamentCompleted(input: TournamentCompletedPayload): void {
  enqueueAnalyticsEvent('tournament_completed', input);
}

export function trackNewGameStarted(input: NewGameStartedPayload): void {
  enqueueAnalyticsEvent('new_game_started', input);
}

export function trackSavedSimulationOpened(input: SavedSimulationOpenedPayload): void {
  enqueueAnalyticsEvent('saved_simulation_opened', input);
}

export function trackShareCreated(input: ShareCreatedPayload): void {
  enqueueAnalyticsEvent('share_created', input);
}

export function trackShareOpened(input: ShareOpenedPayload): void {
  enqueueAnalyticsEvent('share_opened', input);
}

export function trackSettingChanged(input: SettingChangedPayload): void {
  enqueueAnalyticsEvent('setting_changed', input);
}

export function trackRestoreFailure(input: RestoreFailurePayload): void {
  enqueueAnalyticsEvent('restore_failure', input);
}

export function trackGroupPhaseComplete(teamId: string): void {
  trackPhaseReached({ phase: 'group_complete', teamId });
}

export function trackStageReached(stage: TournamentStage, teamId: string): void {
  const phase = stageToAnalyticsPhase(stage);

  if (!phase) {
    return;
  }

  trackPhaseReached({ phase, teamId });
}

export function trackElimination(input: {
  tournamentPhase: string;
  stage: TournamentStage;
  teamId: string;
}): void {
  trackUserEliminated({
    phase: tournamentPhaseToAnalyticsPhase(input.tournamentPhase, input.stage),
    teamId: input.teamId,
  });
}

export async function flushAnalytics(db: DatabaseClient): Promise<void> {
  bindAnalyticsQueue(db);
  await flushAnalyticsQueue();
}

export type { GameMode, TournamentStartMode };
