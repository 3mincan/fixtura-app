import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { DefaultTeamPickerRow } from '@/components/default-team-picker';
import { LanguagePickerRow } from '@/components/language-picker-screen';
import { SettingsSegmentRow } from '@/components/settings-segment-row';
import { GroupedRow, GroupedSection } from '@/components/ui/grouped-section';
import { IosScreen } from '@/components/ui/ios-screen';
import { AD_REPORT_EMAIL, PRIVACY_POLICY_URL, SUPPORT_URL } from '@/config/legal';
import { saveAppSettings } from '@/db/app-settings';
import { clearSavedProgress } from '@/db/persistence';
import { useTranslation } from '@/hooks/use-translation';
import { trackSettingChanged } from '@/services/analytics';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/app-store';
import { useAiMatchScoresStore } from '@/store/ai-match-scores-store';
import { useTournamentStore } from '@/store/tournament-store';
import type { AppSettings, SimulationSpeed } from '@/types/app-settings';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const settings = useAppStore();
  const updateSettings = useAppStore((state) => state.updateSettings);
  const resetOnboarding = useAppStore((state) => state.resetOnboarding);
  const resetTournamentProgress = useTournamentStore((state) => state.resetTournamentProgress);

  const persistSettings = async (patch: Partial<AppSettings>) => {
    const nextSettings = updateSettings(patch);
    await saveAppSettings(db, pickPersistableAppSettings(nextSettings));

    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        trackSettingChanged({ key, value });
      }
    }
  };

  const openExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('openLinkFailedTitle'), t('openLinkFailedMessage'));
    }
  };

  const handleReportAd = () => {
    const subject = encodeURIComponent(t('reportAdEmailSubject'));
    const body = encodeURIComponent(t('reportAdEmailBody'));
    void openExternalUrl(`mailto:${AD_REPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const handleReplayOnboarding = async () => {
    await persistSettings({ hasCompletedOnboarding: false });
    resetOnboarding();
    router.replace('/onboarding');
  };

  const handleDeleteAllData = () => {
    Alert.alert(t('deleteAllDataConfirmTitle'), t('deleteAllDataConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearSavedProgress(db);
            resetTournamentProgress();
            await persistSettings({ hasCompletedTournament: false });
          })();
        },
      },
    ]);
  };

  return (
    <IosScreen
      largeTitle={t('settingsTitle')}
      backLabel={t('back')}
      onBack={() => router.back()}
      contentStyle={styles.content}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GroupedSection
          title={t('sectionAudio')}
          footer={`${t('musicDescription')}\n${t('soundEffectsDescription')}`}>
          <GroupedRow label={t('music')}>
            <Switch
              value={settings.musicEnabled}
              onValueChange={(value) => {
                void persistSettings({ musicEnabled: value });
              }}
              trackColor={{ false: theme.border, true: theme.accentMuted }}
              thumbColor={settings.musicEnabled ? theme.accent : theme.textDim}
            />
          </GroupedRow>
          <GroupedRow label={t('soundEffects')} showSeparator={false}>
            <Switch
              value={settings.soundEffectsEnabled}
              onValueChange={(value) => {
                void persistSettings({ soundEffectsEnabled: value });
              }}
              trackColor={{ false: theme.border, true: theme.accentMuted }}
              thumbColor={settings.soundEffectsEnabled ? theme.accent : theme.textDim}
            />
          </GroupedRow>
        </GroupedSection>

        <GroupedSection
          title={t('sectionFeedback')}
          footer={`${t('hapticsDescription')}\n${t('reportAdDescription')}`}>
          <GroupedRow label={t('haptics')}>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(value) => {
                void persistSettings({ hapticsEnabled: value });
              }}
              trackColor={{ false: theme.border, true: theme.accentMuted }}
              thumbColor={settings.hapticsEnabled ? theme.accent : theme.textDim}
            />
          </GroupedRow>
          <GroupedRow label={t('reportAd')} onPress={handleReportAd} showSeparator={false} />
        </GroupedSection>

        <GroupedSection
          title={t('sectionSimulation')}
          footer={`${t('simulationSpeedDescription')}`}>
          <View style={styles.segmentWrapper}>
            <SettingsSegmentRow<SimulationSpeed>
              embedded
              title={t('simulationSpeed')}
              description=""
              value={settings.simulationSpeed}
              options={[
                { value: 'slow', label: t('speedSlow') },
                { value: 'normal', label: t('speedNormal') },
                { value: 'instant', label: t('speedInstant') },
              ]}
              onValueChange={(value) => {
                void persistSettings({ simulationSpeed: value });
              }}
            />
          </View>
          <GroupedRow label={t('aiScores')}>
            <Switch
              value={settings.aiEnabled}
              onValueChange={(value) => {
                useAiMatchScoresStore.getState().reset();
                void persistSettings({ aiEnabled: value });
              }}
              trackColor={{ false: theme.border, true: theme.accentMuted }}
              thumbColor={settings.aiEnabled ? theme.accent : theme.textDim}
            />
          </GroupedRow>
        </GroupedSection>

        <GroupedSection
          title={t('sectionPreferences')}
          footer={`${t('languageDescription')}\n${t('defaultTeamDescription')}\n${t('autoRevealDescription')}`}>
          <LanguagePickerRow
            selectedLanguage={settings.language}
            onPress={() => router.push('/language')}
          />
          <DefaultTeamPickerRow
            selectedTeamId={settings.defaultTeamId}
            onPress={() => router.push('/default-team')}
            showSeparator={false}
          />
        </GroupedSection>

        <GroupedSection title={t('sectionData')} footer={t('deleteAllDataDescription')}>
          <GroupedRow
            label={t('deleteAllData')}
            onPress={handleDeleteAllData}
            destructive
            showSeparator={false}
          />
        </GroupedSection>

        <GroupedSection
          title={t('sectionApp')}
          footer={`${t('replayOnboardingDescription')}\n\n${t('aboutTitle')} — ${t('aboutDescription')}\n${t('version')} ${Constants.expoConfig?.version ?? '1.0.0'}`}>
          <GroupedRow label={t('replayOnboarding')} onPress={handleReplayOnboarding} />
          <GroupedRow
            label={t('privacyPolicy')}
            onPress={() => {
              void openExternalUrl(PRIVACY_POLICY_URL);
            }}
          />
          <GroupedRow
            label={t('support')}
            onPress={() => {
              void openExternalUrl(SUPPORT_URL);
            }}
            showSeparator={false}
          />
        </GroupedSection>
      </ScrollView>
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  segmentWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84, 84, 88, 0.35)',
  },
});
