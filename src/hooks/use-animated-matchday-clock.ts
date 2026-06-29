import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import type { SimulationSpeed } from '@/types/app-settings';
import {
  advanceMatchdayClock,
  capClockAtPendingUserMatchKickoff,
  capClockForUserGroupMatches,
  getClockAdvanceBatchMinutes,
  getClockDisplayStepMinutes,
  getClockSubTickIntervalMs,
  getUserGroupMatchAwaitingPrediction,
  getUserMatchPredictionFocusClock,
  isAnyUserGroupMatchAwaitingPrediction,
  isPendingUserMatchAwaitingPrediction,
} from '@/utils/matchday-clock';
import { teams } from '@/data/teams';
import type { Match, UserMatchPrediction } from '@/types/match';

type AnimatedMatchdayClockOptions = {
  fixtures?: Match[];
  matchBatchDurationMs?: number;
  userTeamId?: string | null;
  pendingUserMatch?: Match | null;
  userPredictions?: Record<string, UserMatchPrediction>;
  autoSimulateUserMatches?: boolean;
  useOfficialResults?: boolean;
};

export function shouldPauseForPendingTimelinePrediction(input: {
  pendingUserMatch: Match | null;
  clock: Date | null;
  userPredictions: Record<string, UserMatchPrediction>;
  autoSimulateUserMatches: boolean;
  useOfficialResults?: boolean;
}): boolean {
  if (input.autoSimulateUserMatches) {
    return false;
  }

  return isPendingUserMatchAwaitingPrediction(
    input.pendingUserMatch,
    input.clock,
    input.userPredictions,
    { useOfficialResults: input.useOfficialResults },
  );
}

export function capClockAtPendingTimelinePrediction(input: {
  currentClock: Date;
  proposedClock: Date;
  pendingUserMatch: Match | null;
  userPredictions: Record<string, UserMatchPrediction>;
  autoSimulateUserMatches: boolean;
  useOfficialResults?: boolean;
}): Date {
  if (input.autoSimulateUserMatches) {
    return input.proposedClock;
  }

  return capClockAtPendingUserMatchKickoff(
    input.currentClock,
    input.proposedClock,
    input.pendingUserMatch,
    input.userPredictions,
    { useOfficialResults: input.useOfficialResults },
  );
}

export function useAnimatedMatchdayClock(
  running: boolean,
  speed: SimulationSpeed,
  matchdayClock: Date | null,
  setMatchdayClock: Dispatch<SetStateAction<Date | null>>,
  onTick?: (stepMinutes: number) => void,
  options: AnimatedMatchdayClockOptions = {},
) {
  const clockRef = useRef(matchdayClock);
  const fixtures = options.fixtures;
  const matchBatchDurationMs = options.matchBatchDurationMs;
  const userTeamId = options.userTeamId ?? null;
  const pendingUserMatch = options.pendingUserMatch ?? null;
  const userPredictions = useMemo(
    () => options.userPredictions ?? {},
    [options.userPredictions],
  );
  const autoSimulateUserMatches = options.autoSimulateUserMatches ?? false;
  const useOfficialResults = options.useOfficialResults ?? true;

  useEffect(() => {
    clockRef.current = matchdayClock;
  }, [matchdayClock]);

  useEffect(() => {
    if (!running) {
      return;
    }

    let cancelled = false;
    let subTimer: ReturnType<typeof setTimeout> | undefined;

    const runNextBatch = () => {
      if (cancelled) {
        return;
      }

      const clock = clockRef.current;

      if (!clock) {
        return;
      }

      const batchMinutes = getClockAdvanceBatchMinutes({ clock, fixtures });
      const stepMinutes = getClockDisplayStepMinutes(batchMinutes);
      const subStepMs = getClockSubTickIntervalMs(speed, batchMinutes, {
        matchBatchDurationMs,
      });
      let advancedMinutes = 0;

      const runSubStep = () => {
        if (cancelled) {
          return;
        }

        const currentClock = clockRef.current;

        const awaitingGroup =
          userTeamId &&
          currentClock &&
          isAnyUserGroupMatchAwaitingPrediction(
            userTeamId,
            teams,
            currentClock,
            userPredictions,
            autoSimulateUserMatches,
            { useOfficialResults },
          );
        const awaitingKnockout =
          pendingUserMatch &&
          currentClock &&
          shouldPauseForPendingTimelinePrediction({
            pendingUserMatch,
            clock: currentClock,
            userPredictions,
            autoSimulateUserMatches,
            useOfficialResults,
          });

        if (awaitingGroup || awaitingKnockout) {
          const focusMatch = awaitingGroup
            ? getUserGroupMatchAwaitingPrediction(
                userTeamId!,
                teams,
                currentClock!,
                userPredictions,
                { useOfficialResults },
              )
            : pendingUserMatch;

          if (focusMatch && currentClock) {
            setMatchdayClock((current) => {
              if (!current) {
                return null;
              }

              const focusClock = getUserMatchPredictionFocusClock(focusMatch, current);
              let next = focusClock;

              if (userTeamId) {
                next = capClockForUserGroupMatches(
                  current,
                  next,
                  userTeamId,
                  teams,
                  userPredictions,
                  autoSimulateUserMatches,
                  { useOfficialResults },
                );
              }

              next = capClockAtPendingTimelinePrediction({
                currentClock: current,
                proposedClock: next,
                pendingUserMatch,
                userPredictions,
                autoSimulateUserMatches,
                useOfficialResults,
              });

              clockRef.current = next;

              return next;
            });
          }

          return;
        }

        if (advancedMinutes >= batchMinutes) {
          runNextBatch();
          return;
        }

        const nextStepMinutes = Math.min(stepMinutes, batchMinutes - advancedMinutes);
        advancedMinutes += nextStepMinutes;
        setMatchdayClock((current) => {
          if (!current) {
            clockRef.current = null;
            return null;
          }

          const proposed = advanceMatchdayClock(current, nextStepMinutes);
          let next = proposed;

          if (userTeamId !== null) {
            next = capClockForUserGroupMatches(
              current,
              next,
              userTeamId,
              teams,
              userPredictions,
              autoSimulateUserMatches,
              { useOfficialResults },
            );
          }

          next = capClockAtPendingTimelinePrediction({
            currentClock: current,
            proposedClock: next,
            pendingUserMatch,
            userPredictions,
            autoSimulateUserMatches,
            useOfficialResults,
          });

          clockRef.current = next;

          return next;
        });
        onTick?.(nextStepMinutes);
        subTimer = setTimeout(runSubStep, subStepMs);
      };

      runSubStep();
    };

    runNextBatch();

    return () => {
      cancelled = true;

      if (subTimer) {
        clearTimeout(subTimer);
      }
    };
  }, [
    fixtures,
    matchBatchDurationMs,
    onTick,
    autoSimulateUserMatches,
    pendingUserMatch,
    userTeamId,
    running,
    setMatchdayClock,
    speed,
    userPredictions,
    useOfficialResults,
  ]);
}
