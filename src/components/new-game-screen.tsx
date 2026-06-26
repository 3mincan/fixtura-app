import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IosScreen } from '@/components/ui/ios-screen';
import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { useTournamentStore } from '@/store/tournament-store';
import { Layout, Radii } from '@/theme/tokens';
import { pickRandomTeam } from '@/utils/pick-random-team';

export function NewGameScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const selectTeam = useTournamentStore((state) => state.selectTeam);
  const resetTournamentProgress = useTournamentStore((state) => state.resetTournamentProgress);

  const handlePickTeam = () => {
    resetTournamentProgress();
    router.push('/select-team');
  };

  const handleTotallyRandom = () => {
    resetTournamentProgress();
    selectTeam(pickRandomTeam().id, { gameMode: 'random' });
    router.replace('/matchday');
  };

  return (
    <IosScreen
      largeTitle={t('newGameTitle')}
      backLabel={t('back')}
      onBack={() => router.back()}
      contentStyle={styles.content}>
      <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
        {t('newGameSubtitle')}
      </ThemedText>

      <View style={styles.options}>
        <Pressable
          onPress={handlePickTeam}
          style={({ pressed }) => [
            styles.optionCard,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.optionPressed,
          ]}>
          <Text style={styles.optionEmoji}>🌍</Text>
          <ThemedText type="headline">{t('pickYourTeamOption')}</ThemedText>
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.optionDescription}>
            {t('pickYourTeamOptionDescription')}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleTotallyRandom}
          style={({ pressed }) => [
            styles.optionCard,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.optionPressed,
          ]}>
          <Text style={styles.optionEmoji}>🎲</Text>
          <ThemedText type="headline">{t('totallyRandomOption')}</ThemedText>
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.optionDescription}>
            {t('totallyRandomOptionDescription')}
          </ThemedText>
        </Pressable>
      </View>
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.groupedHorizontal,
  },
  subtitle: {
    marginBottom: 24,
  },
  options: {
    gap: 14,
  },
  optionCard: {
    borderRadius: Radii.grouped,
    padding: 20,
    gap: 8,
  },
  optionPressed: {
    opacity: 0.82,
  },
  optionEmoji: {
    fontSize: 34,
    marginBottom: 4,
  },
  optionDescription: {
    lineHeight: 20,
  },
});
