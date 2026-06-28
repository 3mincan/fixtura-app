import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import type { AppLanguage } from '@/types/app-settings';
import type { Match, PeriodScore, UserMatchPrediction } from '@/types/match';
import type { Standing } from '@/types/standing';
import { getOfficialFixtureResult, worldCupGroupFixtures } from '@/data/worldcup-fixtures';
import { teamRatingsById } from '@/data/team-ratings';
import { simulateFixture } from '@/simulation/play-matchday';
import { useAiMatchScoresStore } from '@/store/ai-match-scores-store';
import {
  advanceMatchdayClock,
  capClockForUserGroupMatches,
  CLOCK_ADVANCE_MATCH_BATCH_MINUTES,
  getClockAdvanceBatchMinutes,
  getMatchEndTime,
  getUserGroupMatchAwaitingPrediction,
  getUserMatchPredictionFocusClock,
  INSTANT_IDLE_STEP_MS,
  INSTANT_REVEAL_ANIMATION_MS,
  isAnyUserGroupMatchAwaitingPrediction,
  isMatchInProgressAtClock,
} from '@/utils/matchday-clock';
import { teams } from '@/data/teams';
import { ensureAiMatchScoresForFixtures, hasAiScoreForFixture } from '@/utils/ensure-ai-match-scores';
import {
  buildLiveScoreClockEvents,
  getNextLiveScoreClockEvents,
  INSTANT_GOAL_STEP_MS,
} from '@/utils/live-score-progress';
import { isPeriodScorePrediction } from '@/utils/match-predictions';
import { matchInvolvesTeam } from '@/utils/user-matches';

type UseInstantMatchdayClockInput = {
  running: boolean;
  matchdayClock: Date | null;
  setMatchdayClock: Dispatch<SetStateAction<Date | null>>;
  userTeamId: string;
  pendingUserMatch: Match | null;
  userPredictions: Record<string, UserMatchPrediction>;
  completedMatches: Match[];
  groupStandings: Record<string, Standing[]>;
  language: AppLanguage;
  fixtures?: Match[];
  autoSimulateUserMatches?: boolean;
  useGemini?: boolean;
};

function getInProgressFixtures(clock: Date, fixtures: Match[]): Match[] {
  return fixtures.filter((fixture) => isMatchInProgressAtClock(fixture, clock));
}

function getSimulatableInProgressFixtures(
  clock: Date,
  fixtures: Match[],
  userTeamId: string,
  userPredictions: Record<string, UserMatchPrediction>,
  autoSimulateUserMatches: boolean,
): Match[] {
  return getInProgressFixtures(clock, fixtures).filter((fixture) => {
    if (!matchInvolvesTeam(fixture, userTeamId)) {
      return true;
    }

    if (userPredictions[fixture.id]) {
      return true;
    }

    if (getOfficialFixtureResult(fixture.id)) {
      return true;
    }

    return autoSimulateUserMatches;
  });
}

function getInstantMatchBatchEnd(
  clock: Date,
  fixtures: Match[],
  userTeamId: string,
  userPredictions: Record<string, UserMatchPrediction>,
  autoSimulateUserMatches: boolean,
  pendingUserMatch: Match | null,
): Date {
  if (
    !autoSimulateUserMatches &&
    isAnyUserGroupMatchAwaitingPrediction(
      userTeamId,
      teams,
      clock,
      userPredictions,
    )
  ) {
    return clock;
  }

  const inProgressFixtures = getSimulatableInProgressFixtures(
    clock,
    fixtures,
    userTeamId,
    userPredictions,
    autoSimulateUserMatches,
  );

  let nextClock: Date;

  if (inProgressFixtures.length === 0) {
    const batchMinutes = getClockAdvanceBatchMinutes({ clock, fixtures });

    nextClock = advanceMatchdayClock(clock, batchMinutes);
  } else {
    const endTimes = inProgressFixtures
      .map(getMatchEndTime)
      .filter((endTime): endTime is Date => endTime !== null)
      .map((endTime) => endTime.getTime());

    nextClock = new Date(Math.max(...endTimes));
  }

  return capClockForUserGroupMatches(
    clock,
    nextClock,
    userTeamId,
    teams,
    userPredictions,
    autoSimulateUserMatches,
  );
}

