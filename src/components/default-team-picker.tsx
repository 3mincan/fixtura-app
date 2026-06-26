import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GroupedRow } from '@/components/ui/grouped-section';
import { IosScreen } from '@/components/ui/ios-screen';
import { teams, teamsById } from '@/data/teams';
import { saveAppSettings } from '@/db/app-settings';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/app-store';
import type { AppSettings } from '@/types/app-settings';
import { Layout, Radii } from '@/theme/tokens';
import { filterTeams } from '@/utils/filter-teams';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';

type DefaultTeamPickerRowProps = {
  selectedTeamId: string | null;
  onPress: () => void;
  showSeparator?: boolean;
};

export function DefaultTeamPickerRow({
  selectedTeamId,
  onPress,
  showSeparator = false,
}: DefaultTeamPickerRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const selectedTeam = selectedTeamId ? teamsById[selectedTeamId] : null;

  return (
    <GroupedRow label={t('defaultTeam')} onPress={onPress} showSeparator={showSeparator}>
      <View style={styles.disclosureValue}>
        <ThemedText type="body" themeColor="textSecondary" numberOfLines={1}>
          {selectedTeam
            ? `${selectedTeam.flagEmoji} ${selectedTeam.name}`
            : t('defaultTeamNone')}
        </ThemedText>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          weight="semibold"
          tintColor={theme.textDim}
        />
      </View>
    </GroupedRow>
  );
}

export function DefaultTeamPickerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const settings = useAppStore();
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [query, setQuery] = useState('');

  const filteredTeams = useMemo(() => filterTeams(teams, query), [query]);
  const selectedTeamId = settings.defaultTeamId;

  const persistSettings = async (patch: Partial<AppSettings>) => {
    const nextSettings = updateSettings(patch);
    await saveAppSettings(db, pickPersistableAppSettings(nextSettings));
  };

  return (
    <IosScreen
      largeTitle={t('defaultTeam')}
      backLabel={t('settings')}
      onBack={() => router.back()}
      contentStyle={styles.content}>
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.subtitle}>
        {t('defaultTeamDescription')}
      </ThemedText>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('searchTeams')}
        placeholderTextColor={theme.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.searchInput,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
          },
        ]}
      />

      <FlatList
        data={filteredTeams}
        keyExtractor={(team) => team.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: team }) => {
          const isSelected = selectedTeamId === team.id;

          return (
            <Pressable
              onPress={() => {
                void persistSettings({ defaultTeamId: team.id });
              }}
              style={({ pressed }) => [
                styles.teamRow,
                {
                  backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="body" style={styles.teamLabel}>
                {team.flagEmoji} {team.name}
              </ThemedText>
              {isSelected ? (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={17}
                  weight="semibold"
                  tintColor={theme.accent}
                />
              ) : (
                <View style={styles.checkmarkPlaceholder} />
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={
          selectedTeamId ? (
            <Pressable
              onPress={() => {
                void persistSettings({ defaultTeamId: null });
              }}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
              <ThemedText type="body" style={{ color: theme.danger }}>
                {t('clearDefaultTeam')}
              </ThemedText>
            </Pressable>
          ) : null
        }
      />
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  disclosureValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '58%',
  },
  subtitle: {
    marginHorizontal: Layout.screenHorizontal,
    marginBottom: 12,
    lineHeight: 18,
  },
  searchInput: {
    marginHorizontal: Layout.screenHorizontal,
    marginBottom: 12,
    borderRadius: Radii.grouped,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
  },
  listContent: {
    paddingHorizontal: Layout.groupedHorizontal,
    paddingBottom: 32,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.grouped,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: Layout.rowMinHeight,
    marginBottom: 8,
  },
  teamLabel: {
    flex: 1,
    marginRight: 12,
  },
  checkmarkPlaceholder: {
    width: 17,
    height: 17,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  pressed: {
    opacity: 0.65,
  },
});
