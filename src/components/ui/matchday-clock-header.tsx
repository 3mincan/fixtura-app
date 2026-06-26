import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Layout } from '@/theme/tokens';

type MatchdayClockHeaderProps = {
  dateLabel: string;
  timeLabel: string;
  stageLabel?: string;
};

export function MatchdayClockHeader({
  dateLabel,
  timeLabel,
  stageLabel,
}: MatchdayClockHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.separator }]}>
      {dateLabel ? (
        <ThemedText type="captionBold" themeColor="textSecondary" style={styles.dateLabel}>
          {dateLabel.toUpperCase()}
        </ThemedText>
      ) : null}
      <ThemedText type="largeTitle" style={styles.timeLabel}>
        {timeLabel}
      </ThemedText>
      {stageLabel ? (
        <ThemedText type="subheadline" themeColor="textSecondary" style={styles.stageLabel}>
          {stageLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: Layout.groupedHorizontal,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateLabel: {
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeLabel: {
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  stageLabel: {
    marginTop: 6,
    textAlign: 'center',
  },
});
