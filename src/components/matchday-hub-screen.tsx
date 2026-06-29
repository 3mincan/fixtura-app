import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { shouldShowMatchdayBanner } from '@/ads/ad-policy';
import { maybeShowInterstitial, useAdIntensity } from '@/ads/mobile-ads-provider';
import { showRewardedForAutoReveal } from '@/ads/rewarded-manager';
import { AdBannerSlot } from '@/components/ad-banner-slot';
import { ChampionCelebrationScreen } from '@/components/champion-celebration-screen';
import { MatchdayGameplayBar } from '@/components/matchday-gameplay-bar';
import { KnockoutPredictionForm } from '@/components/knockout-prediction-form';
import { MatchCard } from '@/components/match-card';
import { ThemedText } from '@/components/themed-text';
import { TournamentRoundSummaryScreen } from '@/components/tournament-round-summary-screen';
import { IosButton } from '@/components/ui/ios-button';
import { IosScreen } from '@/components/ui/ios-screen';
import { MatchdayClockHeader } from '@/components/ui/matchday-clock-header';
import { TimelineMatchRow } from '@/components/timeline-match-row';
import { UserMatchFocusScreen } from '@/components/user-match-focus-screen';
import { worldCupGroupFixtures } from '@/data/worldcup-fixtures';
import { teams, teamsById } from '@/data/teams';
import { saveAppSettings } from '@/db/app-settings';
import { useAnimatedMatchdayClock } from '@/hooks/use-animated-matchday-clock';
import { useAiMatchScores } from '@/hooks/use-ai-match-scores';
import { useInstantMatchdayClock } from '@/hooks/use-instant-matchday-clock';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { trackMatchdayViewed } from '@/services/analytics';
import { buildRoundOf32FromFixtures } from '@/simulation/build-round-of-32-from-fixtures';
import { hasAllUserGroupPredictions } from '@/simulation/tournament-journey';
import { previewAllGroupMatchdayResults } from '@/simulation/play-matchday';
import { simulateRandomKnockoutResult } from '@/simulation/simulate-random-knockout-result';
import type { KnockoutRoundResult } from '@/simulation/simulate-knockout-stage';
import { useAppStore } from '@/store/app-store';
import { useGameAudioStore } from '@/store/game-audio-store';
import { useTournamentStore } from '@/store/tournament-store';
import type { AppSettings } from '@/types/app-settings';
import { KNOCKOUT_ROUNDS, type KnockoutRound } from '@/types/knockout';
import type { Match, MatchResult } from '@/types/match';
import {
  formatClockDate,
  formatClockTime,
  getInitialViewMatchday,
  getMatchdayClockStart,
  getTournamentClockStart,
  getUserGroupMatchAwaitingPrediction,
  getUserMatchPredictionFocusClock,
  isGroupTimelineComplete,
  isMatchFinishedAtClock,
  isPendingUserMatchAwaitingPrediction,
} from '@/utils/matchday-clock';
import {
  buildTimelineBoard,
  formatTickerDate,
  formatTickerTime,
  getTimelineFocusEntryRange,
  mergeMatchdayResults,
  stabilizeTimelineBoardEntries,
  getTimelineCenteredScrollOffset,
  getTimelineScrollCompensationDelta,
  type MatchdayBoardEntry,
  TIMELINE_CARD_HEIGHT,
  TIMELINE_ROW_HEIGHT,
} from '@/utils/matchday-board';
import {
  buildRoundOf32BracketView,
  getKnockoutBracketView,
} from '@/utils/knockout-bracket-view';
import {
  computeFinalGroupStandings,
  isTeamQualifiedFromGroupStage,
} from '@/utils/group-standings';
import { selectPeriodScorePredictions } from '@/utils/match-predictions';
import { getNextUserMatch } from '@/utils/user-matches';
import {
  formatUserMatchStageLabel,
  getOpponentPathSummary,
} from '@/utils/user-match-context';
import { Layout } from '@/theme/tokens';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';
import {
  buildKnockoutTimelineStateFromRoundResult,
  buildPendingKnockoutTimelineState,
  fixturesFromRoundResult,
  getKnockoutTimelineUserMatch,
  resolveKnockoutRoundFixtures,
  type KnockoutTimelineState,
} from '@/utils/knockout-timeline';
import { isInstantSimulationSpeed } from '@/utils/normalize-simulation-speed';

type RoundSummaryGate =
  | { kind: 'group' }
  | { kind: 'knockout'; completedRound: KnockoutRound }
  | null;

const KNOCKOUT_SPECTATOR_ROUNDS: KnockoutRound[] = KNOCKOUT_ROUNDS.map(
  (definition) => definition.round,
);

function getKnockoutRoundName(round: KnockoutRound | null | undefined): string {
  if (!round) {
    return '';
  }

  return KNOCKOUT_ROUNDS.find((definition) => definition.round === round)?.name ?? round;
}

function isTimelineComplete(clock: Date, fixtures: Match[], resultMatches: Match[]): boolean {
  const resultById = new Map(resultMatches.map((match) => [match.id, match]));

  return fixtures.every((fixture) => {
    const resultMatch = resultById.get(fixture.id);

    if (!resultMatch?.result?.regulation) {
      return false;
    }

    return isMatchFinishedAtClock(fixture, clock);
  });
}

function getKnockoutTimelineMatchBatchMs(round: KnockoutRound | null | undefined): number | undefined {
  switch (round) {
    case 'round-of-32':
      return 1_200;
    case 'round-of-16':
      return 1_500;
    case 'quarter-final':
      return 2_200;
    case 'semi-final':
      return 3_000;
    case 'third-place':
    case 'final':
      return 5_000;
    default:
      return undefined;
  }
}

