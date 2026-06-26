import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IosScreen } from '@/components/ui/ios-screen';
import { useTranslation } from '@/hooks/use-translation';
import { useTournamentStore } from '@/store/tournament-store';
import { Layout } from '@/theme/tokens';
import { pickRandomTeam } from '@/utils/pick-random-team';

export function NewGameScreen() {
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
      backgroundVariant="premium"
      backLabel={t('back')}
      onBack={() => router.back()}
      contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>New Journey</Text>
        <Text style={styles.title}>{t('newGameTitle')}</Text>
        <Text style={styles.subtitle}>{t('newGameSubtitle')}</Text>
      </View>

      <View style={styles.options}>
        <Pressable
          onPress={handlePickTeam}
          style={({ pressed }) => [
            styles.optionCard,
            pressed && styles.optionPressed,
          ]}>
          <Text style={styles.optionKicker}>Team Path</Text>
          <Text style={styles.optionTitle}>{t('pickYourTeamOption')}</Text>
          <Text style={styles.optionDescription}>{t('pickYourTeamOptionDescription')}</Text>
        </Pressable>

        <Pressable
          onPress={handleTotallyRandom}
          style={({ pressed }) => [
            styles.optionCard,
            pressed && styles.optionPressed,
          ]}>
          <Text style={styles.optionKicker}>Quick Start</Text>
          <Text style={styles.optionTitle}>{t('totallyRandomOption')}</Text>
          <Text style={styles.optionDescription}>{t('totallyRandomOptionDescription')}</Text>
        </Pressable>
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
    marginBottom: 18,
    padding: 18,
    borderRadius: 26,
    backgroundColor: 'rgba(8, 18, 44, 0.54)',
    borderWidth: 1,
    borderColor: 'rgba(126, 211, 255, 0.2)',
  },
  kicker: {
    color: '#66D9FF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  subtitle: {
    color: 'rgba(235, 244, 255, 0.72)',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    marginTop: 8,
  },
  options: {
    gap: 14,
  },
  optionCard: {
    borderRadius: 26,
    padding: 20,
    gap: 8,
    backgroundColor: 'rgba(8, 18, 44, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(126, 211, 255, 0.18)',
    shadowColor: '#22C8FF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  optionPressed: {
    opacity: 0.82,
  },
  optionKicker: {
    color: '#66D9FF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  optionDescription: {
    color: 'rgba(235, 244, 255, 0.66)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
