import type { Team } from '@/types/team';

export function filterTeams(teams: Team[], query: string): Team[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return teams;
  }

  return teams.filter((team) => {
    const searchableText = [
      team.name,
      team.shortName,
      team.id,
      team.group,
      `group ${team.group}`,
      team.confederation,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}