function getSelectedTeamEliminationRound(
  selectedTeamId: string,
  roundResults: KnockoutRoundResult[],
): KnockoutRound | null {
  for (const roundResult of roundResults) {
    const selectedTeamMatch = roundResult.matches.find(
      (match) => match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId,
    );

    if (selectedTeamMatch && selectedTeamMatch.winnerTeamId !== selectedTeamId) {
      return roundResult.round;
    }
  }

  return null;
}

export function MatchdayHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const adIntensity = useAdIntensity();
  const showMatchdayBanner = shouldShowMatchdayBanner(adIntensity);
  const simulationSpeed = useAppStore((state) => state.simulationSpeed);
  const aiEnabled = useAppStore((state) => state.aiEnabled);
  const autoReveal = useAppStore((state) => state.autoReveal);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const isInstantSpeed = isInstantSimulationSpeed(simulationSpeed);
  const requireAiScores = isInstantSpeed;
  const selectedTeamId = useTournamentStore((state) => state.selectedTeamId);
  const gameMode = useTournamentStore((state) => state.gameMode);
  const startMode = useTournamentStore((state) => state.startMode);
  const isRandomGame = gameMode === 'random';
  const useOfficialResults = startMode === 'today';
  const tournamentPhase = useTournamentStore((state) => state.tournamentPhase);
  const championId = useTournamentStore((state) => state.championId);
  const pendingUserMatch = useTournamentStore((state) => state.pendingUserMatch);
  const completedMatches = useTournamentStore((state) => state.completedMatches);
  const userPredictions = useTournamentStore((state) => state.userPredictions);
  const knockoutRoundResults = useTournamentStore((state) => state.knockoutRoundResults);
  const roundOf32Fixtures = useTournamentStore((state) => state.roundOf32Fixtures);
  const activeSimulationId = useTournamentStore((state) => state.activeSimulationId);
  const pendingKnockoutFixture = useTournamentStore((state) => state.pendingKnockoutFixture);
  const currentStage = useTournamentStore((state) => state.currentStage);
  const groupStandings = useTournamentStore((state) => state.groupStandings);
  const saveUserPrediction = useTournamentStore((state) => state.saveUserPrediction);
  const saveKnockoutPrediction = useTournamentStore((state) => state.saveKnockoutPrediction);
  const setPendingUserMatch = useTournamentStore((state) => state.setPendingUserMatch);
  const completeRandomGroupStage = useTournamentStore((state) => state.completeRandomGroupStage);
  const refreshGroupStandingsFromPreview = useTournamentStore(
    (state) => state.refreshGroupStandingsFromPreview,
  );
  const beginKnockoutStage = useTournamentStore((state) => state.beginKnockoutStage);

  const [matchdayClock, setMatchdayClock] = useState<Date | null>(null);
  const [roundSummaryGate, setRoundSummaryGate] = useState<RoundSummaryGate>(null);
  const [pendingKnockoutTimelineRounds, setPendingKnockoutTimelineRounds] = useState<
    KnockoutRound[]
  >([]);
  const [knockoutTimeline, setKnockoutTimeline] = useState<KnockoutTimelineState | null>(null);
  const [knockoutSpectatorMode, setKnockoutSpectatorMode] = useState(false);
  const [showEliminationChampion, setShowEliminationChampion] = useState(false);
  const [autoRevealAdPending, setAutoRevealAdPending] = useState(false);

  const persistSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const nextSettings = updateSettings(patch);
      await saveAppSettings(db, pickPersistableAppSettings(nextSettings));
    },
    [db, updateSettings],
  );

  const continueToMainMenu = useCallback(() => {
    void (async () => {
      await maybeShowInterstitial('tournament-end');
      router.replace('/');
    })();
  }, [router]);

  const handleAutoRevealChange = useCallback(
    (value: boolean) => {
      void (async () => {
        if (!value) {
          await persistSettings({ autoReveal: false });
          return;
        }

        setAutoRevealAdPending(true);

        try {
          const rewarded = await showRewardedForAutoReveal();

          if (rewarded) {
            await persistSettings({ autoReveal: true });
          }
        } finally {
          setAutoRevealAdPending(false);
        }
      })();
    },
    [persistSettings],
  );
  const listRef = useRef<FlatList>(null);
  const userIsScrollingRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const matchListHeightRef = useRef(0);
  const listTopPaddingRef = useRef(16);
  const pinnedLiveMatchIdRef = useRef<string | null>(null);
  const pinnedLiveIndexRef = useRef<number | null>(null);
  const groupSummaryTriggeredRef = useRef(false);
  const autoKnockoutMatchIdRef = useRef<string | null>(null);
  const boardEntriesRef = useRef<MatchdayBoardEntry[]>([]);
  const activeSimulationIdRef = useRef<string | null | undefined>(undefined);
  const [matchListHeight, setMatchListHeight] = useState(0);

  useLayoutEffect(() => {
    if (activeSimulationIdRef.current === activeSimulationId) {
      return;
    }

    activeSimulationIdRef.current = activeSimulationId;
    groupSummaryTriggeredRef.current = false;
    autoKnockoutMatchIdRef.current = null;
    pinnedLiveMatchIdRef.current = null;
    pinnedLiveIndexRef.current = null;
    boardEntriesRef.current = [];
    userIsScrollingRef.current = false;
    scrollOffsetRef.current = 0;
    setMatchdayClock(null);
    setRoundSummaryGate(null);
    setPendingKnockoutTimelineRounds([]);
    setKnockoutTimeline(null);
    setKnockoutSpectatorMode(false);
    setShowEliminationChampion(false);
    setAutoRevealAdPending(false);
  }, [activeSimulationId]);

  const nextUserGroupMatch = useMemo(() => {
    if (!selectedTeamId || tournamentPhase !== 'group') {
      return null;
    }

    return getNextUserMatch(selectedTeamId, teams, completedMatches, {
      useOfficialResults,
    });
  }, [selectedTeamId, tournamentPhase, completedMatches, useOfficialResults]);

  useEffect(() => {
    if (!selectedTeamId || tournamentPhase !== 'group' || !nextUserGroupMatch) {
      return;
    }

    if (pendingUserMatch?.id !== nextUserGroupMatch.id) {
      setPendingUserMatch(nextUserGroupMatch);
    }
  }, [
    selectedTeamId,
    tournamentPhase,
    nextUserGroupMatch,
    pendingUserMatch?.id,
    setPendingUserMatch,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!selectedTeamId) {
        return;
      }

      trackMatchdayViewed({
        matchday:
          tournamentPhase === 'group'
            ? getInitialViewMatchday(completedMatches)
            : currentStage,
        phase: tournamentPhase,
      });
    }, [selectedTeamId, tournamentPhase, completedMatches, currentStage]),
  );

  const allGroupMatchesStored = useMemo(() => {
    const completedIds = new Set(completedMatches.map((match) => match.id));

    return worldCupGroupFixtures.every((fixture) => completedIds.has(fixture.id));
  }, [completedMatches]);

  const shouldRunGroupTimeline =
    selectedTeamId !== null &&
    !allGroupMatchesStored &&
    tournamentPhase !== 'not-qualified';

  const aiScores = useAiMatchScores({
    fixtures: worldCupGroupFixtures,
    userTeamId: selectedTeamId,
    completedMatches,
    groupStandings,
    language,
    enabled: shouldRunGroupTimeline,
    useGemini: aiEnabled,
  });

  const previewMatches = useMemo(() => {
    if (!selectedTeamId || !shouldRunGroupTimeline) {
      return [];
    }

    return previewAllGroupMatchdayResults({
      userTeamId: selectedTeamId,
      userPredictions: selectPeriodScorePredictions(userPredictions),
      completedMatches,
      aiScores,
      requireAiScores,
      autoSimulateUserMatches: isRandomGame,
      useOfficialResults,
    });
  }, [selectedTeamId, shouldRunGroupTimeline, userPredictions, completedMatches, aiScores, requireAiScores, isRandomGame, useOfficialResults]);

  const matchdayResultMatches = useMemo(
    () => mergeMatchdayResults(completedMatches, previewMatches),
    [completedMatches, previewMatches],
  );

  const summaryGroupStandings = useMemo(
    () =>
      computeFinalGroupStandings(completedMatches, previewMatches, {
        useOfficialResults,
      }),
    [completedMatches, previewMatches, useOfficialResults],
  );

  const groupTimelineActive =
    shouldRunGroupTimeline &&
    matchdayClock !== null &&
    !isGroupTimelineComplete(matchdayClock, matchdayResultMatches);
  const knockoutTimelineActive =
    knockoutTimeline !== null &&
    matchdayClock !== null &&
    !isTimelineComplete(
      matchdayClock,
      knockoutTimeline.fixtures,
      knockoutTimeline.resultMatches,
    );

  useEffect(() => {
    if (matchdayClock !== null || !selectedTeamId || !shouldRunGroupTimeline) {
      return;
    }

    const clockStart =
      completedMatches.length === 0
        ? getTournamentClockStart()
        : getMatchdayClockStart(getInitialViewMatchday(completedMatches));

    if (clockStart) {
      setMatchdayClock(clockStart);
    }
  }, [selectedTeamId, matchdayClock, completedMatches, shouldRunGroupTimeline]);

  useEffect(() => {
    if (
      !selectedTeamId ||
      !matchdayClock ||
      groupSummaryTriggeredRef.current ||
      roundSummaryGate !== null
    ) {
      return;
    }

    const groupTimelineComplete = isGroupTimelineComplete(
      matchdayClock,
      matchdayResultMatches,
    );
    const allUserPredictionsDone = isRandomGame
      ? groupTimelineComplete
      : hasAllUserGroupPredictions(selectedTeamId, teams, userPredictions, {
          useOfficialResults,
        });

    if (groupTimelineComplete && allUserPredictionsDone) {
      if (isRandomGame) {
        completeRandomGroupStage();
      } else {
        refreshGroupStandingsFromPreview(previewMatches);
      }

      groupSummaryTriggeredRef.current = true;

      void (async () => {
        await maybeShowInterstitial('matchday-end');
        setRoundSummaryGate({ kind: 'group' });
      })();
    }
  }, [
    selectedTeamId,
    matchdayClock,
    matchdayResultMatches,
    userPredictions,
    roundSummaryGate,
    isRandomGame,
    completeRandomGroupStage,
    previewMatches,
    refreshGroupStandingsFromPreview,
    useOfficialResults,
  ]);

  const boardEntries = useMemo(() => {
    if (!selectedTeamId || !matchdayClock) {
      boardEntriesRef.current = [];
      return [];
    }

    let nextEntries: MatchdayBoardEntry[];

    if (knockoutTimeline) {
      nextEntries = buildTimelineBoard({
        userTeamId: selectedTeamId,
        completedMatches: knockoutTimeline.resultMatches,
        clock: matchdayClock,
        clockPhaseActive: true,
        fixtures: knockoutTimeline.fixtures,
      });
    } else if (!groupTimelineActive) {
      boardEntriesRef.current = [];
      return [];
    } else {
      nextEntries = buildTimelineBoard({
        userTeamId: selectedTeamId,
        completedMatches,
        previewMatches,
        clock: matchdayClock,
        clockPhaseActive: true,
      });
    }

    const stableEntries = stabilizeTimelineBoardEntries(boardEntriesRef.current, nextEntries);
    boardEntriesRef.current = stableEntries;

    return stableEntries;
  }, [
    selectedTeamId,
    completedMatches,
    previewMatches,
    matchdayClock,
    groupTimelineActive,
    knockoutTimeline,
  ]);

  const userMatchForPrediction = useMemo(() => {
    if (isRandomGame || !matchdayClock || !selectedTeamId || tournamentPhase !== 'group') {
      return null;
    }

    return getUserGroupMatchAwaitingPrediction(
      selectedTeamId,
      teams,
      matchdayClock,
      userPredictions,
      { useOfficialResults },
    );
  }, [isRandomGame, matchdayClock, selectedTeamId, tournamentPhase, userPredictions, useOfficialResults]);

  const needsUserMatchPrediction = userMatchForPrediction !== null;

  const activeKnockoutUserMatch = useMemo(() => {
    if (!selectedTeamId || tournamentPhase !== 'knockout') {
      return null;
    }

    const timelineUserMatch = getKnockoutTimelineUserMatch(knockoutTimeline, selectedTeamId);

    if (timelineUserMatch) {
      return timelineUserMatch;
    }

    if (pendingUserMatch?.stage !== 'group') {
      return pendingUserMatch;
    }

    return null;
  }, [knockoutTimeline, pendingUserMatch, selectedTeamId, tournamentPhase]);

  const needsKnockoutPrediction = useMemo(() => {
    if (
      isRandomGame ||
      !matchdayClock ||
      !activeKnockoutUserMatch ||
      tournamentPhase !== 'knockout' ||
      !knockoutTimeline ||
      knockoutTimeline.round !== pendingKnockoutFixture?.round
    ) {
      return false;
    }

    return isPendingUserMatchAwaitingPrediction(
      activeKnockoutUserMatch,
      matchdayClock,
      userPredictions,
      { useOfficialResults },
    );
  }, [
    activeKnockoutUserMatch,
    isRandomGame,
    knockoutTimeline,
    matchdayClock,
    pendingKnockoutFixture?.round,
    tournamentPhase,
    userPredictions,
    useOfficialResults,
  ]);

  const isUserTeamPlaying = useMemo(() => {
    if (!selectedTeamId) {
      return false;
    }

    if (needsUserMatchPrediction || needsKnockoutPrediction) {
      return true;
    }

    return boardEntries.some(
      (entry) =>
        entry.isUserMatch &&
        (entry.status === 'live' || entry.status === 'simulating'),
    );
  }, [
    boardEntries,
    needsKnockoutPrediction,
    needsUserMatchPrediction,
    selectedTeamId,
  ]);

  useEffect(() => {
    useGameAudioStore.getState().setMusicScene(isUserTeamPlaying ? 'user-match' : 'none');

    return () => {
      useGameAudioStore.getState().setMusicScene('none');
    };
  }, [isUserTeamPlaying]);

  const clockRunning =
    (groupTimelineActive || knockoutTimelineActive) &&
    matchdayClock !== null &&
    !roundSummaryGate &&
    !needsUserMatchPrediction &&
    !needsKnockoutPrediction;

  useLayoutEffect(() => {
    const focusMatch = needsUserMatchPrediction
      ? userMatchForPrediction
      : needsKnockoutPrediction
        ? activeKnockoutUserMatch
        : null;

    if (!focusMatch || !matchdayClock) {
      return;
    }

    const focusClock = getUserMatchPredictionFocusClock(focusMatch, matchdayClock);

    if (matchdayClock.getTime() !== focusClock.getTime()) {
      setMatchdayClock(focusClock);
    }
  }, [
    matchdayClock,
    activeKnockoutUserMatch,
    needsKnockoutPrediction,
    needsUserMatchPrediction,
    userMatchForPrediction,
  ]);

  const centerTimelineFocus = useCallback((index: number, animated = true) => {
    const viewportHeight = matchListHeightRef.current;

    if (viewportHeight <= 0) {
      return;
    }

    const offset = getTimelineCenteredScrollOffset(
      index,
      listTopPaddingRef.current,
      viewportHeight,
    );

    scrollOffsetRef.current = offset;
    listRef.current?.scrollToOffset({ offset, animated });
  }, []);

  useAnimatedMatchdayClock(
    clockRunning && (!isInstantSpeed || knockoutTimeline !== null),
    simulationSpeed,
    matchdayClock,
    setMatchdayClock,
    undefined,
    {
      fixtures: knockoutTimeline?.fixtures,
      matchBatchDurationMs: getKnockoutTimelineMatchBatchMs(knockoutTimeline?.round),
      userTeamId: groupTimelineActive ? selectedTeamId : null,
      pendingUserMatch: knockoutTimelineActive ? activeKnockoutUserMatch : null,
      userPredictions,
      autoSimulateUserMatches: isRandomGame,
      useOfficialResults,
    },
  );

  useLayoutEffect(() => {
    if (
      !isRandomGame ||
      tournamentPhase !== 'knockout' ||
      !pendingUserMatch ||
      pendingKnockoutTimelineRounds.length > 0 ||
      knockoutTimeline
    ) {
      autoKnockoutMatchIdRef.current = null;
      return;
    }

    if (autoKnockoutMatchIdRef.current === pendingUserMatch.id) {
      return;
    }

    autoKnockoutMatchIdRef.current = pendingUserMatch.id;

    const completedRound = (pendingKnockoutFixture?.round ?? currentStage) as KnockoutRound;

    saveKnockoutPrediction(pendingUserMatch, simulateRandomKnockoutResult(pendingUserMatch));
    setPendingKnockoutTimelineRounds([completedRound]);
  }, [
    currentStage,
    isRandomGame,
    knockoutTimeline,
    pendingKnockoutFixture?.round,
    pendingKnockoutTimelineRounds.length,
    pendingUserMatch,
    saveKnockoutPrediction,
    tournamentPhase,
  ]);

  useEffect(() => {
    if (
      isRandomGame ||
      tournamentPhase !== 'knockout' ||
      !pendingKnockoutFixture ||
      !selectedTeamId ||
      knockoutTimeline ||
      pendingKnockoutTimelineRounds.length > 0 ||
      roundSummaryGate ||
      userPredictions[pendingKnockoutFixture.id]
    ) {
      return;
    }

    setPendingKnockoutTimelineRounds([pendingKnockoutFixture.round]);
  }, [
    isRandomGame,
    tournamentPhase,
    pendingKnockoutFixture,
    selectedTeamId,
    knockoutTimeline,
    pendingKnockoutTimelineRounds.length,
    roundSummaryGate,
    userPredictions,
  ]);

  useEffect(() => {
    if (pendingKnockoutTimelineRounds.length === 0 || knockoutTimeline || !selectedTeamId) {
      return;
    }

    const startRound = pendingKnockoutTimelineRounds[0]!;
    const roundResult = knockoutRoundResults.find((result) => result.round === startRound);
    const roundFixtures = roundResult
      ? fixturesFromRoundResult(roundResult)
      : resolveKnockoutRoundFixtures({
          round: startRound,
          roundOf32Fixtures,
          knockoutRoundResults,
          pendingKnockoutFixture,
        });
    const shouldReplayCompletedRound =
      roundResult !== undefined && pendingKnockoutFixture?.round !== startRound;
    const timeline = shouldReplayCompletedRound
      ? buildKnockoutTimelineStateFromRoundResult(roundResult, roundFixtures)
      : buildPendingKnockoutTimelineState({
          round: startRound,
          roundOf32Fixtures,
          knockoutRoundResults,
          pendingKnockoutFixture,
          selectedTeamId,
          userPredictions,
          seed: activeSimulationId ?? 'knockout-timeline',
        });
    const startIndex = knockoutRoundResults.findIndex((result) => result.round === startRound);
    const completedRoundsFromStart =
      startIndex === -1
        ? []
        : knockoutRoundResults.slice(startIndex).map((result) => result.round);
    const roundsToShow =
      pendingKnockoutTimelineRounds.length === 1
        ? pendingKnockoutFixture?.round === 'final'
          ? completedRoundsFromStart.filter((round) => round !== 'final')
          : pendingKnockoutFixture === null
            ? completedRoundsFromStart
            : pendingKnockoutTimelineRounds
        : pendingKnockoutTimelineRounds;
    const clockStart = getTournamentClockStart(timeline.fixtures);

    setKnockoutTimeline(timeline);
    setPendingKnockoutTimelineRounds(roundsToShow.slice(1));

    if (clockStart) {
      setMatchdayClock(clockStart);
    }
  }, [
    activeSimulationId,
    knockoutRoundResults,
    knockoutTimeline,
    pendingKnockoutFixture,
    pendingKnockoutTimelineRounds,
    roundOf32Fixtures,
    selectedTeamId,
    userPredictions,
  ]);

  useEffect(() => {
    if (!knockoutTimeline || !matchdayClock || roundSummaryGate !== null) {
      return;
    }

    if (
      isTimelineComplete(
        matchdayClock,
        knockoutTimeline.fixtures,
        knockoutTimeline.resultMatches,
      )
    ) {
      void (async () => {
        await maybeShowInterstitial('matchday-end');
        setRoundSummaryGate({ kind: 'knockout', completedRound: knockoutTimeline.round });
      })();
    }
  }, [knockoutTimeline, matchdayClock, roundSummaryGate]);

  useInstantMatchdayClock({
    running: groupTimelineActive && clockRunning && isInstantSpeed && selectedTeamId !== null,
    matchdayClock,
    setMatchdayClock,
    userTeamId: selectedTeamId ?? '',
    pendingUserMatch: nextUserGroupMatch,
    userPredictions,
    completedMatches,
    groupStandings,
    language,
    autoSimulateUserMatches: isRandomGame,
    useOfficialResults,
  });

  const groupBracketView = useMemo(() => {
    if (!selectedTeamId || Object.keys(groupStandings).length === 0) {
      return null;
    }

    return buildRoundOf32BracketView(buildRoundOf32FromFixtures(groupStandings));
  }, [selectedTeamId, groupStandings]);

  const knockoutBracketView = useMemo(
    () =>
      getKnockoutBracketView({
        selectedTeamId,
        teamList: teams,
        userPredictions,
        tournamentPhase,
        knockoutRoundResults,
        championId,
        useOfficialResults,
      }),
    [
      selectedTeamId,
      userPredictions,
      tournamentPhase,
      knockoutRoundResults,
      championId,
      useOfficialResults,
    ],
  );

  const bracketForSummary =
    roundSummaryGate?.kind === 'group' ? groupBracketView : knockoutBracketView;

  const timelineFocusRange = useMemo(() => {
    if (!matchdayClock) {
      return null;
    }

    return getTimelineFocusEntryRange(boardEntries, matchdayClock);
  }, [boardEntries, matchdayClock]);

  const listTopPadding = Math.max(
    16,
    matchListHeight > 0 ? (matchListHeight - TIMELINE_CARD_HEIGHT) / 2 : 16,
  );

  useEffect(() => {
    listTopPaddingRef.current = listTopPadding;
    matchListHeightRef.current = matchListHeight;
  }, [listTopPadding, matchListHeight]);

  useEffect(() => {
    pinnedLiveMatchIdRef.current = null;
    pinnedLiveIndexRef.current = null;
  }, [selectedTeamId]);

  useEffect(() => {
    if (!timelineFocusRange) {
      pinnedLiveMatchIdRef.current = null;
      pinnedLiveIndexRef.current = null;
      return;
    }

    if (userIsScrollingRef.current) {
      return;
    }

    const { centerIndex } = timelineFocusRange;
    const focusMatchId = boardEntries[centerIndex]?.match.id;

    if (!focusMatchId) {
      return;
    }

    const previousMatchId = pinnedLiveMatchIdRef.current;
    const previousIndex = pinnedLiveIndexRef.current;
    const sameFocusMatch = previousMatchId === focusMatchId;
    const scrollDelta =
      previousIndex !== null
        ? getTimelineScrollCompensationDelta(previousIndex, centerIndex, sameFocusMatch)
        : 0;

    if (scrollDelta !== 0) {
      const nextOffset = scrollOffsetRef.current + scrollDelta;
      scrollOffsetRef.current = nextOffset;
      listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
    } else if (!sameFocusMatch) {
      requestAnimationFrame(() => {
        centerTimelineFocus(centerIndex, previousMatchId !== null);
      });
    }

    pinnedLiveMatchIdRef.current = focusMatchId;
    pinnedLiveIndexRef.current = centerIndex;
  }, [boardEntries, centerTimelineFocus, matchListHeight, timelineFocusRange]);

  const tickerDateLabel = matchdayClock
    ? formatClockDate(matchdayClock, language)
    : pendingUserMatch?.scheduledDate
      ? formatTickerDate(pendingUserMatch.scheduledDate)
      : '';

  const tickerTimeLabel = matchdayClock
    ? formatClockTime(matchdayClock)
    : formatTickerTime(pendingUserMatch?.scheduledTime);

  const userMatchStageLabel = useMemo(() => {
    const match = userMatchForPrediction ?? activeKnockoutUserMatch ?? pendingUserMatch;

    if (!match) {
      return '';
    }

    return formatUserMatchStageLabel(match, t);
  }, [activeKnockoutUserMatch, pendingUserMatch, t, userMatchForPrediction]);

  const opponentPathSummary = useMemo(() => {
    const match =
      activeKnockoutUserMatch ??
      (pendingUserMatch && pendingUserMatch.stage !== 'group' ? pendingUserMatch : null);

    if (!match || !selectedTeamId) {
      return null;
    }

    return getOpponentPathSummary({
      match,
      userTeamId: selectedTeamId,
      teamList: teams,
      groupStandings,
      knockoutRoundResults,
      t,
      language,
    });
  }, [
    activeKnockoutUserMatch,
    pendingUserMatch,
    selectedTeamId,
    groupStandings,
    knockoutRoundResults,
    t,
    language,
  ]);

  const handleKnockoutPrediction = (result: MatchResult) => {
    if (!activeKnockoutUserMatch) {
      return;
    }

    const predictedMatch: Match = {
      ...activeKnockoutUserMatch,
      status: 'completed',
      result,
    };

    if (knockoutTimeline) {
      setKnockoutTimeline((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          resultMatches: [
            ...current.resultMatches.filter((match) => match.id !== predictedMatch.id),
            predictedMatch,
          ],
        };
      });
    } else {
      const completedRound = (pendingKnockoutFixture?.round ?? currentStage) as KnockoutRound;
      setPendingKnockoutTimelineRounds([completedRound]);
    }

    saveKnockoutPrediction(activeKnockoutUserMatch, result);
  };

  const keyExtractor = useCallback((entry: MatchdayBoardEntry) => entry.match.id, []);

  const handleTimelineScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const handleMatchListLayout = useCallback((event: LayoutChangeEvent) => {
    setMatchListHeight(event.nativeEvent.layout.height);
  }, []);

  const getMatchItemLayout = useCallback(
    (_: ArrayLike<MatchdayBoardEntry> | null | undefined, index: number) => ({
      length: TIMELINE_ROW_HEIGHT,
      offset: TIMELINE_ROW_HEIGHT * index + listTopPadding,
      index,
    }),
    [listTopPadding],
  );

  const handleScrollBeginDrag = useCallback(() => {
    userIsScrollingRef.current = true;
  }, []);

  const handleScrollEnd = useCallback(() => {
    userIsScrollingRef.current = false;
  }, []);

  const handleScrollToIndexFailed = useCallback(() => {
    if (timelineFocusRange) {
      centerTimelineFocus(timelineFocusRange.centerIndex, false);
    }
  }, [centerTimelineFocus, timelineFocusRange]);

  const renderMatchdayItem = useCallback(
    ({ item: entry }: { item: MatchdayBoardEntry }) => <TimelineMatchRow entry={entry} />,
    [],
  );
  const isWaitingForFinalAfterThirdPlace =
    tournamentPhase === 'knockout' &&
    pendingKnockoutFixture?.round === 'final' &&
    pendingUserMatch !== null &&
    pendingKnockoutTimelineRounds.length === 0 &&
    knockoutTimeline === null;
  const shouldBlockKnockoutScreens =
    (knockoutTimeline !== null || pendingKnockoutTimelineRounds.length > 0) &&
    !isWaitingForFinalAfterThirdPlace;

  if (roundSummaryGate && bracketForSummary && selectedTeamId) {
    const isGroupSummary = roundSummaryGate.kind === 'group';
    const completedKnockoutRound =
      roundSummaryGate.kind === 'knockout' ? roundSummaryGate.completedRound : null;
    const userTeam = teamsById[selectedTeamId];
    const userTeamLabel = `${userTeam.flagEmoji} ${userTeam.name}`;
    const userTeamAdvanced = !isRandomGame && (
      isGroupSummary
        ? isTeamQualifiedFromGroupStage(selectedTeamId, summaryGroupStandings)
        : tournamentPhase === 'knockout' || tournamentPhase === 'champion'
    );
    const showNextRoundButton = isGroupSummary
      ? isRandomGame || userTeamAdvanced
      : pendingKnockoutTimelineRounds.length > 0 || tournamentPhase === 'knockout';
    const roundLabel = isGroupSummary
      ? t('groupStage')
      : getKnockoutRoundName(completedKnockoutRound) || t('knockoutStage');
    const summaryRounds =
      roundSummaryGate.kind === 'knockout'
        ? bracketForSummary.rounds.filter((round) => round.round === completedKnockoutRound)
        : bracketForSummary.rounds;

    let congratsMessage: string | undefined;

    if (userTeamAdvanced) {
      if (tournamentPhase === 'champion') {
        congratsMessage = t('roundCompleteChampion', { team: userTeamLabel });
      } else {
        const nextRoundName = isGroupSummary
          ? getKnockoutRoundName('round-of-32')
          : pendingKnockoutFixture
            ? getKnockoutRoundName(pendingKnockoutFixture.round)
            : '';

        congratsMessage = t('roundCompleteCongrats', {
          team: userTeamLabel,
          round: nextRoundName,
        });
      }
    }

    return (
      <TournamentRoundSummaryScreen
        roundLabel={roundLabel}
        rounds={summaryRounds.map((round) => ({
          roundName: round.roundName,
          matches: round.matches,
        }))}
        userTeamAdvanced={userTeamAdvanced}
        showNextRoundButton={showNextRoundButton}
        congratsMessage={congratsMessage}
        groupStandings={isGroupSummary ? summaryGroupStandings : undefined}
        selectedTeamId={isRandomGame ? null : selectedTeamId}
        championId={null}
        onContinue={() => {
          void (async () => {
            await maybeShowInterstitial('round-summary');

            if (roundSummaryGate.kind === 'group') {
              beginKnockoutStage();
            } else if (
              knockoutSpectatorMode &&
              roundSummaryGate.kind === 'knockout' &&
              roundSummaryGate.completedRound === 'final'
            ) {
              setKnockoutTimeline(null);
              setKnockoutSpectatorMode(false);
              setShowEliminationChampion(true);
            } else {
              setKnockoutTimeline(null);
            }

            setMatchdayClock(null);
            setRoundSummaryGate(null);
          })();
        }}
      />
    );
  }

  if (showEliminationChampion && championId) {
    const selectedTeam = selectedTeamId ? teamsById[selectedTeamId] : null;
    const champion = teamsById[championId];
    const eliminationChampionSubtitle =
      selectedTeam && champion
        ? t('groupEliminationChampionReveal', {
            team: selectedTeam.name,
            champion: `${champion.flagEmoji} ${champion.name}`,
          })
        : t('tournamentSimulatedDescription');

    return (
      <ChampionCelebrationScreen
        teamId={championId}
        audioCue="tournament-end"
        eyebrow={t('tournamentOver')}
        title={t('worldCupChampions')}
        subtitle={eliminationChampionSubtitle}
        continueLabel={t('mainMenu')}
        onContinue={continueToMainMenu}
      />
    );
  }

  if (!shouldBlockKnockoutScreens && tournamentPhase === 'champion' && championId) {
    return (
      <ChampionCelebrationScreen
        teamId={championId}
        audioCue={isRandomGame ? 'tournament-end' : 'won-cup'}
        eyebrow={isRandomGame ? t('tournamentOver') : t('championCelebrationEyebrow')}
        title={t('worldCupChampions')}
        subtitle={isRandomGame ? t('tournamentSimulatedDescription') : t('championSubtitle')}
        continueLabel={t('mainMenu')}
        onContinue={continueToMainMenu}
      />
    );
  }

  if (
    !shouldBlockKnockoutScreens &&
    (tournamentPhase === 'eliminated' || (isRandomGame && tournamentPhase === 'not-qualified')) &&
    championId
  ) {
    const selectedTeam = selectedTeamId ? teamsById[selectedTeamId] : null;
    const eliminationRound = selectedTeamId
      ? getSelectedTeamEliminationRound(selectedTeamId, knockoutRoundResults)
      : null;
    const eliminationRoundName = eliminationRound
      ? getKnockoutRoundName(eliminationRound)
      : t('knockoutStage');
    const eliminationSubtitle =
      !isRandomGame && selectedTeam
        ? t('selectedTeamEliminatedDescription', {
            team: selectedTeam.name,
            round: eliminationRoundName,
          })
        : t('tournamentSimulatedDescription');

    return (
      <ChampionCelebrationScreen
        teamId={championId}
        audioCue="tournament-end"
        eyebrow={t('tournamentOver')}
        title={t('worldCupChampions')}
        subtitle={eliminationSubtitle}
        continueLabel={t('mainMenu')}
        onContinue={continueToMainMenu}
      />
    );
  }

  if (
    !shouldBlockKnockoutScreens &&
    tournamentPhase === 'not-qualified' &&
    !knockoutSpectatorMode
  ) {
    const selectedTeam = selectedTeamId ? teamsById[selectedTeamId] : null;
    const groupEliminationDescription = selectedTeam
      ? t('selectedTeamEliminatedDescription', {
          team: selectedTeam.name,
          round: t('groupStage'),
        })
      : t('groupStageCompleteDescription');

    const handleWatchRestOfTournament = () => {
      setKnockoutSpectatorMode(true);
      setPendingKnockoutTimelineRounds([...KNOCKOUT_SPECTATOR_ROUNDS]);
      setMatchdayClock(null);
    };

    return (
      <IosScreen
        contentStyle={styles.phaseContent}
        trailing={
          <Pressable onPress={() => router.replace('/')} hitSlop={8}>
            <ThemedText type="body" style={{ color: theme.accent }}>
              {t('mainMenu')}
            </ThemedText>
          </Pressable>
        }>
        <View style={[styles.phaseCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="title2">{t('groupStageComplete')}</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            {groupEliminationDescription}
          </ThemedText>
        </View>
        <View style={styles.eliminationActions}>
          <IosButton label={t('watchRestOfTournament')} onPress={handleWatchRestOfTournament} />
          <IosButton
            label={t('revealTournamentChampion')}
            variant="tinted"
            onPress={() => setShowEliminationChampion(true)}
          />
        </View>
      </IosScreen>
    );
  }

  if (
    !shouldBlockKnockoutScreens &&
    tournamentPhase === 'group' &&
    needsUserMatchPrediction &&
    userMatchForPrediction &&
    !isRandomGame
  ) {
    return (
      <IosScreen
        contentStyle={styles.focusContent}
        trailing={
          <Pressable onPress={() => router.replace('/')} hitSlop={8}>
            <ThemedText type="body" style={{ color: theme.accent }}>
              {t('mainMenu')}
            </ThemedText>
          </Pressable>
        }>
        <UserMatchFocusScreen
          match={userMatchForPrediction}
          scheduledDateLabel={tickerDateLabel}
          scheduledTimeLabel={tickerTimeLabel}
          stageLabel={userMatchStageLabel}
          opponentSummary={opponentPathSummary}
          onSubmitPrediction={(homeGoals, awayGoals) => {
            saveUserPrediction(userMatchForPrediction, homeGoals, awayGoals);
          }}
        />
      </IosScreen>
    );
  }

  if (
    tournamentPhase === 'knockout' &&
    needsKnockoutPrediction &&
    activeKnockoutUserMatch &&
    !isRandomGame
  ) {
    return (
      <IosScreen
        contentStyle={styles.focusContent}
        trailing={
          <Pressable onPress={() => router.replace('/')} hitSlop={8}>
            <ThemedText type="body" style={{ color: theme.accent }}>
              {t('mainMenu')}
            </ThemedText>
          </Pressable>
        }>
        <MatchdayClockHeader
          dateLabel={tickerDateLabel}
          timeLabel={tickerTimeLabel}
          stageLabel={userMatchStageLabel}
        />
        <View style={styles.focusBody}>
          <MatchCard
            match={activeKnockoutUserMatch}
            status="your-match"
            homeScore={null}
            awayScore={null}
            isUserMatch
          />
          {opponentPathSummary ? (
            <ThemedText
              type="footnote"
              themeColor="textSecondary"
              style={styles.opponentSummary}>
              {opponentPathSummary}
            </ThemedText>
          ) : null}
          <KnockoutPredictionForm
            match={activeKnockoutUserMatch}
            onSubmit={handleKnockoutPrediction}
          />
        </View>
      </IosScreen>
    );
  }

  return (
    <IosScreen
      contentStyle={styles.hubContent}
      trailing={
        <Pressable onPress={() => router.replace('/')} hitSlop={8}>
          <ThemedText type="body" style={{ color: theme.accent }}>
            {t('mainMenu')}
          </ThemedText>
        </Pressable>
      }>
      {showMatchdayBanner ? <AdBannerSlot placement="matchday" /> : null}
      <MatchdayGameplayBar
        autoReveal={autoReveal}
        autoRevealPending={autoRevealAdPending}
        onAutoRevealChange={handleAutoRevealChange}
      />
      <MatchdayClockHeader dateLabel={tickerDateLabel} timeLabel={tickerTimeLabel} />

      <FlatList
        ref={listRef}
        data={boardEntries}
        keyExtractor={keyExtractor}
        style={styles.matchList}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: listTopPadding,
            paddingBottom: listTopPadding,
            paddingHorizontal: Layout.groupedHorizontal,
          },
        ]}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        scrollEventThrottle={16}
        onScroll={handleTimelineScroll}
        onLayout={handleMatchListLayout}
        getItemLayout={getMatchItemLayout}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        renderItem={renderMatchdayItem}
      />
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  hubContent: {
    flex: 1,
  },
  focusContent: {
    flex: 1,
  },
  focusBody: {
    flex: 1,
    paddingHorizontal: Layout.groupedHorizontal,
    paddingTop: 8,
  },
  opponentSummary: {
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  phaseContent: {
    flex: 1,
    paddingHorizontal: Layout.groupedHorizontal,
    justifyContent: 'center',
    gap: 20,
  },
  phaseCard: {
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  eliminationActions: {
    gap: 12,
  },
  matchList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
});
