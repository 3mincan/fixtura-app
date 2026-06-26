import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shouldShowHomeBanner } from '@/ads/ad-policy';
import { useAdIntensity } from '@/ads/mobile-ads-provider';
import { AdBannerSlot } from '@/components/ad-banner-slot';
import { IosButton } from '@/components/ui/ios-button';
import { IosScreen } from '@/components/ui/ios-screen';
import { listSavedSimulations } from '@/db/persistence';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/store/app-store';
import { useGameAudioStore } from '@/store/game-audio-store';
import { useTournamentStore } from '@/store/tournament-store';
import { Layout } from '@/theme/tokens';
import { isTerminalTournamentPhase } from '@/utils/tournament-phase';

type MenuButton = {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'tinted' | 'plain';
};

export function HomeMenuScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const adIntensity = useAdIntensity();
  const showHomeBanner = shouldShowHomeBanner(adIntensity);
  const hasCompletedTournament = useAppStore((state) => state.hasCompletedTournament);
  const selectedTeamId = useTournamentStore((state) => state.selectedTeamId);
  const tournamentPhase = useTournamentStore((state) => state.tournamentPhase);
  const [savedSimulationCount, setSavedSimulationCount] = useState(0);

  const refreshSavedCount = useCallback(() => {
    async function loadCount() {
      const simulations = await listSavedSimulations(db);
      setSavedSimulationCount(simulations.length);
    }

    void loadCount();
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refreshSavedCount();
      useGameAudioStore.getState().setMusicScene('main-menu');

      return () => {
        useGameAudioStore.getState().setMusicScene('none');
      };
    }, [refreshSavedCount]),
  );

  const hasInProgressTournament =
    selectedTeamId !== null && !isTerminalTournamentPhase(tournamentPhase);

  const openTournamentSelection = () => {
    router.push('/select-tournament');
  };

  const buttons: MenuButton[] = [];

  if (hasCompletedTournament) {
    buttons.push({ label: t('newGame'), onPress: openTournamentSelection, variant: 'filled' });
    buttons.push({
      label: t('oldSimulations'),
      onPress: () => router.push('/saved'),
      variant: 'tinted',
    });
  } else if (hasInProgressTournament) {
    buttons.push({
      label: t('continue'),
      onPress: () => router.push('/matchday'),
      variant: 'filled',
    });
    buttons.push({
      label: t('selectTournament'),
      onPress: openTournamentSelection,
      variant: 'tinted',
    });
    if (savedSimulationCount > 0) {
      buttons.push({
        label: t('oldSimulations'),
        onPress: () => router.push('/saved'),
        variant: 'tinted',
      });
    }
  } else {
    buttons.push({
      label: t('selectTournament'),
      onPress: openTournamentSelection,
      variant: 'filled',
    });
  }

  buttons.push({
    label: t('settings'),
    onPress: () => router.push('/settings'),
    variant: 'plain',
  });

  return (
    <IosScreen
      backgroundVariant="premium"
      contentStyle={styles.content}>
      <View style={styles.main}>
        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/new/logo-mainmenu.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel={t('appName')}
          />
          <Text style={styles.headline}>Pick Your Team</Text>
          <Text style={styles.headlineSecondary}>Predict Your Journey</Text>
          <Text style={styles.subheadline}>Choose your team and guide their World Cup path.</Text>
        </View>

        <View style={styles.buttonsPanel}>
          {buttons.map((button) => (
            <IosButton
              key={button.label}
              label={button.label}
              onPress={button.onPress}
              variant={button.variant ?? 'filled'}
              style={button.variant === 'plain' ? styles.plainButton : styles.menuButton}
            />
          ))}
        </View>
      </View>

      {showHomeBanner ? <AdBannerSlot placement="home" /> : null}
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenHorizontal,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logo: {
    width: '74%',
    maxWidth: 320,
    height: 92,
    marginBottom: 12,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
  },
  headlineSecondary: {
    color: 'rgba(235, 244, 255, 0.92)',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
    marginTop: 2,
  },
  subheadline: {
    color: 'rgba(235, 244, 255, 0.74)',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  buttonsPanel: {
    gap: 12,
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  menuButton: {
    width: '100%',
  },
  plainButton: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
