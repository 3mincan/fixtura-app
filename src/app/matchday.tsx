import { Redirect } from 'expo-router';

import { AppLoadingScreen } from '@/components/app-loading-screen';
import { MatchdayHubScreen } from '@/components/matchday-hub-screen';
import { useAppStore } from '@/store/app-store';
import { useTournamentStore } from '@/store/tournament-store';

export default function MatchdayScreen() {
  const isAppReady = useAppStore((state) => state.isAppReady);
  const selectedTeamId = useTournamentStore((state) => state.selectedTeamId);

  if (!isAppReady) {
    return <AppLoadingScreen />;
  }

  if (!selectedTeamId) {
    return <Redirect href="/" />;
  }

  return <MatchdayHubScreen />;
}
