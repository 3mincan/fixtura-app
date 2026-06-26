import { memo, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  MatchCardFace,
  MatchCardStatusBadge,
  matchCardUiStyles,
  type MatchCardBadgeVariant,
} from '@/components/match-card-ui';
import { MatchCardTeamBackground } from '@/components/team-color-glow';
import { IosButton } from '@/components/ui/ios-button';
import { ThemedText } from '@/components/themed-text';
import { teamsById } from '@/data/teams';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { Layout } from '@/theme/tokens';
import type { MatchCardStatus } from '@/utils/matchday-board';
import type { Match } from '@/types/match';
import { getPredictionValidationError } from '@/utils/prediction-validation';

type MatchCardProps = {
  match: Match;
  status: MatchCardStatus;
  homeScore: number | null;
  awayScore: number | null;
  isUserMatch: boolean;
  showPrediction?: boolean;
  isKnockout?: boolean;
  fadeOpacity?: number;
  animateScoreChanges?: boolean;
  onSubmitPrediction?: (homeGoals: number, awayGoals: number) => void;
};

function getBadgeLabel(
  status: MatchCardStatus,
  isUserMatch: boolean,
  t: (key: 'yourMatchBadge' | 'live' | 'fullTime' | 'scheduled' | 'upcoming') => string,
): string {
  if (isUserMatch && status === 'your-match') {
    return t('yourMatchBadge');
  }

  if (status === 'live' || status === 'simulating') {
    return t('live');
  }

  if (status === 'finished') {
    return t('fullTime');
  }

  if (status === 'upcoming') {
    return t('upcoming');
  }

  return t('scheduled');
}

function getBadgeVariant(status: MatchCardStatus, isUserMatch: boolean): MatchCardBadgeVariant {
  if (isUserMatch && status === 'your-match') {
    return 'your-match';
  }

  if (status === 'live' || status === 'simulating') {
    return 'live';
  }

  if (status === 'finished') {
    return 'finished';
  }

  if (status === 'upcoming') {
    return 'upcoming';
  }

  return 'scheduled';
}

