import type { Confederation, Team } from '@/types/team';

export type WorldCupTeamSource = {
  name: string;
  name_normalised?: string;
  flag_icon: string;
  fifa_code: string;
  group: string;
  confed: Confederation;
  elo?: number;
  attack_strength?: number;
  defensive_strength?: number;
  overall_strength?: number;
  championship_probability?: number;
};

export function mapWorldCupTeam(source: WorldCupTeamSource): Team {
  return {
    id: source.fifa_code.toLowerCase(),
    name: source.name_normalised ?? source.name,
    shortName: source.fifa_code,
    flagEmoji: source.flag_icon,
    group: source.group,
    confederation: source.confed,
  };
}

export function loadTeamsFromWorldCupJson(sources: WorldCupTeamSource[]): Team[] {
  return sources.map(mapWorldCupTeam);
}
