import { groups } from '@/data/groups';
import { teamRatingsById } from '@/data/team-ratings';
import type { KnockoutRoundResult } from '@/simulation/simulate-knockout-stage';
import { simulateTournament } from '@/simulation/simulate-tournament';
import { hasAllUserGroupPredictions } from '@/simulation/tournament-journey';
import type { TournamentJourneyPhase } from '@/simulation/tournament-journey';
import type { KnockoutBracketMatch, KnockoutRound } from '@/types/knockout';
import { KNOCKOUT_ROUNDS } from '@/types/knockout';
import type { MatchResult, UserMatchPrediction } from '@/types/match';
import type { Team, TeamRating } from '@/types/team';
import { selectPeriodScorePredictions } from '@/utils/match-predictions';
import { getUserGroupMatches } from '@/utils/user-matches';

const DEFAULT_KNOCKOUT_BRACKET_SEED = 'knockout-bracket';

export type KnockoutBracketMatchView = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  score: string | null;
  winnerTeamId: string | null;
  scheduledDate?: string;
  scheduledTime?: string;
};

export type KnockoutBracketRoundView = {
  round: KnockoutRound;
  roundName: string;
  matches: KnockoutBracketMatchView[];
};

export type KnockoutBracketView = {
  rounds: KnockoutBracketRoundView[];
  championId: string | null;
};

export type GetKnockoutBracketViewInput = {
  selectedTeamId: string | null;
  teamList: Team[];
  userPredictions?: Record<string, UserMatchPrediction>;
  ratings?: Record<string, TeamRating>;
  seed?: string | number;
  tournamentPhase?: TournamentJourneyPhase;
  knockoutRoundResults?: KnockoutRoundResult[];
  championId?: string | null;
};

function getRoundName(round: KnockoutRound): string {
  return KNOCKOUT_ROUNDS.find((definition) => definition.round === round)?.name ?? round;
}

export function parseKnockoutDisplayScore(
  score: string | null,
): { home: number; away: number } | null {
  if (!score) {
    return null;
  }

  const match = score.match(/^(\d+)\s*-\s*(\d+)/);

  if (!match) {
    return null;
  }

  return {
    home: Number.parseInt(match[1], 10),
    away: Number.parseInt(match[2], 10),
  };
}

export function getKnockoutScoreDetail(score: string | null): string | null {
  if (!score) {
    return null;
  }

  const detail = score.match(/\((.+)\)$/);

  return detail ? detail[1] : null;
}

export function formatKnockoutMatchScore(result: MatchResult): string {
  const homeRegulation = result.regulation.home;
  const awayRegulation = result.regulation.away;

  if (!result.extraTime && !result.penalties) {
    return `${homeRegulation} - ${awayRegulation}`;
  }

  const homeExtra = result.extraTime?.home ?? 0;
  const awayExtra = result.extraTime?.away ?? 0;
  const homeTotal = homeRegulation + homeExtra;
  const awayTotal = awayRegulation + awayExtra;

  if (!result.penalties) {
    return `${homeTotal} - ${awayTotal} (aet)`;
  }

  return `${homeTotal} - ${awayTotal} (${result.penalties.home}-${result.penalties.away} pens)`;
}

export function buildKnockoutBracketViewFromRounds(
  knockoutRoundResults: KnockoutRoundResult[],
  championId: string | null,
): KnockoutBracketView {
  return {
    rounds: knockoutRoundResults.map((roundResult) => ({
      round: roundResult.round,
      roundName: getRoundName(roundResult.round),
      matches: roundResult.matches.map((match) => ({
        id: match.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        score: formatKnockoutMatchScore(match.result),
        winnerTeamId: match.winnerTeamId,
      })),
    })),
    championId,
  };
}

export function buildRoundOf32BracketView(
  fixtures: KnockoutBracketMatch[],
): KnockoutBracketView {
  return {
    rounds: [
      {
        round: 'round-of-32',
        roundName: getRoundName('round-of-32'),
        matches: fixtures.map((fixture) => ({
          id: fixture.id,
          homeTeamId: fixture.homeTeamId!,
          awayTeamId: fixture.awayTeamId!,
          score: null,
          winnerTeamId: null,
          scheduledDate: fixture.scheduledDate,
          scheduledTime: fixture.scheduledTime,
        })),
      },
    ],
    championId: null,
  };
}

export function buildKnockoutBracketView(
  knockoutStage: ReturnType<typeof simulateTournament>['knockoutStage'],
): KnockoutBracketView {
  return buildKnockoutBracketViewFromRounds(
    knockoutStage.rounds,
    knockoutStage.championId,
  );
}

export function getKnockoutBracketView(
  input: GetKnockoutBracketViewInput,
): KnockoutBracketView | null {
  const {
    selectedTeamId,
    teamList,
    userPredictions = {},
    ratings = teamRatingsById,
    seed = DEFAULT_KNOCKOUT_BRACKET_SEED,
    tournamentPhase = 'group',
    knockoutRoundResults = [],
    championId = null,
  } = input;

  if (!selectedTeamId) {
    return null;
  }

  if (
    knockoutRoundResults.length > 0 &&
    ['knockout', 'eliminated', 'champion', 'not-qualified'].includes(tournamentPhase)
  ) {
    return buildKnockoutBracketViewFromRounds(knockoutRoundResults, championId);
  }

  if (!hasAllUserGroupPredictions(selectedTeamId, teamList, userPredictions)) {
    return null;
  }

  const groupUserPredictions = selectPeriodScorePredictions(userPredictions);

  const tournament = simulateTournament({
    teams: teamList,
    groups,
    ratings,
    seed,
    userTeamId: selectedTeamId,
    userPredictions: groupUserPredictions,
  });

  return buildKnockoutBracketView(tournament.knockoutStage);
}
