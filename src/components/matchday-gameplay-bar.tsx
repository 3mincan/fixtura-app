import { Switch, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { Layout } from '@/theme/tokens';

type MatchdayGameplayBarProps = {
  autoReveal: boolean;
  autoRevealPending?: boolean;
  onAutoRevealChange: (value: boolean) => void;
};

export function MatchdayGameplayBar({
  autoReveal,
  autoRevealPending = false,
  onAutoRevealChange,
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
        <ThemedText type="body">{t('autoReveal')}</ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary">
          {t('autoRevealDescription')}
        </ThemedText>
      </View>
      <Switch
        value={autoReveal}
        disabled={autoRevealPending}
        onValueChange={onAutoRevealChange}
        trackColor={{ false: theme.border, true: theme.accentMuted }}
        thumbColor={autoReveal || autoRevealPending ? theme.accent : theme.textDim}
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
});
