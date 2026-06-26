import fixturesJson from '../../fixtures.json';
import worldCupTeamsJson from '../../worldcup.teams.json';

import { buildTeamNameLookup, resolveTeamName } from '@/data/resolve-team-name';
import type { WorldCupTeamSource } from '@/data/worldcup-team-source';
import type { Match, PeriodScore } from '@/types/match';

export type FixtureSourceFile = {
  name: string;
  matches: FixtureSourceMatch[];
};

export type FixtureSourceScore = {
  ft: [number, number];
  ht?: [number, number];
};

export type FixtureSourceMatch = {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  num?: number;
  score?: FixtureSourceScore;
};

const teamNameLookup = buildTeamNameLookup(worldCupTeamsJson as WorldCupTeamSource[]);

function parseGroupId(group: string): string {
  return group.replace(/^Group\s+/i, '');
}

function createGroupMatchId(
  groupId: string,
  homeTeamId: string,
  awayTeamId: string,
): string {
  return `group-${groupId}-${homeTeamId}-${awayTeamId}`;
}

function createFixtureSortKey(date: string, time: string): string {
  const kickoff = time.split(' ')[0] ?? '00:00';
  return `${date}T${kickoff}`;
}

function mapSourceScoreToPeriodScore(score: FixtureSourceScore): PeriodScore {
  return {
    home: score.ft[0],
    away: score.ft[1],
  };
}

function buildOfficialGroupFixtureResults(
  sources: Array<FixtureSourceMatch & { group: string }>,
): Record<string, PeriodScore> {
  const results: Record<string, PeriodScore> = {};

  for (const source of sources) {
    if (!source.score) {
      continue;
    }

    const groupId = parseGroupId(source.group);
    const homeTeamId = resolveTeamName(teamNameLookup, source.team1);
    const awayTeamId = resolveTeamName(teamNameLookup, source.team2);
    const matchId = createGroupMatchId(groupId, homeTeamId, awayTeamId);

    results[matchId] = mapSourceScoreToPeriodScore(source.score);
  }

  return results;
}

function mapGroupFixture(source: FixtureSourceMatch): Match {
  if (!source.group) {
    throw new Error(`Expected group fixture but round is ${source.round}`);
  }

  const groupId = parseGroupId(source.group);
  const homeTeamId = resolveTeamName(teamNameLookup, source.team1);
  const awayTeamId = resolveTeamName(teamNameLookup, source.team2);

  return {
    id: createGroupMatchId(groupId, homeTeamId, awayTeamId),
    stage: 'group',
    homeTeamId,
    awayTeamId,
    status: 'scheduled',
    groupId,
    round: source.round,
    scheduledDate: source.date,
    scheduledTime: source.time,
    ground: source.ground,
  };
}

const groupFixtureSources = (fixturesJson as FixtureSourceFile).matches.filter(
  (match): match is FixtureSourceMatch & { group: string } => Boolean(match.group),
);

const officialGroupFixtureResults: Record<string, PeriodScore> =
  buildOfficialGroupFixtureResults(groupFixtureSources);

function loadWorldCupGroupFixtures(): Match[] {
  return groupFixtureSources
    .map(mapGroupFixture)
    .sort((matchA, matchB) =>
      createFixtureSortKey(matchA.scheduledDate!, matchA.scheduledTime!).localeCompare(
        createFixtureSortKey(matchB.scheduledDate!, matchB.scheduledTime!),
      ),
    );
}

export const worldCupGroupFixtures: Match[] = loadWorldCupGroupFixtures();

export function mergeOfficialGroupResults(completedMatches: Match[]): Match[] {
  const mergedById = new Map(completedMatches.map((match) => [match.id, match]));

  for (const fixture of worldCupGroupFixtures) {
    if (!hasOfficialFixtureResult(fixture.id) || mergedById.has(fixture.id)) {
      continue;
    }

    const regulation = getOfficialFixtureResult(fixture.id)!;

    mergedById.set(fixture.id, {
      ...fixture,
      status: 'completed',
      result: {
        regulation,
      },
    });
  }

  return [...mergedById.values()];
}

export function getOfficialFixtureResult(matchId: string): PeriodScore | undefined {
  return officialGroupFixtureResults[matchId];
}

export function hasOfficialFixtureResult(matchId: string): boolean {
  return matchId in officialGroupFixtureResults;
}

export function getWorldCupGroupFixtures(groupId: string): Match[] {
  return worldCupGroupFixtures.filter((match) => match.groupId === groupId);
}

export type KnockoutFixtureTemplate = {
  num: number;
  round: string;
  homePlaceholder: string;
  awayPlaceholder: string;
  scheduledDate: string;
  scheduledTime: string;
  ground: string;
};

function parseMatchdayNumber(round: string): number | null {
  const match = round.match(/^Matchday\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}

export function getMatchdayOrder(): string[] {
  const matchdays = new Set(
    worldCupGroupFixtures
      .map((fixture) => fixture.round)
      .filter((round): round is string => Boolean(round)),
  );

  return [...matchdays].sort((roundA, roundB) => {
    const dayA = parseMatchdayNumber(roundA);
    const dayB = parseMatchdayNumber(roundB);

    if (dayA === null || dayB === null) {
      return roundA.localeCompare(roundB);
    }

    return dayA - dayB;
  });
}

export function getMatchesForMatchday(matchday: string): Match[] {
  return worldCupGroupFixtures.filter((fixture) => fixture.round === matchday);
}

function loadWorldCupKnockoutFixtures(): KnockoutFixtureTemplate[] {
  const sources = (fixturesJson as FixtureSourceFile).matches.filter(
    (match) => !match.group,
  );

  return sources
    .map((source) => ({
      num: source.num ?? 0,
      round: source.round,
      homePlaceholder: source.team1,
      awayPlaceholder: source.team2,
      scheduledDate: source.date,
      scheduledTime: source.time,
      ground: source.ground,
    }))
    .sort((fixtureA, fixtureB) => fixtureA.num - fixtureB.num);
}

export const worldCupKnockoutFixtures: KnockoutFixtureTemplate[] = loadWorldCupKnockoutFixtures();

export function getWorldCupKnockoutFixtures(round: string): KnockoutFixtureTemplate[] {
  return worldCupKnockoutFixtures.filter((fixture) => fixture.round === round);
}

function assertWorldCupGroupFixtures(): void {
  if (worldCupGroupFixtures.length !== 72) {
    throw new Error(`Expected 72 group fixtures, found ${worldCupGroupFixtures.length}`);
  }

  const fixturesByGroup = new Map<string, Match[]>();

  for (const fixture of worldCupGroupFixtures) {
    const groupFixtures = fixturesByGroup.get(fixture.groupId!) ?? [];
    groupFixtures.push(fixture);
    fixturesByGroup.set(fixture.groupId!, groupFixtures);
  }

  if (fixturesByGroup.size !== 12) {
    throw new Error(`Expected 12 groups in fixtures, found ${fixturesByGroup.size}`);
  }

  for (const [groupId, fixtures] of fixturesByGroup) {
    if (fixtures.length !== 6) {
      throw new Error(`Expected 6 fixtures in group ${groupId}, found ${fixtures.length}`);
    }
  }
}

assertWorldCupGroupFixtures();
