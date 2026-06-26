import { getTeamsInGroup } from '@/data/groups';
import { teamsById } from '@/data/teams';
import type { AppLanguage } from '@/types/app-settings';
import { KNOCKOUT_ROUNDS, type KnockoutRound } from '@/types/knockout';
import type { Match } from '@/types/match';
import type { Standing } from '@/types/standing';
import type { Team } from '@/types/team';
import type { KnockoutRoundResult } from '@/simulation/simulate-knockout-stage';
import { selectBestThirdPlaceTeams } from '@/simulation/resolve-knockout-placeholders';
import { formatKnockoutMatchScore } from '@/utils/knockout-bracket-view';
import type { TranslationKey } from '@/i18n/translations';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type OpponentPathSummaryInput = {
  match: Match;
  userTeamId: string;
  teamList: Team[];
  groupStandings: Record<string, Standing[]>;
  knockoutRoundResults: KnockoutRoundResult[];
  t: TranslateFn;
  language: AppLanguage;
};

function getOpponentTeamId(match: Match, userTeamId: string): string {
  return match.homeTeamId === userTeamId ? match.awayTeamId : match.homeTeamId;
}

function getPreviousKnockoutRound(round: KnockoutRound): KnockoutRound | null {
  switch (round) {
    case 'round-of-16':
      return 'round-of-32';
    case 'quarter-final':
      return 'round-of-16';
    case 'semi-final':
      return 'quarter-final';
    case 'final':
    case 'third-place':
      return 'semi-final';
    default:
      return null;
  }
}

function getRoundName(round: KnockoutRound): string {
  return KNOCKOUT_ROUNDS.find((definition) => definition.round === round)?.name ?? round;
}

function formatPosition(position: number, language: AppLanguage): string {
  if (language === 'tr' || language === 'de') {
    return `${position}.`;
  }

  if (position === 1) {
    return '1st';
  }

  if (position === 2) {
    return '2nd';
  }

  if (position === 3) {
    return '3rd';
  }

  return `${position}th`;
}

function formatGroupOpponentList(
  groupTeams: Team[],
  opponentTeamId: string,
  language: AppLanguage,
): string {
  const names = groupTeams
    .filter((team) => team.id !== opponentTeamId)
    .map((team) => team.name)
    .sort((teamA, teamB) => teamA.localeCompare(teamB));

  if (names.length === 0) {
    return '';
  }

  if (names.length === 1) {
    return names[0]!;
  }

  if (names.length === 2) {
    if (language === 'tr') {
      return `${names[0]} ve ${names[1]}`;
    }

    if (language === 'de') {
      return `${names[0]} und ${names[1]}`;
    }

    return `${names[0]} and ${names[1]}`;
  }

  const last = names.at(-1)!;
  const rest = names.slice(0, -1).join(', ');

  if (language === 'tr') {
    return `${rest} ve ${last}`;
  }

  if (language === 'de') {
    return `${rest} und ${last}`;
  }

  return `${rest} and ${last}`;
}

function getGroupQualificationSummary(
  opponentTeamId: string,
  input: OpponentPathSummaryInput,
): string | null {
  const opponent = teamsById[opponentTeamId];
  const groupStandings = input.groupStandings[opponent.group];

  if (!groupStandings || groupStandings.length === 0) {
    return null;
  }

  const position = groupStandings.findIndex((standing) => standing.teamId === opponentTeamId) + 1;

  if (position <= 0) {
    return null;
  }

  const groupTeams = getTeamsInGroup(input.teamList, opponent.group);
  const opponents = formatGroupOpponentList(groupTeams, opponentTeamId, input.language);
  if (position === 3) {
    const bestThirdPlaceTeams = selectBestThirdPlaceTeams(input.groupStandings);
    const qualifiedAsBestThird = bestThirdPlaceTeams.some(
      (entry) => entry.teamId === opponentTeamId,
    );

    if (qualifiedAsBestThird) {
      return input.t('opponentBestThirdPlaceSummary', {
        team: opponent.name,
        group: opponent.group,
        opponents,
      });
    }
  }

  return input.t('opponentGroupFinishSummary', {
    team: opponent.name,
    position: formatPosition(position, input.language),
    group: opponent.group,
    opponents,
  });
}

function getPreviousRoundWinSummary(
  opponentTeamId: string,
  currentRound: KnockoutRound,
  input: OpponentPathSummaryInput,
): string | null {
  const previousRound = getPreviousKnockoutRound(currentRound);

  if (!previousRound) {
    return null;
  }

  const roundResult = input.knockoutRoundResults.find((round) => round.round === previousRound);

  if (!roundResult) {
    return null;
  }

  const previousMatch = roundResult.matches.find(
    (match) => match.homeTeamId === opponentTeamId || match.awayTeamId === opponentTeamId,
  );

  if (!previousMatch || previousMatch.winnerTeamId !== opponentTeamId) {
    return null;
  }

  const beatenTeamId =
    previousMatch.homeTeamId === opponentTeamId
      ? previousMatch.awayTeamId
      : previousMatch.homeTeamId;

  return input.t('opponentKnockoutWinSummary', {
    team: teamsById[opponentTeamId].name,
    beaten: teamsById[beatenTeamId].name,
    round: getRoundName(previousRound),
    score: formatKnockoutMatchScore(previousMatch.result),
  });
}

export function formatUserMatchStageLabel(match: Match, t: TranslateFn): string {
  if (match.stage === 'group') {
    return match.round ?? t('groupStage');
  }

  return getRoundName(match.stage as KnockoutRound);
}

export function getOpponentPathSummary(input: OpponentPathSummaryInput): string | null {
  if (input.match.stage === 'group') {
    return null;
  }

  const opponentTeamId = getOpponentTeamId(input.match, input.userTeamId);
  const knockoutRound = input.match.stage as KnockoutRound;

  if (knockoutRound === 'round-of-32') {
    return getGroupQualificationSummary(opponentTeamId, input);
  }

  return getPreviousRoundWinSummary(opponentTeamId, knockoutRound, input);
}
