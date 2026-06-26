import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { IosButton } from '@/components/ui/ios-button';
import { IosScreen } from '@/components/ui/ios-screen';
import { ThemedText } from '@/components/themed-text';
import { saveAppSettings } from '@/db/app-settings';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/app-store';
import { Layout, Radii } from '@/theme/tokens';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';

const SLIDE_ICONS = ['⚽', '🏆', '🎯'] as const;

export function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = [
    {
      icon: SLIDE_ICONS[0],
      title: t('onboardingWelcomeTitle'),
      subtitle: t('onboardingWelcomeSubtitle'),
    },
    {
      icon: SLIDE_ICONS[1],
      title: t('onboardingTeamTitle'),
      subtitle: t('onboardingTeamSubtitle'),
    },
    {
      icon: SLIDE_ICONS[2],
      title: t('onboardingPredictTitle'),
      subtitle: t('onboardingPredictSubtitle'),
    },
  ] as const;

  const slide = slides[slideIndex]!;
  const isLastSlide = slideIndex === slides.length - 1;

  const handleNext = async () => {
    if (isLastSlide) {
      const nextSettings = completeOnboarding();
      await saveAppSettings(db, pickPersistableAppSettings(nextSettings));
      router.replace('/');
      return;
    }

    setSlideIndex((currentIndex) => currentIndex + 1);
  };

  return (
    <IosScreen contentStyle={styles.content}>
      <View style={styles.slide}>
        <View style={[styles.iconBox, { backgroundColor: theme.accentMuted }]}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>

        <ThemedText type="title1" style={styles.title}>
          {slide.title}
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          {slide.subtitle}
        </ThemedText>

        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: theme.separator },
                index === slideIndex && [styles.dotActive, { backgroundColor: theme.accent }],
              ]}
            />
          ))}
        </View>

        <IosButton
          label={isLastSlide ? t('onboardingGetStarted') : t('continue')}
          onPress={() => {
            void handleNext();
          }}
          style={styles.button}
        />
      </View>
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Layout.screenHorizontal,
  },
  slide: {
    alignItems: 'center',
  },
  iconBox: {
    width: 112,
    height: 112,
    borderRadius: Radii.grouped * 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 48,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  button: {
    minWidth: 220,
  },
});