function getKnownFixtureScore(
  fixture: Match,
  userTeamId: string,
  userPredictions: Record<string, UserMatchPrediction>,
  autoSimulateUserMatches: boolean,
): PeriodScore | null {
  if (matchInvolvesTeam(fixture, userTeamId)) {
    const prediction = userPredictions[fixture.id];

    if (isPeriodScorePrediction(prediction)) {
      return prediction;
    }

    const officialResult = getOfficialFixtureResult(fixture.id);

    if (officialResult) {
      return officialResult;
    }

    if (autoSimulateUserMatches) {
      const simulated = simulateFixture(fixture, teamRatingsById, `instant:${fixture.id}`);

      return simulated.result?.regulation ?? null;
    }

    return null;
  }

  return useAiMatchScoresStore.getState().scores[fixture.id] ?? null;
}

function advanceClockTo(
  time: Date,
  setMatchdayClock: Dispatch<SetStateAction<Date | null>>,
  clockRef: { current: Date | null },
  userTeamId: string,
  userPredictions: Record<string, UserMatchPrediction>,
  autoSimulateUserMatches: boolean,
) {
  const currentClock = clockRef.current ?? time;
  const nextClock = capClockForUserGroupMatches(
    currentClock,
    time,
    userTeamId,
    teams,
    userPredictions,
    autoSimulateUserMatches,
  );

  setMatchdayClock(nextClock);
  clockRef.current = nextClock;
}