function parseGoalInput(value: string): number | null {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function getAccentColor(
  status: MatchCardStatus,
  theme: ReturnType<typeof useTheme>,
): string | null {
  if (status === 'your-match') {
    return theme.accent;
  }

  if (status === 'live' || status === 'simulating') {
    return theme.success;
  }

  return null;
}

function MatchCardComponent({
  match,
  status,
  homeScore,
  awayScore,
  isUserMatch,
  showPrediction = false,
  isKnockout = false,
  fadeOpacity = 1,
  animateScoreChanges = true,
  onSubmitPrediction,
}: MatchCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const animatedOpacity = useSharedValue(fadeOpacity);
  const homeTeam = teamsById[match.homeTeamId];
  const awayTeam = teamsById[match.awayTeamId];
  const [homeGoalsInput, setHomeGoalsInput] = useState('0');
  const [awayGoalsInput, setAwayGoalsInput] = useState('0');

  useEffect(() => {
    setHomeGoalsInput('0');
    setAwayGoalsInput('0');
  }, [match.id]);

  useEffect(() => {
    if (status === 'finished') {
      animatedOpacity.value = fadeOpacity;
      return;
    }

    animatedOpacity.value = withTiming(fadeOpacity, { duration: 450 });
  }, [animatedOpacity, fadeOpacity, status]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
  }));

  const homeGoals = parseGoalInput(homeGoalsInput);
  const awayGoals = parseGoalInput(awayGoalsInput);
  const canSave =
    homeGoals !== null &&
    awayGoals !== null &&
    (!isKnockout || homeGoals !== awayGoals);
  const validationError = getPredictionValidationError({
    homeGoals,
    awayGoals,
    isKnockoutMatch: isKnockout,
  });

  const accentColor = getAccentColor(status, theme);
  const kickoffTime = match.scheduledTime?.split(' ')[0] ?? '';
  const isFinished = status === 'finished' && homeScore !== null && awayScore !== null;
  const homeWon = isFinished && homeScore > awayScore;
  const awayWon = isFinished && awayScore > homeScore;
  const badgeVariant = getBadgeVariant(status, isUserMatch);

  return (
    <Animated.View style={[fadeStyle, matchCardUiStyles.cardShell]}>
      <MatchCardTeamBackground
        homeTeamId={match.homeTeamId}
        awayTeamId={match.awayTeamId}
        cardColor={theme.backgroundElement}
        style={[
          matchCardUiStyles.card,
          { backgroundColor: theme.backgroundElement },
          accentColor ? { borderLeftColor: accentColor } : matchCardUiStyles.noAccent,
          status === 'your-match' && { backgroundColor: theme.backgroundSelected },
        ]}>
        <View style={matchCardUiStyles.cardContent}>
          <View style={matchCardUiStyles.statusRow}>
            <MatchCardStatusBadge
              label={getBadgeLabel(status, isUserMatch, t)}
              variant={badgeVariant}
              theme={theme}
            />
            {kickoffTime ? (
              <ThemedText type="caption" themeColor="textDim">
                {kickoffTime}
              </ThemedText>
            ) : null}
          </View>

          <MatchCardFace
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            homeScore={homeScore}
            awayScore={awayScore}
            homeWon={homeWon}
            awayWon={awayWon}
            ground={match.ground}
            theme={theme}
            animateScoreChanges={animateScoreChanges}
          />

          {showPrediction && onSubmitPrediction ? (
            <View style={[styles.predictionSection, { borderTopColor: theme.separator }]}>
              <ThemedText type="footnote" themeColor="textSecondary" style={styles.predictionTitle}>
                {t('predictScore')}
              </ThemedText>

              <View style={styles.predictionInputs}>
                <View style={styles.predictionGroup}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {homeTeam.flagEmoji} {homeTeam.shortName}
                  </ThemedText>
                  <TextInput
                    value={homeGoalsInput}
                    onChangeText={setHomeGoalsInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={[
                      styles.predictionInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                  />
                </View>

                <View style={styles.predictionGroup}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {awayTeam.flagEmoji} {awayTeam.shortName}
                  </ThemedText>
                  <TextInput
                    value={awayGoalsInput}
                    onChangeText={setAwayGoalsInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={[
                      styles.predictionInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                  />
                </View>
              </View>

              {validationError && !canSave ? (
                <ThemedText type="footnote" style={{ color: theme.danger, textAlign: 'center' }}>
                  {validationError}
                </ThemedText>
              ) : null}

              <IosButton
                label={t('submitPrediction')}
                onPress={() => {
                  if (canSave && homeGoals !== null && awayGoals !== null) {
                    onSubmitPrediction(homeGoals, awayGoals);
                  }
                }}
                disabled={!canSave}
                style={styles.predictionButton}
              />
            </View>
          ) : null}
        </View>
      </MatchCardTeamBackground>
    </Animated.View>
  );
}

function areMatchCardPropsEqual(previous: MatchCardProps, next: MatchCardProps): boolean {
  const samePredictionHandler =
    !previous.showPrediction ||
    previous.onSubmitPrediction === next.onSubmitPrediction;

  return (
    previous.match.id === next.match.id &&
    previous.match.homeTeamId === next.match.homeTeamId &&
    previous.match.awayTeamId === next.match.awayTeamId &&
    previous.match.scheduledTime === next.match.scheduledTime &&
    previous.match.ground === next.match.ground &&
    previous.status === next.status &&
    previous.homeScore === next.homeScore &&
    previous.awayScore === next.awayScore &&
    previous.isUserMatch === next.isUserMatch &&
    previous.showPrediction === next.showPrediction &&
    previous.isKnockout === next.isKnockout &&
    previous.fadeOpacity === next.fadeOpacity &&
    previous.animateScoreChanges === next.animateScoreChanges &&
    samePredictionHandler
  );
}

export const MatchCard = memo(MatchCardComponent, areMatchCardPropsEqual);

const styles = StyleSheet.create({
  predictionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  predictionTitle: {
    textAlign: 'center',
  },
  predictionInputs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  predictionGroup: {
    alignItems: 'center',
    gap: 8,
  },
  predictionInput: {
    width: 64,
    height: 60,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  predictionButton: {
    minHeight: Layout.buttonHeight,
  },
});
