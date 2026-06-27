import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useTournamentAnalytics } from '@/hooks/use-tournament-analytics';
import {
  flushAnalytics,
  initAnalytics,
  trackAppOpened,
  trackSessionEnded,
  trackSessionStarted,
} from '@/services/analytics';
import { getOrCreateBackendUserId } from '@/services/backend-session';
import { useAppStore } from '@/store/app-store';

type AnalyticsProviderProps = {
  children: ReactNode;
};

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const db = useSQLiteContext();
  const isAppReady = useAppStore((state) => state.isAppReady);
  useTournamentAnalytics();

  useEffect(() => {
    initAnalytics(db);
  }, [db]);

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    void bootstrapAnalyticsSession(db);

    const subscription = AppState.addEventListener('change', (nextState) => {
      handleAppStateChange(db, nextState);
    });

    return () => {
      subscription.remove();
      trackSessionEnded();
      void flushAnalytics(db);
    };
  }, [db, isAppReady]);

  return children;
}

async function bootstrapAnalyticsSession(db: Parameters<typeof flushAnalytics>[0]): Promise<void> {
  await getOrCreateBackendUserId(db).catch(() => null);
  trackAppOpened();
  trackSessionStarted();
  await flushAnalytics(db);
}

function handleAppStateChange(
  db: Parameters<typeof flushAnalytics>[0],
  nextState: AppStateStatus,
): void {
  if (nextState === 'active') {
    trackSessionStarted();
    void flushAnalytics(db);
    return;
  }

  if (nextState === 'background' || nextState === 'inactive') {
    trackSessionEnded();
    void flushAnalytics(db);
  }
}
