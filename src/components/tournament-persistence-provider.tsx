import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { StatePanel } from '@/components/state-panel';
import {
  buildOfficialGroupFixtureResults,
  type FixtureSourceMatch,
} from '@/data/worldcup-fixtures';
import { parseAppSettingsJson, saveAppSettings } from '@/db/app-settings';
import { initializeDatabase } from '@/db/init';
import type { DatabaseClient } from '@/db/types';
import { resolveDeviceAppLanguage } from '@/i18n/device-locale';
import { useTranslation } from '@/hooks/use-translation';
import { trackRestoreFailure } from '@/services/analytics';
import { fetchWorldCup2026Data } from '@/services/backend-api';
import { useAppStore } from '@/store/app-store';
import { useOfficialResultsStore } from '@/store/official-results-store';
import {
  enableTournamentPersistence,
  hydrateTournamentStore,
} from '@/store/tournament-persistence';
import { useTournamentStore } from '@/store/tournament-store';
import { computeAllGroupStandings } from '@/simulation/compute-group-standings';
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

async function syncOfficialResultsFromBackend() {
  const source = await fetchWorldCup2026Data();

  if (!source) {
    return;
  }

  const groupFixtures = source.matches.filter(
    (match): match is FixtureSourceMatch & { group: string } => Boolean(match.group),
  );
  const results = buildOfficialGroupFixtureResults(groupFixtures);

  useOfficialResultsStore.getState().hydrateResults(results);

  const completedMatches = useTournamentStore.getState().completedMatches;

  useTournamentStore.setState({
    groupStandings: computeAllGroupStandings(completedMatches),
  });
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
        void syncOfficialResultsFromBackend();

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
          trackRestoreFailure({ source: 'startup' });
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
        trackRestoreFailure({ source: 'startup' });
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
