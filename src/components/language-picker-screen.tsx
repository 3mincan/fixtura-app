import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GroupedRow, GroupedSection } from '@/components/ui/grouped-section';
import { IosScreen } from '@/components/ui/ios-screen';
import { saveAppSettings } from '@/db/app-settings';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import {
  getLanguageLabelKey,
  getSupportedAppLanguages,
} from '@/i18n/supported-languages';
import { useAppStore } from '@/store/app-store';
import type { AppLanguage, AppSettings } from '@/types/app-settings';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';

type LanguagePickerRowProps = {
  selectedLanguage: AppLanguage;
  onPress: () => void;
  showSeparator?: boolean;
};

export function LanguagePickerRow({
  selectedLanguage,
  onPress,
  showSeparator = true,
}: LanguagePickerRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <GroupedRow label={t('language')} onPress={onPress} showSeparator={showSeparator}>
      <View style={styles.disclosureValue}>
        <ThemedText type="body" themeColor="textSecondary" numberOfLines={1}>
          {t(getLanguageLabelKey(selectedLanguage))}
        </ThemedText>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          weight="semibold"
          tintColor={theme.textDim}
        />
      </View>
    </GroupedRow>
  );
}

export function LanguagePickerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const settings = useAppStore();
  const updateSettings = useAppStore((state) => state.updateSettings);

  const persistSettings = async (patch: Partial<AppSettings>) => {
    const nextSettings = updateSettings(patch);
    await saveAppSettings(db, pickPersistableAppSettings(nextSettings));
  };

  return (
    <IosScreen
      largeTitle={t('language')}
      backLabel={t('settings')}
      onBack={() => router.back()}
      contentStyle={styles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <GroupedSection footer={t('languageDescription')}>
          {getSupportedAppLanguages().map((language, index, languages) => {
            const isSelected = settings.language === language;

            return (
              <GroupedRow
                key={language}
                onPress={() => {
                  void persistSettings({ language });
                }}
                showSeparator={index < languages.length - 1}>
                <ThemedText type="body" style={styles.optionLabel}>
                  {t(getLanguageLabelKey(language))}
                </ThemedText>
                {isSelected ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={17}
                    weight="semibold"
                    tintColor={theme.accent}
                  />
                ) : (
                  <View style={styles.checkmarkPlaceholder} />
                )}
              </GroupedRow>
            );
          })}
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
  disclosureValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '58%',
  },
  optionLabel: {
    flex: 1,
  },
  checkmarkPlaceholder: {
    width: 17,
    height: 17,
  },
});
