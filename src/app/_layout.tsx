import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { MobileAdsProvider } from '@/ads/mobile-ads-provider';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import { FixturaSplashOverlay } from '@/components/fixtura-splash-overlay';
import { GameAudioProvider } from '@/components/game-audio-provider';
import { TournamentPersistenceProvider } from '@/components/tournament-persistence-provider';
import { Colors } from '@/constants/theme';
import { initializeDatabase } from '@/db/init';
import { DATABASE_NAME } from '@/db/schema';
import '@/types/path-alias-check';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function createNavigationTheme(scheme: 'light' | 'dark') {
  const palette = Colors[scheme];

  return {
    dark: scheme === 'dark',
    colors: {
      primary: palette.accent,
      background: palette.background,
      card: palette.card,
      text: palette.text,
      border: palette.border,
      notification: palette.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '600' as const },
      heavy: { fontFamily: 'System', fontWeight: '700' as const },
    },
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <AppErrorBoundary>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
        <FixturaSplashOverlay />
        <MobileAdsProvider />
        <TournamentPersistenceProvider>
          <AnalyticsProvider>
            <GameAudioProvider>
            <ThemeProvider value={createNavigationTheme(scheme)}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="new-game" />
                <Stack.Screen name="select-tournament" />
                <Stack.Screen name="select-team" />
                <Stack.Screen name="matchday" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="language" />
                <Stack.Screen name="default-team" />
              </Stack>
            </ThemeProvider>
            </GameAudioProvider>
          </AnalyticsProvider>
        </TournamentPersistenceProvider>
      </SQLiteProvider>
    </AppErrorBoundary>
  );
}
