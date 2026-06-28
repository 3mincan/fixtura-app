import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IosScreen } from '@/components/ui/ios-screen';
import { useTranslation } from '@/hooks/use-translation';
import { trackTeamSelected, trackTournamentStarted } from '@/services/analytics';
import { useTournamentStore, type TournamentStartMode } from '@/store/tournament-store';
import { Layout } from '@/theme/tokens';
import { pickRandomTeam } from '@/utils/pick-random-team';

type PendingStartAction = 'pick-team' | 'random' | null;

export function NewGameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [pendingStartAction, setPendingStartAction] = useState<PendingStartAction>(null);
  const selectTeam = useTournamentStore((state) => state.selectTeam);
  const resetTournamentProgress = useTournamentStore((state) => state.resetTournamentProgress);

  const startTournament = (startMode: TournamentStartMode) => {
    resetTournamentProgress();

    if (pendingStartAction === 'pick-team') {
      router.push({
        pathname: '/select-team',
        params: { startMode },
      });
      return;
    }

    if (pendingStartAction === 'random') {
      const teamId = pickRandomTeam().id;
      selectTeam(teamId, { gameMode: 'random', startMode });
      trackTeamSelected({ teamId, gameMode: 'random', startMode });
      const simulationId = useTournamentStore.getState().activeSimulationId;
      if (simulationId) {
        trackTournamentStarted({ teamId, gameMode: 'random', simulationId });
      }
      router.replace('/matchday');
    }
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
          onPress={() => setPendingStartAction('pick-team')}
          style={({ pressed }) => [
            styles.optionCard,
            pendingStartAction === 'pick-team' && styles.optionCardSelected,
            pressed && styles.optionPressed,
          ]}>
          <Text style={styles.optionKicker}>Team Path</Text>
          <Text style={styles.optionTitle}>{t('pickYourTeamOption')}</Text>
          <Text style={styles.optionDescription}>{t('pickYourTeamOptionDescription')}</Text>
        </Pressable>

        <Pressable
          onPress={() => setPendingStartAction('random')}
          style={({ pressed }) => [
            styles.optionCard,
            pendingStartAction === 'random' && styles.optionCardSelected,
            pressed && styles.optionPressed,
          ]}>
          <Text style={styles.optionKicker}>Quick Start</Text>
          <Text style={styles.optionTitle}>{t('totallyRandomOption')}</Text>
          <Text style={styles.optionDescription}>{t('totallyRandomOptionDescription')}</Text>
        </Pressable>
      </View>

      {pendingStartAction ? (
        <View style={styles.startPanel}>
          <Text style={styles.sectionKicker}>Start Point</Text>
          <Text style={styles.sectionTitle}>Where should the tournament begin?</Text>
          <View style={styles.startOptions}>
            <Pressable
              onPress={() => startTournament('beginning')}
              style={({ pressed }) => [
                styles.startOption,
                pressed && styles.optionPressed,
              ]}>
              <Text style={styles.startOptionTitle}>From the beginning</Text>
              <Text style={styles.startOptionDescription}>Play every matchday from Matchday 1.</Text>
            </Pressable>

            <Pressable
              onPress={() => startTournament('today')}
              style={({ pressed }) => [
                styles.startOption,
                styles.startOptionSelected,
                pressed && styles.optionPressed,
              ]}>
              <Text style={[styles.startOptionTitle, styles.startOptionTitleSelected]}>
                From today
              </Text>
              <Text style={styles.startOptionDescription}>
                Apply official results instantly and continue from now.
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  startPanel: {
    marginTop: 18,
    padding: 16,
    borderRadius: 26,
    backgroundColor: 'rgba(8, 18, 44, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sectionKicker: {
    color: '#66D9FF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  startOptions: {
    gap: 10,
  },
  startOption: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  startOptionSelected: {
    backgroundColor: 'rgba(34, 200, 255, 0.18)',
    borderColor: '#22C8FF',
  },
  startOptionTitle: {
    color: 'rgba(235, 244, 255, 0.76)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  startOptionTitleSelected: {
    color: '#FFFFFF',
  },
  startOptionDescription: {
    color: 'rgba(235, 244, 255, 0.58)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 3,
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
  optionCardSelected: {
    backgroundColor: 'rgba(34, 200, 255, 0.14)',
    borderColor: '#22C8FF',
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
