import { create } from 'zustand';

import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
} from '@/types/app-settings';
import type { RemoteConfig } from '@/types/remote-config';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';
import { normalizeSimulationSpeed } from '@/utils/normalize-simulation-speed';

type AppStore = AppSettings & {
  isAppReady: boolean;
  remoteConfig: RemoteConfig | null;
  hydrateSettings: (settings: Partial<AppSettings>) => void;
  updateSettings: (patch: Partial<AppSettings>) => AppSettings;
  setRemoteConfig: (config: RemoteConfig | null) => void;
  setAppReady: (ready: boolean) => void;
  completeOnboarding: () => AppSettings;
  markTournamentCompleted: () => AppSettings;
  resetOnboarding: () => AppSettings;
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...DEFAULT_APP_SETTINGS,
  isAppReady: false,
  remoteConfig: null,

  hydrateSettings: (settings) => {
    set({
      ...DEFAULT_APP_SETTINGS,
      ...settings,
      simulationSpeed: normalizeSimulationSpeed(settings.simulationSpeed),
    });
  },

  updateSettings: (patch) => {
    const nextSettings: AppSettings = {
      ...pickPersistableAppSettings(get()),
      ...patch,
    };

    set({
      ...get(),
      ...nextSettings,
      simulationSpeed: normalizeSimulationSpeed(nextSettings.simulationSpeed),
    });

    return nextSettings;
  },

  setRemoteConfig: (config) => set({ remoteConfig: config }),

  setAppReady: (ready) => set({ isAppReady: ready }),

  completeOnboarding: () => {
    return get().updateSettings({ hasCompletedOnboarding: true });
  },

  markTournamentCompleted: () => {
    return get().updateSettings({ hasCompletedTournament: true });
  },

  resetOnboarding: () => {
    return get().updateSettings({
      hasCompletedOnboarding: false,
    });
  },
}));
