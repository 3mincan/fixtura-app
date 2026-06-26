import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { InsetPanel } from '@/components/ui/inset-panel';
import { teamsById } from '@/data/teams';
import { useTheme } from '@/hooks/use-theme';
import { championRevealTransition } from '@/theme/animations';

type ChampionRevealCardProps = {
  teamId: string;
  title?: string;
  subtitle?: string;
};

export function ChampionRevealCard({
  teamId,
  title = 'Champion',
  subtitle,
}: ChampionRevealCardProps) {
  const theme = useTheme();
  const team = teamsById[teamId];

  return (
    <Animated.View entering={championRevealTransition}>
      <InsetPanel accentColor={theme.success}>
        <ThemedText type="captionBold" themeColor="textSecondary" style={styles.eyebrow}>
          {title.toUpperCase()}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="footnote" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
        <View style={styles.teamRow}>
          <Text style={styles.flag}>{team.flagEmoji}</Text>
          <ThemedText type="title2">{team.name}</ThemedText>
        </View>
      </InsetPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    letterSpacing: 0.4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  flag: {
    fontSize: 36,
  },
});
