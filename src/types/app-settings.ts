export type SimulationSpeed = 'slow' | 'normal' | 'instant';

export type AppLanguage = 'en' | 'tr' | 'de' | 'es' | 'ar' | 'ja' | 'zh' | 'id' | 'pt' | 'fr';

export type AppSettings = {
  hasCompletedOnboarding: boolean;
  hasCompletedTournament: boolean;
  backendAnonymousId: string | null;
  backendUserId: string | null;
  musicEnabled: boolean;
  soundEffectsEnabled: boolean;
  hapticsEnabled: boolean;
  aiEnabled: boolean;
  simulationSpeed: SimulationSpeed;
  autoReveal: boolean;
  language: AppLanguage;
  defaultTeamId: string | null;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  hasCompletedOnboarding: false,
  hasCompletedTournament: false,
  backendAnonymousId: null,
  backendUserId: null,
  musicEnabled: true,
  soundEffectsEnabled: true,
  hapticsEnabled: true,
  aiEnabled: true,
  simulationSpeed: 'normal',
  autoReveal: false,
  language: 'en',
  defaultTeamId: null,
};
