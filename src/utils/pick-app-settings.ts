import type { AppSettings } from '@/types/app-settings';

export function pickPersistableAppSettings(
  state: AppSettings,
): AppSettings {
  return {
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    hasCompletedTournament: state.hasCompletedTournament,
    backendAnonymousId: state.backendAnonymousId,
    backendUserId: state.backendUserId,
    musicEnabled: state.musicEnabled,
    soundEffectsEnabled: state.soundEffectsEnabled,
    hapticsEnabled: state.hapticsEnabled,
    aiEnabled: state.aiEnabled,
    simulationSpeed: state.simulationSpeed,
    autoReveal: state.autoReveal,
    language: state.language,
    defaultTeamId: state.defaultTeamId,
  };
}
