import { create } from 'zustand';

import { createSimulationId } from '@/db/simulation-id';
import { teamRatingsById } from '@/data/team-ratings';
import { teams } from '@/data/teams';
import {
  getOfficialFixtureResult,
  worldCupGroupFixtures,
} from '@/data/worldcup-fixtures';
import { computeAllGroupStandings } from '@/simulation/compute-group-standings';
import { buildRoundOf32FromFixtures } from '@/simulation/build-round-of-32-from-fixtures';
import type { KnockoutRoundResult } from '@/simulation/simulate-knockout-stage';
import {
  advanceKnockoutJourney,
  knockoutFixtureToMatch,
  startKnockoutJourney,
  type TournamentJourneyPhase,
} from '@/simulation/tournament-journey';
import type { KnockoutBracketMatch } from '@/types/knockout';
import {
  advanceThroughMatchdays,
  isGroupStageComplete,
  simulateFixture,
} from '@/simulation/play-matchday';
import { useAiMatchScoresStore } from '@/store/ai-match-scores-store';
import type { Match, MatchResult, PeriodScore, UserMatchPrediction } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { TournamentStage, TournamentState } from '@/types/tournament';
import { selectPeriodScorePredictions } from '@/utils/match-predictions';
import { getNextUserMatch, getUserGroupMatches, matchInvolvesTeam } from '@/utils/user-matches';
import { mergeMatchdayResults } from '@/utils/matchday-board';

export type GameMode = 'predict' | 'random';
export type TournamentStartMode = 'beginning' | 'today';

export type TournamentProgressState = {
  selectedTeamId: string | null;
  gameMode: GameMode;
  startMode: TournamentStartMode;
  startDate: string | null;
  startTimestamp: string | null;
  activeSimulationId: string | null;
  currentStage: TournamentStage;
  tournamentPhase: TournamentJourneyPhase;
  userQualified: boolean;
  championId: string | null;
  completedMatches: Match[];
  pendingUserMatch: Match | null;
  userPredictions: Record<string, UserMatchPrediction>;
  roundOf32Fixtures: KnockoutBracketMatch[];
  knockoutRoundResults: KnockoutRoundResult[];
  pendingKnockoutFixture: KnockoutBracketMatch | null;
  simulatedRevealMatches: Match[];
  simulatedRevealIndex: number;
  groupStandings: Record<string, Standing[]>;
  tournamentState: TournamentState | null;
};

type TournamentStoreActions = {
  selectTeam: (
    teamId: string,
    options?: { gameMode?: GameMode; startMode?: TournamentStartMode; currentDate?: Date },
  ) => void;
  setTournamentState: (tournamentState: TournamentState) => void;
  setCurrentStage: (currentStage: TournamentStage) => void;
  setPendingUserMatch: (pendingUserMatch: Match | null) => void;
  completeUserMatch: (match: Match) => void;
  completeRandomGroupStage: () => void;
  refreshGroupStandingsFromPreview: (previewMatches: Match[]) => void;
  saveUserPrediction: (match: Match, homeGoals: number, awayGoals: number) => void;
  saveKnockoutPrediction: (match: Match, result: MatchResult) => void;
  beginKnockoutStage: () => void;
  prepareSimulatedReveal: () => void;
  revealNextResult: () => void;
  hydrateFromPersistence: (saved: TournamentProgressState) => void;
  resetTournamentProgress: () => void;
};

export type TournamentStore = TournamentProgressState & TournamentStoreActions;

const initialState: TournamentProgressState = {
  selectedTeamId: null,
  gameMode: 'predict',
  startMode: 'beginning',
  startDate: null,
  startTimestamp: null,
  activeSimulationId: null,
  currentStage: 'group',
  tournamentPhase: 'group',
  userQualified: false,
  championId: null,
  completedMatches: [],
  pendingUserMatch: null,
  userPredictions: {},
  roundOf32Fixtures: [],
  knockoutRoundResults: [],
  pendingKnockoutFixture: null,
  simulatedRevealMatches: [],
  simulatedRevealIndex: 0,
  groupStandings: {},
  tournamentState: null,
};

