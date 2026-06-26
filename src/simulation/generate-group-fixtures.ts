import type { Match } from '@/types/match';

export type GenerateGroupFixturesInput = {
  groupId: string;
  teamIds: string[];
};

function createMatchId(groupId: string, homeTeamId: string, awayTeamId: string): string {
  return `group-${groupId}-${homeTeamId}-${awayTeamId}`;
}

export function generateGroupFixtures(input: GenerateGroupFixturesInput): Match[] {
  const { groupId, teamIds } = input;
  const fixtures: Match[] = [];

  for (let homeIndex = 0; homeIndex < teamIds.length; homeIndex++) {
    for (let awayIndex = homeIndex + 1; awayIndex < teamIds.length; awayIndex++) {
      const homeTeamId = teamIds[homeIndex];
      const awayTeamId = teamIds[awayIndex];

      fixtures.push({
        id: createMatchId(groupId, homeTeamId, awayTeamId),
        stage: 'group',
        homeTeamId,
        awayTeamId,
        status: 'scheduled',
        groupId,
      });
    }
  }

  return fixtures;
}
