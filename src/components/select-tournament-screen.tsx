import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { IosScreen } from '@/components/ui/ios-screen';
import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/hooks/use-translation';
import { Layout } from '@/theme/tokens';

type TournamentOption = {
  id: string;
  labelKey:
    | 'tournamentWorldCup2026'
    | 'tournamentPremierLeague'
    | 'tournamentLigue1'
    | 'tournamentLaLiga';
  available: boolean;
};

const TOURNAMENTS: TournamentOption[] = [
  { id: 'world-cup-2026', labelKey: 'tournamentWorldCup2026', available: true },
  { id: 'premier-league', labelKey: 'tournamentPremierLeague', available: false },
  { id: 'ligue-1', labelKey: 'tournamentLigue1', available: false },
  { id: 'la-liga', labelKey: 'tournamentLaLiga', available: false },
];

const COMING_SOON_DISMISS_MS = 2200;

export function SelectTournamentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissComingSoon = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    setShowComingSoon(false);
  }, []);

  const presentComingSoon = useCallback(() => {
    dismissComingSoon();
    setShowComingSoon(true);
    dismissTimeoutRef.current = setTimeout(dismissComingSoon, COMING_SOON_DISMISS_MS);
  }, [dismissComingSoon]);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (tournament: TournamentOption) => {
    if (tournament.available) {
      router.push('/new-game');
      return;
    }

    presentComingSoon();
  };

  return (
    <IosScreen
      backgroundVariant="premium"
      backLabel={t('back')}
      onBack={() => router.back()}
      contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Tournament Path</Text>
        <Text style={styles.title}>{t('selectTournamentTitle')}</Text>
        <Text style={styles.subtitle}>{t('selectTournamentSubtitle')}</Text>
      </View>

      <View style={styles.tournamentPanel}>
        {TOURNAMENTS.map((tournament, index) => (
          <Pressable
            key={tournament.id}
            onPress={() => handleSelect(tournament)}
            style={({ pressed }) => [
              styles.tournamentRow,
              !tournament.available && styles.rowUnavailable,
              pressed && styles.rowPressed,
              index < TOURNAMENTS.length - 1 && styles.rowSeparator,
            ]}>
            <View>
              <Text style={styles.tournamentName}>{t(tournament.labelKey)}</Text>
              <Text style={styles.tournamentMeta}>
                {tournament.available ? 'Official simulation mode' : t('soon')}
              </Text>
            </View>

            {tournament.available ? (
              <View style={styles.availablePill}>
                <Text style={styles.availablePillText}>Live</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {showComingSoon ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          style={styles.comingSoonBanner}>
          <ThemedText type="headline" style={[styles.comingSoonText, { color: '#FFFFFF' }]}>
            {t('comingSoon')}
          </ThemedText>
        </Animated.View>
      ) : null}
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  header: {
    marginHorizontal: Layout.screenHorizontal,
    marginBottom: 18,
    paddingTop: 8,
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
  tournamentPanel: {
    marginHorizontal: Layout.screenHorizontal,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(8, 18, 44, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tournamentRow: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tournamentName: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  tournamentMeta: {
    color: 'rgba(235, 244, 255, 0.56)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 3,
  },
  availablePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 200, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34, 200, 255, 0.42)',
  },
  availablePillText: {
    color: '#66D9FF',
    fontSize: 12,
    fontWeight: '800',
  },
  rowSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rowUnavailable: {
    opacity: 0.55,
  },
  rowPressed: {
    opacity: 0.72,
  },
  comingSoonBanner: {
    position: 'absolute',
    left: Layout.screenHorizontal,
    right: Layout.screenHorizontal,
    bottom: 32,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(8, 18, 44, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(126, 211, 255, 0.24)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  comingSoonText: {
    textAlign: 'center',
  },
});