function getMatchdayRevealMatches(
  playedMatchIds: string[],
  completedMatches: Match[],
  userTeamId: string,
): Match[] {
  return completedMatches.filter(
    (match) => playedMatchIds.includes(match.id) && !matchInvolvesTeam(match, userTeamId),
  );
}

function applyJourneyState(
  journey: ReturnType<typeof startKnockoutJourney>,
): Partial<TournamentProgressState> {
  return {
    tournamentPhase: journey.phase,
    userQualified: journey.userQualified,
    currentStage: journey.currentStage,
    championId: journey.championId,
    roundOf32Fixtures: journey.roundOf32Fixtures,
    knockoutRoundResults: journey.knockoutRoundResults,
    pendingKnockoutFixture: journey.pendingKnockoutFixture,
    pendingUserMatch: journey.pendingKnockoutFixture
      ? knockoutFixtureToMatch(journey.pendingKnockoutFixture)
      : null,
  };
}

function shouldUseOfficialResults(startMode: TournamentStartMode): boolean {
  return startMode === 'today';
}

function getRandomModeKnockoutAnchorTeamId(
  groupStandings: Record<string, Standing[]>,
): string | null {
  const firstFixture = buildRoundOf32FromFixtures(groupStandings)[0];

  return firstFixture?.homeTeamId ?? firstFixture?.awayTeamId ?? null;
}

function formatFixtureDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getCompletedGroupMatchesThroughDate(date: Date): Match[] {
  const cutoffDate = formatFixtureDate(date);

  return worldCupGroupFixtures.flatMap((fixture) => {
    if (!fixture.scheduledDate || fixture.scheduledDate > cutoffDate) {
      return [];
    }

    const officialResult = getOfficialFixtureResult(fixture.id);

    if (officialResult) {
      return [
        {
          ...fixture,
          status: 'completed' as const,
          result: {
            regulation: officialResult,
          },
        },
      ];
    }

    return [simulateFixture(fixture, teamRatingsById, `from-today:${cutoffDate}`)];
  });
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  ...initialState,

  selectTeam: (teamId, options) => {
    const state = get();
    const gameMode = options?.gameMode ?? state.gameMode ?? 'predict';
    const startMode = options?.startMode ?? state.startMode ?? 'beginning';
    const useOfficialResults = shouldUseOfficialResults(startMode);
    const currentDate = options?.currentDate ?? new Date();
    const startDate = startMode === 'today' ? formatFixtureDate(currentDate) : null;
    const startTimestamp = startMode === 'today' ? currentDate.toISOString() : null;
    const completedMatches =
      startMode === 'today' ? getCompletedGroupMatchesThroughDate(currentDate) : [];
    const groupStandings =
      completedMatches.length > 0
        ? computeAllGroupStandings(completedMatches, { useOfficialResults })
        : {};
    const startsAfterCompletedGroupStage =
      completedMatches.length > 0 && isGroupStageComplete(completedMatches);
    const startSelectedTeamId =
      startsAfterCompletedGroupStage && gameMode === 'random'
        ? getRandomModeKnockoutAnchorTeamId(groupStandings) ?? teamId
        : teamId;
    const startJourney = startsAfterCompletedGroupStage
      ? startKnockoutJourney({
          selectedTeamId: startSelectedTeamId,
          teamList: teams,
          userPredictions: {},
          ratings: teamRatingsById,
          completedMatches,
          groupStandings,
          useOfficialResults,
        })
      : null;
    const isTerminalPhase =
      state.tournamentPhase === 'champion' ||
      state.tournamentPhase === 'eliminated' ||
      state.tournamentPhase === 'not-qualified';
    const startsNewTournament =
      options?.startMode !== undefined ||
      (options?.gameMode !== undefined && options.gameMode !== state.gameMode) ||
      state.selectedTeamId !== teamId ||
      isTerminalPhase;

    if (startsNewTournament) {
      const preserveTournamentState =
        state.selectedTeamId === null && state.tournamentState !== null;

      set({
        ...initialState,
        selectedTeamId: startSelectedTeamId,
        gameMode,
        startMode,
        startDate,
        startTimestamp,
        activeSimulationId: createSimulationId(),
        completedMatches,
        pendingUserMatch: getNextUserMatch(startSelectedTeamId, teams, completedMatches, {
          useOfficialResults,
        }),
        groupStandings,
        tournamentState: preserveTournamentState
          ? { ...state.tournamentState!, userTeamId: teamId }
          : null,
        ...(startJourney ? applyJourneyState(startJourney) : {}),
      });
      useAiMatchScoresStore.getState().reset();
      return;
    }

    set({
      selectedTeamId: teamId,
      startMode,
      startDate,
      startTimestamp,
      pendingUserMatch: getNextUserMatch(teamId, teams, state.completedMatches, {
        useOfficialResults,
      }),
    });

    const { tournamentState } = get();

    if (tournamentState) {
      set({
        tournamentState: {
          ...tournamentState,
          userTeamId: teamId,
        },
      });
    }
  },

  setTournamentState: (tournamentState) => {
    set({
      tournamentState,
      currentStage: tournamentState.currentStage,
      selectedTeamId: tournamentState.userTeamId,
    });
  },

  setCurrentStage: (currentStage) => {
    set({ currentStage });

    const { tournamentState } = get();

    if (tournamentState) {
      set({
        tournamentState: {
          ...tournamentState,
          currentStage,
        },
      });
    }
  },

  setPendingUserMatch: (pendingUserMatch) => {
    set({ pendingUserMatch });
  },

  completeUserMatch: (match) => {
    set((state) => ({
      completedMatches: [...state.completedMatches, match],
      pendingUserMatch:
        state.pendingUserMatch?.id === match.id ? null : state.pendingUserMatch,
    }));
  },

  completeRandomGroupStage: () => {
    set((state) => {
      if (!state.selectedTeamId || state.tournamentPhase !== 'group') {
        return state;
      }

      const matchdayProgress = advanceThroughMatchdays({
        fromMatchday: 'Matchday 1',
        completedMatches: state.completedMatches,
        userTeamId: state.selectedTeamId,
        userPredictions: selectPeriodScorePredictions(state.userPredictions),
        userMatchIds: [],
        aiScores: useAiMatchScoresStore.getState().scores,
        autoSimulateUserMatches: true,
        useOfficialResults: shouldUseOfficialResults(state.startMode),
      });

      return {
        completedMatches: matchdayProgress.completedMatches,
        groupStandings: matchdayProgress.groupStandings,
        pendingUserMatch: null,
        simulatedRevealMatches: [],
        simulatedRevealIndex: 0,
      };
    });
  },

  refreshGroupStandingsFromPreview: (previewMatches) => {
    set((state) => ({
      groupStandings: computeAllGroupStandings(
        mergeMatchdayResults(state.completedMatches, previewMatches),
        { useOfficialResults: shouldUseOfficialResults(state.startMode) },
      ),
    }));
  },

  prepareSimulatedReveal: () => {
    const { selectedTeamId, simulatedRevealMatches } = get();

    if (!selectedTeamId || simulatedRevealMatches.length === 0) {
      return;
    }

    set({
      simulatedRevealIndex: 0,
    });
  },

  revealNextResult: () => {
    set((state) => {
      if (state.simulatedRevealIndex >= state.simulatedRevealMatches.length - 1) {
        return state;
      }

      return {
        simulatedRevealIndex: state.simulatedRevealIndex + 1,
      };
    });
  },

  saveUserPrediction: (match, homeGoals, awayGoals) => {
    const prediction: PeriodScore = { home: homeGoals, away: awayGoals };

    set((state) => {
      const userPredictions = {
        ...state.userPredictions,
        [match.id]: prediction,
      };
      const { selectedTeamId, tournamentPhase } = state;

      if (!selectedTeamId) {
        return state;
      }

      if (tournamentPhase === 'group') {
        const groupUserPredictions = selectPeriodScorePredictions(userPredictions);
        const matchday = match.round;

        if (!matchday) {
          throw new Error(`Group match ${match.id} is missing a matchday`);
        }

        const userMatchIds = getUserGroupMatches(selectedTeamId, teams).map(
          (userMatch) => userMatch.id,
        );
        const matchdayProgress = advanceThroughMatchdays({
          fromMatchday: matchday,
          completedMatches: state.completedMatches,
          userTeamId: selectedTeamId,
          userPredictions: groupUserPredictions,
          userMatchIds,
          aiScores: useAiMatchScoresStore.getState().scores,
          useOfficialResults: shouldUseOfficialResults(state.startMode),
        });

        return {
          completedMatches: matchdayProgress.completedMatches,
          userPredictions,
          groupStandings: matchdayProgress.groupStandings,
          simulatedRevealMatches: getMatchdayRevealMatches(
            matchdayProgress.playedMatchIds,
            matchdayProgress.completedMatches,
            selectedTeamId,
          ),
          simulatedRevealIndex: 0,
          pendingUserMatch: getNextUserMatch(
            selectedTeamId,
            teams,
            matchdayProgress.completedMatches,
            { useOfficialResults: shouldUseOfficialResults(state.startMode) },
          ),
        };
      }

      return state;
    });
  },

  saveKnockoutPrediction: (match, result) => {
    set((state) => {
      const userPredictions = {
        ...state.userPredictions,
        [match.id]: result,
      };
      const { selectedTeamId, tournamentPhase } = state;

      if (
        !selectedTeamId ||
        tournamentPhase !== 'knockout' ||
        !state.pendingKnockoutFixture ||
        match.id !== state.pendingKnockoutFixture.id
      ) {
        return state;
      }

      const predictedMatch: Match = {
        ...match,
        status: 'completed',
        result,
      };
      const completedMatches = [...state.completedMatches, predictedMatch];
      const journey = advanceKnockoutJourney({
        selectedTeamId,
        teamList: teams,
        userPredictions,
        ratings: teamRatingsById,
        roundOf32Fixtures: state.roundOf32Fixtures,
        knockoutRoundResults: state.knockoutRoundResults,
        pendingKnockoutFixture: state.pendingKnockoutFixture,
      });

      return {
        completedMatches,
        userPredictions,
        ...applyJourneyState(journey),
      };
    });
  },

  beginKnockoutStage: () => {
    const state = get();

    if (!state.selectedTeamId) {
      return;
    }

    const selectedTeamId =
      state.gameMode === 'random'
        ? getRandomModeKnockoutAnchorTeamId(state.groupStandings) ?? state.selectedTeamId
        : state.selectedTeamId;

    const journey = startKnockoutJourney({
      selectedTeamId,
      teamList: teams,
      userPredictions: state.userPredictions,
      ratings: teamRatingsById,
      completedMatches: state.completedMatches,
      groupStandings: state.groupStandings,
      useOfficialResults: shouldUseOfficialResults(state.startMode),
    });

    set({
      selectedTeamId,
      ...applyJourneyState(journey),
    });
  },

  hydrateFromPersistence: (saved) => {
    const startMode = saved.startMode ?? 'beginning';

    set({
      selectedTeamId: saved.selectedTeamId,
      gameMode: saved.gameMode ?? 'predict',
      startMode,
      startDate: saved.startDate ?? (startMode === 'today' ? formatFixtureDate(new Date()) : null),
      startTimestamp:
        saved.startTimestamp ?? (startMode === 'today' ? new Date().toISOString() : null),
      activeSimulationId: saved.activeSimulationId,
      currentStage: saved.currentStage,
      tournamentPhase: saved.tournamentPhase,
      userQualified: saved.userQualified,
      championId: saved.championId,
      completedMatches: saved.completedMatches,
      pendingUserMatch:
        saved.tournamentPhase === 'group'
          ? getNextUserMatch(saved.selectedTeamId, teams, saved.completedMatches, {
              useOfficialResults: shouldUseOfficialResults(startMode),
            })
          : saved.pendingUserMatch,
      userPredictions: saved.userPredictions,
      roundOf32Fixtures: saved.roundOf32Fixtures,
      knockoutRoundResults: saved.knockoutRoundResults,
      pendingKnockoutFixture: saved.pendingKnockoutFixture,
      simulatedRevealMatches: saved.simulatedRevealMatches,
      simulatedRevealIndex: saved.simulatedRevealIndex,
      groupStandings: saved.groupStandings,
      tournamentState: saved.tournamentState,
    });
  },

  resetTournamentProgress: () => {
    useAiMatchScoresStore.getState().reset();
    set(initialState);
  },
}));
