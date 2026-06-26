import type { WorldCupTeamSource } from '@/data/worldcup-team-source';

export function buildTeamNameLookup(
  sources: WorldCupTeamSource[],
): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const source of sources) {
    const teamId = source.fifa_code.toLowerCase();

    lookup.set(source.name.toLowerCase(), teamId);

    if (source.name_normalised) {
      lookup.set(source.name_normalised.toLowerCase(), teamId);
    }

    lookup.set(source.fifa_code.toLowerCase(), teamId);
  }

  return lookup;
}

export function resolveTeamName(
  lookup: Map<string, string>,
  teamName: string,
): string {
  const teamId = lookup.get(teamName.toLowerCase());

  if (!teamId) {
    throw new Error(`Unknown team name in fixtures: ${teamName}`);
  }

  return teamId;
}
