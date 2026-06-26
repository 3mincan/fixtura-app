import { StyleSheet, Text, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { teamsById } from '@/data/teams';
import { Radii, Typography } from '@/theme/tokens';
import type { useTheme } from '@/hooks/use-theme';

export type MatchCardBadgeVariant =
  | 'your-match'
  | 'live'
  | 'finished'
  | 'scheduled'
  | 'upcoming';

type Theme = ReturnType<typeof useTheme>;

const scoreRollIn = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: -18 }],
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
}).duration(260);

type MatchCardStatusBadgeProps = {
  label: string;
  variant: MatchCardBadgeVariant;
  theme: Theme;
};

export function MatchCardStatusBadge({ label, variant, theme }: MatchCardStatusBadgeProps) {
  const isFilled = variant === 'your-match' || variant === 'live';

  return (
    <View
      style={[
        styles.badge,
        variant === 'your-match' && { backgroundColor: theme.accent },
        variant === 'live' && { backgroundColor: theme.success },
        (variant === 'finished' || variant === 'scheduled' || variant === 'upcoming') && {
          backgroundColor: theme.background,
        },
      ]}>
      <Text
        style={[
          styles.badgeLabel,
          isFilled ? styles.badgeLabelLight : { color: theme.textSecondary },
        ]}>
        {label}
      </Text>
    </View>
  );
}

type MatchCardFaceProps = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
  homeWon?: boolean;
  awayWon?: boolean;
  showVsWhenNoScore?: boolean;
  scoreDetail?: string | null;
  ground?: string | null;
  theme: Theme;
  animateScoreChanges?: boolean;
};

function ScoreCounterDigit({
  value,
  theme,
}: {
  value: number | string;
  theme: Theme;
}) {
  return (
    <View style={styles.scoreDigitWindow}>
      <Animated.Text
        key={String(value)}
        entering={scoreRollIn}
        style={[styles.scoreDigit, { color: theme.text }]}>
        {value}
      </Animated.Text>
    </View>
  );
}

function StaticScoreDigit({
  value,
  theme,
}: {
  value: number | string;
  theme: Theme;
}) {
  return (
    <ThemedText type="title2" style={[styles.scoreDigit, { color: theme.text }]}>
      {value}
    </ThemedText>
  );
}

export function MatchCardFace({
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  homeWon = false,
  awayWon = false,
  showVsWhenNoScore = false,
  scoreDetail,
  ground,
  theme,
  animateScoreChanges = true,
}: MatchCardFaceProps) {
  const homeTeam = teamsById[homeTeamId];
  const awayTeam = teamsById[awayTeamId];
  const hasScore = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  const ScoreDigit = animateScoreChanges ? ScoreCounterDigit : StaticScoreDigit;

  return (
    <>
      <View style={styles.teamsRow}>
        <View style={styles.teamColumn}>
          <Text style={styles.flag}>{homeTeam.flagEmoji}</Text>
          <ThemedText
            type="captionBold"
            numberOfLines={2}
            style={[
              styles.teamName,
              homeWon && { color: theme.success },
              awayWon && styles.teamNameLoser,
              awayWon && { color: theme.textDim },
            ]}>
            {homeTeam.name}
          </ThemedText>
        </View>

        <View style={styles.scoreColumn}>
          {hasScore ? (
            <View style={styles.scoreRow}>
              <ScoreDigit value={homeScore} theme={theme} />
              <ThemedText type="title3" themeColor="textDim">
                :
              </ThemedText>
              <ScoreDigit value={awayScore} theme={theme} />
            </View>
          ) : showVsWhenNoScore ? (
            <ThemedText type="title3" themeColor="textDim" style={styles.vsLabel}>
              vs
            </ThemedText>
          ) : (
            <View style={styles.scoreRow}>
              <ThemedText type="title2" style={styles.scoreDigit}>
                0
              </ThemedText>
              <ThemedText type="title3" themeColor="textDim">
                :
              </ThemedText>
              <ThemedText type="title2" style={styles.scoreDigit}>
                0
              </ThemedText>
            </View>
          )}
          {scoreDetail ? (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.scoreDetail}>
              {scoreDetail}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.teamColumn}>
          <Text style={styles.flag}>{awayTeam.flagEmoji}</Text>
          <ThemedText
            type="captionBold"
            numberOfLines={2}
            style={[
              styles.teamName,
              awayWon && { color: theme.success },
              homeWon && styles.teamNameLoser,
              homeWon && { color: theme.textDim },
            ]}>
            {awayTeam.name}
          </ThemedText>
        </View>
      </View>

      {ground ? (
        <ThemedText type="caption" themeColor="textDim" style={styles.ground}>
          {ground}
        </ThemedText>
      ) : null}
    </>
  );
}

export const matchCardUiStyles = StyleSheet.create({
  cardShell: {
    marginBottom: 12,
  },
  card: {
    borderRadius: Radii.grouped,
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
  noAccent: {
    borderLeftColor: 'transparent',
  },
  cardContent: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeLabelLight: {
    color: '#FFFFFF',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 28,
  },
  teamName: {
    textAlign: 'center',
  },
  teamNameLoser: {
    fontWeight: '400',
  },
  scoreColumn: {
    alignItems: 'center',
    minWidth: 72,
    gap: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  scoreDigitWindow: {
    minWidth: 28,
    height: Typography.title2.lineHeight,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDigit: {
    ...Typography.title2,
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  vsLabel: {
    textAlign: 'center',
  },
  scoreDetail: {
    textAlign: 'center',
  },
  ground: {
    marginTop: 10,
    textAlign: 'center',
  },
});

const styles = matchCardUiStyles;
