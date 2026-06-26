import { Redirect } from 'expo-router';

import { AppLoadingScreen } from '@/components/app-loading-screen';
import { HomeMenuScreen } from '@/components/home-menu-screen';
import { useAppStore } from '@/store/app-store';

export default function HomeScreen() {
  const isAppReady = useAppStore((state) => state.isAppReady);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);

  if (!isAppReady) {
    return <AppLoadingScreen />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <HomeMenuScreen />;
}