export function useInstantMatchdayClock({
  running,
  matchdayClock,
  setMatchdayClock,
  userTeamId,
  pendingUserMatch,
  userPredictions,
  completedMatches,
  groupStandings,
  language,
  fixtures = worldCupGroupFixtures,
  autoSimulateUserMatches = false,
  useGemini = true,
}: UseInstantMatchdayClockInput) {
  const clockRef = useRef(matchdayClock);

  useEffect(() => {
    clockRef.current = matchdayClock;
  }, [matchdayClock]);

  useEffect(() => {
    if (!running) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delayMs: number, callback: () => void | Promise<void>) => {
      timer = setTimeout(() => {
        if (cancelled) {
          return;
        }

        void callback();
      }, delayMs);
    };

    const playLiveScoreAnimation = (
      currentClock: Date,
      inProgressFixtures: Match[],
      onComplete: () => void,
    ) => {
      const finalScores = new Map<string, { home: number; away: number }>();

      for (const fixture of inProgressFixtures) {
        const score = getKnownFixtureScore(
          fixture,
          userTeamId,
          userPredictions,
          autoSimulateUserMatches,
        );

        if (score) {
          finalScores.set(fixture.id, score);
        }
      }

      const upcomingEvents = getNextLiveScoreClockEvents(
        buildLiveScoreClockEvents(inProgressFixtures, finalScores, getMatchEndTime),
        currentClock,
      );

      if (upcomingEvents.length === 0) {
        onComplete();
        return;
      }

      let eventIndex = 0;

      const playNextEvent = () => {
        if (cancelled) {
          return;
        }

        const liveClock = clockRef.current;

        if (
          liveClock &&
          !autoSimulateUserMatches &&
          isAnyUserGroupMatchAwaitingPrediction(
            userTeamId,
            teams,
            liveClock,
            userPredictions,
          )
        ) {
          const awaitingMatch = getUserGroupMatchAwaitingPrediction(
            userTeamId,
            teams,
            liveClock,
            userPredictions,
          );

          if (awaitingMatch) {
            advanceClockTo(
              getUserMatchPredictionFocusClock(awaitingMatch, liveClock),
              setMatchdayClock,
              clockRef,
              userTeamId,
              userPredictions,
              autoSimulateUserMatches,
            );
          }

          return;
        }

        const event = upcomingEvents[eventIndex];

        if (!event) {
          onComplete();
          return;
        }

        eventIndex += 1;
        advanceClockTo(
          event.time,
          setMatchdayClock,
          clockRef,
          userTeamId,
          userPredictions,
          autoSimulateUserMatches,
        );

        const delayMs =
          event.kind === 'full-time' ? INSTANT_REVEAL_ANIMATION_MS : INSTANT_GOAL_STEP_MS;

        schedule(delayMs, playNextEvent);
      };

      schedule(INSTANT_GOAL_STEP_MS, playNextEvent);
    };

    const runStep = async () => {
      if (cancelled) {
        return;
      }

      const clock = clockRef.current;

      if (!clock) {
        return;
      }

      if (
        !autoSimulateUserMatches &&
        isAnyUserGroupMatchAwaitingPrediction(
          userTeamId,
          teams,
          clock,
          userPredictions,
        )
      ) {
        const awaitingMatch = getUserGroupMatchAwaitingPrediction(
          userTeamId,
          teams,
          clock,
          userPredictions,
        );

        if (awaitingMatch) {
          advanceClockTo(
            getUserMatchPredictionFocusClock(awaitingMatch, clock),
            setMatchdayClock,
            clockRef,
            userTeamId,
            userPredictions,
            autoSimulateUserMatches,
          );
        }

        return;
      }

      const completedMatchIds = new Set(completedMatches.map((match) => match.id));
      const inProgressFixtures = getSimulatableInProgressFixtures(
        clock,
        fixtures,
        userTeamId,
        userPredictions,
        autoSimulateUserMatches,
      );
      const isMatchBatch =
        inProgressFixtures.length > 0 ||
        getClockAdvanceBatchMinutes({ clock, fixtures }) === CLOCK_ADVANCE_MATCH_BATCH_MINUTES;

      if (isMatchBatch && inProgressFixtures.length > 0) {
        const missingScores = inProgressFixtures.some(
          (fixture) =>
            !hasAiScoreForFixture(
              fixture,
              userTeamId,
              userPredictions,
              completedMatchIds,
              autoSimulateUserMatches,
            ),
        );

        if (missingScores) {
          await ensureAiMatchScoresForFixtures({
            fixtures: inProgressFixtures,
            userTeamId,
            completedMatchIds,
            completedMatches,
            groupStandings,
            language,
            useGemini,
          });

          if (cancelled) {
            return;
          }

          const stillMissing = inProgressFixtures.some(
            (fixture) =>
              !hasAiScoreForFixture(
                fixture,
                userTeamId,
                userPredictions,
                completedMatchIds,
                autoSimulateUserMatches,
              ),
          );

          if (stillMissing) {
            schedule(80, runStep);
            return;
          }
        }

        playLiveScoreAnimation(clock, inProgressFixtures, () => {
          if (cancelled) {
            return;
          }

          runStep();
        });

        return;
      }

      schedule(isMatchBatch ? INSTANT_REVEAL_ANIMATION_MS : INSTANT_IDLE_STEP_MS, () => {
        const currentClock = clockRef.current;

        if (!currentClock || cancelled) {
          return;
        }

        const nextClock = getInstantMatchBatchEnd(
          currentClock,
          fixtures,
          userTeamId,
          userPredictions,
          autoSimulateUserMatches,
          pendingUserMatch,
        );

        advanceClockTo(
          nextClock,
          setMatchdayClock,
          clockRef,
          userTeamId,
          userPredictions,
          autoSimulateUserMatches,
        );
        runStep();
      });
    };

    runStep();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    completedMatches,
    fixtures,
    groupStandings,
    language,
    pendingUserMatch,
    running,
    setMatchdayClock,
    userPredictions,
    userTeamId,
    autoSimulateUserMatches,
    useGemini,
  ]);
}
