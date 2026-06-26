import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { StatePanel } from '@/components/state-panel';
import { parseAppSettingsJson, saveAppSettings } from '@/db/app-settings';
import { initializeDatabase } from '@/db/init';
import type { DatabaseClient } from '@/db/types';
import { resolveDeviceAppLanguage } from '@/i18n/device-locale';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import {
  enableTournamentPersistence,
  hydrateTournamentStore,
} from '@/store/tournament-persistence';
import { useTournamentStore } from '@/store/tournament-store';
import { Layout } from '@/theme/tokens';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';
import { isTerminalTournamentPhase } from '@/utils/tournament-phase';

type TournamentPersistenceProviderProps = {
  children: ReactNode;
};

async function syncTournamentCompletionFlag(db: DatabaseClient) {
  const tournamentPhase = useTournamentStore.getState().tournamentPhase;

  if (!isTerminalTournamentPhase(tournamentPhase)) {
    return;
  }

  const nextSettings = useAppStore.getState().markTournamentCompleted();
  await saveAppSettings(db, pickPersistableAppSettings(nextSettings));
}

async function syncOnboardingFromRestoredProgress(db: DatabaseClient) {
  const selectedTeamId = useTournamentStore.getState().selectedTeamId;

  if (!selectedTeamId || useAppStore.getState().hasCompletedOnboarding) {
    return;
  }

  const nextSettings = useAppStore.getState().updateSettings({
    hasCompletedOnboarding: true,
  });
  await saveAppSettings(db, pickPersistableAppSettings(nextSettings));
}

export function TournamentPersistenceProvider({
  children,
}: TournamentPersistenceProviderProps) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeTournament: (() => void) | undefined;
    let unsubscribeCompletion: (() => void) | undefined;

    async function setup() {
      try {
        await initializeDatabase(db);

        const settingsRow = await db.getFirstAsync<{ settings_json: string | null }>(
          'SELECT settings_json FROM app_settings WHERE id = 1',
        );
        const settings = settingsRow?.settings_json
          ? parseAppSettingsJson(settingsRow.settings_json)
          : {
              ...parseAppSettingsJson(null),
              language: resolveDeviceAppLanguage(),
            };

        useAppStore.getState().hydrateSettings(settings);

        const result = await hydrateTournamentStore(db);

        if (result === 'failed') {
          setRestoreError(t('failedRestoreMessage'));
        }

        await syncOnboardingFromRestoredProgress(db);
        await syncTournamentCompletionFlag(db);

        unsubscribeTournament = enableTournamentPersistence(db);

        unsubscribeCompletion = useTournamentStore.subscribe((state, previousState) => {
          if (state.tournamentPhase === previousState.tournamentPhase) {
            return;
          }

          if (!isTerminalTournamentPhase(state.tournamentPhase)) {
            return;
          }

          void syncTournamentCompletionFlag(db);
        });
      } catch {
        setRestoreError(t('failedRestoreMessage'));
      } finally {
        useAppStore.getState().setAppReady(true);
      }
    }

    void setup();

    return () => {
      unsubscribeTournament?.();
      unsubscribeCompletion?.();
    };
  }, [db, t]);

  return (
    <>
      {restoreError ? (
        <Pressable onPress={() => setRestoreError(null)} style={styles.errorBanner}>
          <StatePanel variant="error" title={t('restoreFailedTitle')} message={restoreError} />
        </Pressable>
      ) : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    paddingHorizontal: Layout.groupedHorizontal,
    paddingTop: 8,
  },
});
