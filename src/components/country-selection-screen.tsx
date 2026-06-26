import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { IosButton } from '@/components/ui/ios-button';
import { IosScreen } from '@/components/ui/ios-screen';
import { ThemedText } from '@/components/themed-text';
import { teams } from '@/data/teams';
import { useTranslation } from '@/hooks/use-translation';
import { useTournamentStore } from '@/store/tournament-store';
import { Layout, Radii } from '@/theme/tokens';
import { filterTeams } from '@/utils/filter-teams';

const NUM_COLUMNS = 3;
const WIDE_NUM_COLUMNS = 4;

export function CountrySelectionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const selectTeam = useTournamentStore((state) => state.selectTeam);
  const numColumns = width >= 700 ? WIDE_NUM_COLUMNS : NUM_COLUMNS;
  const teamCardWidth = numColumns === WIDE_NUM_COLUMNS ? '23.5%' : '31%';

  const filteredTeams = useMemo(() => filterTeams(teams, query), [query]);
  const selectedTeam = filteredTeams.find((team) => team.id === pendingTeamId) ?? null;

  const handleConfirm = () => {
    if (!pendingTeamId) {
      return;
    }

    selectTeam(pendingTeamId, { gameMode: 'predict' });
    router.replace('/matchday');
  };

  return (
    <IosScreen
      backgroundVariant="premium"
      backLabel={t('back')}
      onBack={() => router.back()}
      contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Fixtura AI</Text>
        <Text style={styles.title}>{t('pickTeamTitle')}</Text>
        <Text style={styles.subtitle}>{t('pickTeamSubtitle')}</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('searchTeams')}
        placeholderTextColor="rgba(235, 244, 255, 0.48)"
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.searchInput,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(126, 211, 255, 0.2)',
            color: '#FFFFFF',
          },
        ]}
      />

      <FlatList
        data={filteredTeams}
        key={`teams-${numColumns}`}
        keyExtractor={(team) => team.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: team }) => {
          const isSelected = pendingTeamId === team.id;

          return (
            <Pressable
              onPress={() => setPendingTeamId(team.id)}
              style={({ pressed }) => [
                styles.teamCard,
                {
                  backgroundColor: isSelected
                    ? 'rgba(34, 200, 255, 0.18)'
                    : 'rgba(8, 18, 44, 0.58)',
                  borderColor: isSelected ? '#22C8FF' : 'rgba(255, 255, 255, 0.12)',
                  width: teamCardWidth,
                },
                pressed && styles.teamCardPressed,
              ]}>
              <Text style={styles.teamFlag}>{team.flagEmoji}</Text>
              <ThemedText type="captionBold" style={[styles.teamName, { color: '#FFFFFF' }]}>
                {team.name}
              </ThemedText>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <IosButton
          label={t('continueWithTeam').replace('{team}', selectedTeam?.name ?? '—')}
          onPress={handleConfirm}
          disabled={!pendingTeamId}
        />
      </View>
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.groupedHorizontal,
  },
  header: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  kicker: {
    color: '#66D9FF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: 'rgba(235, 244, 255, 0.72)',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    marginTop: 8,
  },
  searchInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 17,
    marginBottom: 12,
  },
  gridContent: {
    paddingBottom: 24,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  teamCard: {
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    shadowColor: '#22C8FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  teamCardPressed: {
    opacity: 0.72,
  },
  teamFlag: {
    fontSize: 34,
    marginBottom: 6,
  },
  teamName: {
    textAlign: 'center',
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
});
