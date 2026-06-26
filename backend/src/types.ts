export type JsonObject = Record<string, unknown>;

export type User = {
  id: string;
  anonymousId: string;
  createdAt: number;
  lastSeenAt: number;
  settings: UserSettings;
};

export type UserSettings = {
  language?: string;
  simulationSpeed?: string;
  aiEnabled?: boolean;
  soundEnabled?: boolean;
  [key: string]: unknown;
};

export type SimulationSummary = {
  id: string;
  userId: string;
  selectedTeamId: string;
  gameMode: 'predict' | 'random';
  tournamentPhase: string;
  currentStage: string;
  championId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SimulationRecord = SimulationSummary & {
  progress: JsonObject;
};

export type AnalyticsEvent = {
  id: string;
  userId: string | null;
  name: string;
  payload: JsonObject;
  createdAt: number;
};

export type RemoteConfig = {
  minSupportedAppVersion: string;
  maintenanceMode: boolean;
  aiProxyEnabled: boolean;
  adsEnabled: boolean;
  supportedTournaments: string[];
};

export type WorldCupFixtureScore = {
  ft: [number, number];
  ht?: [number, number];
};

export type WorldCupFixtureMatch = {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  num?: number;
  score?: WorldCupFixtureScore;
  [key: string]: unknown;
};

export type WorldCupFixtureData = {
  name: string;
  matches: WorldCupFixtureMatch[];
};

export type DatabaseSnapshot = {
  users: User[];
  simulations: SimulationRecord[];
  events: AnalyticsEvent[];
};
