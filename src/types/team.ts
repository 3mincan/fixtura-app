export type Confederation =
  | 'UEFA'
  | 'CONMEBOL'
  | 'CONCACAF'
  | 'AFC'
  | 'CAF'
  | 'OFC';

export type Team = {
  id: string;
  name: string;
  shortName: string;
  flagEmoji: string;
  group: string;
  confederation: Confederation;
};

export type TeamRating = {
  teamId: string;
  overall: number;
  attack: number;
  defence: number;
  form: number;
  tournamentExperience: number;
  elo?: number;
  attackStrength?: number;
  defensiveStrength?: number;
  championshipProbability?: number;
};
