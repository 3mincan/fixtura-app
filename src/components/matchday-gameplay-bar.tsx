import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IosButton } from '@/components/ui/ios-button';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { Layout } from '@/theme/tokens';

type MatchdayGameplayBarProps = {
  revealScoresDisabled?: boolean;
  revealScoresPending?: boolean;
  onRevealScoresPress: () => void;
};

export function MatchdayGameplayBar({
  revealScoresDisabled = false,
  revealScoresPending = false,
  onRevealScoresPress,
}: MatchdayGameplayBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.copy}>
        <ThemedText type="footnote" themeColor="textSecondary">
          {t('autoRevealDescription')}
        </ThemedText>
      </View>
      <IosButton
        label={t('autoReveal')}
        onPress={onRevealScoresPress}
        variant="tinted"
        disabled={revealScoresDisabled || revealScoresPending}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: Layout.groupedHorizontal,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  button: {
    minHeight: 42,
    minWidth: 128,
    paddingHorizontal: 14,
  },
});
