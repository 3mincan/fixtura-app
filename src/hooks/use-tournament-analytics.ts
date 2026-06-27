import { useEffect, useRef, type MutableRefObject } from 'react';

import {
  trackElimination,
  trackGroupPhaseComplete,
  trackStageReached,
  trackTournamentCompleted,
  trackUserPredictionMade,
} from '@/services/analytics';
import { useAppStore } from '@/store/app-store';
import { useTournamentStore } from '@/store/tournament-store';
import { isTerminalTournamentPhase } from '@/utils/tournament-phase';

export function useTournamentAnalytics(): void {
  const isAppReady = useAppStore((state) => state.isAppReady);
  const previousPhaseRef = useRef<string | null>(null);
  const previousStageRef = useRef<string | null>(null);
  const previousPredictionCountRef = useRef(0);

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    return useTournamentStore.subscribe((state, previousState) => {
      handlePhaseTransitions(state, previousState, previousPhaseRef, previousStageRef);
      handlePredictions(state, previousState, previousPredictionCountRef);
    });
  }, [isAppReady]);
}

function handlePhaseTransitions(
  state: ReturnType<typeof useTournamentStore.getState>,
  previousState: ReturnType<typeof useTournamentStore.getState>,
  previousPhaseRef: MutableRefObject<string | null>,
  previousStageRef: MutableRefObject<string | null>,
): void {
  if (!state.selectedTeamId) {
    return;
  }

  if (
    previousState.tournamentPhase === 'group' &&
    state.tournamentPhase === 'knockout'
  ) {
    trackGroupPhaseComplete(state.selectedTeamId);
  }

  if (
    state.currentStage !== previousState.currentStage &&
    state.currentStage !== previousStageRef.current
  ) {
    previousStageRef.current = state.currentStage;
    trackStageReached(state.currentStage, state.selectedTeamId);
  }

  if (
    state.tournamentPhase !== previousState.tournamentPhase &&
    isTerminalTournamentPhase(state.tournamentPhase) &&
    previousPhaseRef.current !== state.tournamentPhase
  ) {
    previousPhaseRef.current = state.tournamentPhase;

    if (state.tournamentPhase === 'champion') {
      trackTournamentCompleted({
        teamId: state.selectedTeamId,
        championId: state.championId,
        userQualified: state.userQualified,
        gameMode: state.gameMode,
      });
      return;
    }

    if (state.tournamentPhase === 'eliminated' || state.tournamentPhase === 'not-qualified') {
      trackElimination({
        tournamentPhase: state.tournamentPhase,
        stage: state.currentStage,
        teamId: state.selectedTeamId,
      });
    }
  }
}

function handlePredictions(
  state: ReturnType<typeof useTournamentStore.getState>,
  previousState: ReturnType<typeof useTournamentStore.getState>,
  previousPredictionCountRef: MutableRefObject<number>,
): void {
  if (!state.selectedTeamId) {
    return;
  }

  const previousIds = new Set(Object.keys(previousState.userPredictions));
  const nextIds = Object.keys(state.userPredictions);

  if (nextIds.length <= previousPredictionCountRef.current) {
    previousPredictionCountRef.current = nextIds.length;
    return;
  }

  for (const matchId of nextIds) {
    if (previousIds.has(matchId)) {
      continue;
    }

    trackUserPredictionMade({
      matchId,
      stage: state.currentStage,
      teamId: state.selectedTeamId,
    });
  }

  previousPredictionCountRef.current = nextIds.length;
}
