import type { Match, MatchResult } from '@/types/match';
import type { Standing } from '@/types/standing';

export type CalculateStandingsInput = {
  teamIds: string[];
  matches: Match[];
};

function createEmptyStanding(teamId: string): Standing {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function getRegulationScore(result: MatchResult): { home: number; away: number } {
  return result.regulation;
}

function applyMatchResult(
  standings: Map<string, Standing>,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
): void {
  const homeStanding = standings.get(homeTeamId);
  const awayStanding = standings.get(awayTeamId);

  if (!homeStanding || !awayStanding) {
    return;
  }

  homeStanding.played += 1;
  awayStanding.played += 1;
  homeStanding.goalsFor += homeGoals;
  homeStanding.goalsAgainst += awayGoals;
  awayStanding.goalsFor += awayGoals;
  awayStanding.goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) {
    homeStanding.won += 1;
    homeStanding.points += 3;
    awayStanding.lost += 1;
  } else if (homeGoals < awayGoals) {
    awayStanding.won += 1;
    awayStanding.points += 3;
    homeStanding.lost += 1;
  } else {
    homeStanding.drawn += 1;
    awayStanding.drawn += 1;
    homeStanding.points += 1;
    awayStanding.points += 1;
  }

  homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
  awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;
}

function findHeadToHeadMatch(
  teamAId: string,
  teamBId: string,
  matches: Match[],
): Match | undefined {
  return matches.find(
    (match) =>
      match.status === 'completed' &&
      match.result &&
      ((match.homeTeamId === teamAId && match.awayTeamId === teamBId) ||
        (match.homeTeamId === teamBId && match.awayTeamId === teamAId)),
  );
}

function compareHeadToHead(teamAId: string, teamBId: string, matches: Match[]): number {
  const match = findHeadToHeadMatch(teamAId, teamBId, matches);

  if (!match?.result) {
    return 0;
  }

  const { home, away } = getRegulationScore(match.result);
  const teamAGoals = match.homeTeamId === teamAId ? home : away;
  const teamBGoals = match.homeTeamId === teamBId ? home : away;

  const teamAPoints = teamAGoals > teamBGoals ? 3 : teamAGoals === teamBGoals ? 1 : 0;
  const teamBPoints = teamBGoals > teamAGoals ? 3 : teamAGoals === teamBGoals ? 1 : 0;

  if (teamAPoints !== teamBPoints) {
    return teamBPoints - teamAPoints;
  }

  const teamAGoalDifference = teamAGoals - teamBGoals;
  const teamBGoalDifference = teamBGoals - teamAGoals;

  if (teamAGoalDifference !== teamBGoalDifference) {
    return teamBGoalDifference - teamAGoalDifference;
  }

  if (teamAGoals !== teamBGoals) {
    return teamBGoals - teamAGoals;
  }

  return 0;
}

function compareStandings(teamA: Standing, teamB: Standing, matches: Match[]): number {
  if (teamA.points !== teamB.points) {
    return teamB.points - teamA.points;
  }

  if (teamA.goalDifference !== teamB.goalDifference) {
    return teamB.goalDifference - teamA.goalDifference;
  }

  if (teamA.goalsFor !== teamB.goalsFor) {
    return teamB.goalsFor - teamA.goalsFor;
  }

  const headToHead = compareHeadToHead(teamA.teamId, teamB.teamId, matches);

  if (headToHead !== 0) {
    return headToHead;
  }

  return teamA.teamId.localeCompare(teamB.teamId);
}

export function calculateStandings(input: CalculateStandingsInput): Standing[] {
  const { teamIds, matches } = input;
  const standings = new Map(teamIds.map((teamId) => [teamId, createEmptyStanding(teamId)]));
  const teamIdSet = new Set(teamIds);

  for (const match of matches) {
    if (match.status !== 'completed' || !match.result) {
      continue;
    }

    if (!teamIdSet.has(match.homeTeamId) || !teamIdSet.has(match.awayTeamId)) {
      continue;
    }

    const { home, away } = getRegulationScore(match.result);
    applyMatchResult(standings, match.homeTeamId, match.awayTeamId, home, away);
  }

  return teamIds
    .map((teamId) => standings.get(teamId)!)
    .sort((teamA, teamB) => compareStandings(teamA, teamB, matches));
}
