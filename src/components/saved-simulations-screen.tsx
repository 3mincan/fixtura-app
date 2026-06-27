import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { StatePanel } from '@/components/state-panel';
import { ThemedText } from '@/components/themed-text';
import { GroupedRow, GroupedSection } from '@/components/ui/grouped-section';
import { teamsById } from '@/data/teams';
import { listSavedSimulations, type SavedSimulationSummary } from '@/db/persistence';
import { useTranslation } from '@/hooks/use-translation';
import { trackRestoreFailure, trackSavedSimulationOpened } from '@/services/analytics';
import { openSavedSimulation } from '@/store/tournament-persistence';
import { useTournamentStore } from '@/store/tournament-store';
import { formatSimulationDate } from '@/utils/format-simulation-date';

function formatTeamLabel(teamId: string): string {
  const team = teamsById[teamId];

  if (!team) {
    return teamId;
  }

  return `${team.flagEmoji} ${team.name}`;
}

export function SavedSimulationsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulationSummary[]>([]);
  const [openingSimulationId, setOpeningSimulationId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const refreshSavedSimulations = useCallback(() => {
    async function loadSavedSimulations() {
      const simulations = await listSavedSimulations(db);
      setSavedSimulations(simulations);
    }

    void loadSavedSimulations();
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refreshSavedSimulations();
    }, [refreshSavedSimulations]),
  );

  async function handleOpenSimulation(simulationId: string) {
    setOpeningSimulationId(simulationId);
    setOpenError(null);

    const result = await openSavedSimulation(db, simulationId);
    setOpeningSimulationId(null);

    if (result === 'restored') {
      const { selectedTeamId } = useTournamentStore.getState();
      if (selectedTeamId) {
        trackSavedSimulationOpened({ simulationId, teamId: selectedTeamId });
      }
      router.push('/matchday');
      return;
    }

    trackRestoreFailure({ source: 'saved_simulation', simulationId });
    setOpenError(t('failedRestoreMessage'));
  }

  return (
    <ScreenContainer
      largeTitle={t('savedSimulationsTitle')}
      backLabel={t('back')}
      onBack={() => router.back()}>
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.subtitle}>
        {t('savedSimulationsSubtitle')}
      </ThemedText>

      {openError ? (
        <StatePanel variant="error" title={t('restoreFailedTitle')} message={openError} />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {savedSimulations.length === 0 ? (
          <StatePanel
            variant="empty"
            title={t('savedSimulationsEmptyTitle')}
            message={t('noSavedSimulationsMessage')}
          />
        ) : (
          <GroupedSection>
            {savedSimulations.map((simulation, index) => {
              const isOpening = openingSimulationId === simulation.id;
              const shouldShowTeamName = simulation.gameMode !== 'random';
              const championLabel = simulation.championId
                ? formatTeamLabel(simulation.championId)
                : t('tournamentInProgress');

              return (
                <GroupedRow
                  key={simulation.id}
                  onPress={() => handleOpenSimulation(simulation.id)}
                  showSeparator={index < savedSimulations.length - 1}>
                  <View style={styles.rowContent}>
                    {shouldShowTeamName ? (
                      <ThemedText type="body">{formatTeamLabel(simulation.teamId)}</ThemedText>
                    ) : null}
                    <ThemedText type="footnote" themeColor="textSecondary">
                      {t('savedSimulationChampion', { team: championLabel })}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textDim">
                      {t('savedSimulationCreated', {
                        date: formatSimulationDate(simulation.createdAt),
                      })}
                    </ThemedText>
                    <ThemedText type="captionBold" themeColor="accent">
                      {isOpening ? t('openingSimulation') : t('openSimulation')}
                    </ThemedText>
                  </View>
                </GroupedRow>
              );
            })}
          </GroupedSection>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    lineHeight: 18,
    marginBottom: 8,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  rowContent: {
    flex: 1,
    gap: 4,
    paddingVertical: 4,
  },
});
