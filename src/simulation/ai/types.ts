export type MatchAiRequest = {
  context: string;
  homeTeam: string;
  awayTeam: string;
};

export type MatchAiScore = {
  home: number;
  away: number;
};

export type MatchAiBatchRequest = MatchAiRequest & {
  id: string;
};

export type MatchAiBatchScore = MatchAiScore & {
  id: string;
};
