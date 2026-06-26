import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IosButton } from '@/components/ui/ios-button';
import { teamsById } from '@/data/teams';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { Layout, Radii } from '@/theme/tokens';
import type { Match } from '@/types/match';
import type { MatchResult } from '@/types/match';
import type { KnockoutPredictionPhase } from '@/utils/knockout-prediction';
import { getPredictionValidationError } from '@/utils/prediction-validation';

type KnockoutPredictionFormProps = {
  match: Match;
  onSubmit: (result: MatchResult) => void;
};

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

function getPhaseTitle(
  phase: KnockoutPredictionPhase,
  t: (key: 'predictScore' | 'extraTimePrediction' | 'penaltyPrediction') => string,
): string {
  switch (phase) {
    case 'extra-time':
      return t('extraTimePrediction');
    case 'penalties':
      return t('penaltyPrediction');
    default:
      return t('predictScore');
  }
}

function getSubmitLabel(
  phase: KnockoutPredictionPhase,
  homeGoals: number | null,
  awayGoals: number | null,
  t: (key: 'submitPrediction' | 'continueToExtraTime' | 'continueToPenalties') => string,
): string {
  if (
    phase === 'regulation' &&
    homeGoals !== null &&
    awayGoals !== null &&
    homeGoals === awayGoals
  ) {
    return t('continueToExtraTime');
  }

  if (
    phase === 'extra-time' &&
    homeGoals !== null &&
    awayGoals !== null &&
    homeGoals === awayGoals
  ) {
    return t('continueToPenalties');
  }

  return t('submitPrediction');
}

export function KnockoutPredictionForm({ match, onSubmit }: KnockoutPredictionFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const homeTeam = teamsById[match.homeTeamId];
  const awayTeam = teamsById[match.awayTeamId];

  const [phase, setPhase] = useState<KnockoutPredictionPhase>('regulation');
  const [regulationScore, setRegulationScore] = useState<{ home: number; away: number } | null>(
    null,
  );
  const [extraTimeScore, setExtraTimeScore] = useState<{ home: number; away: number } | null>(
    null,
  );
  const [homeGoalsInput, setHomeGoalsInput] = useState('0');
  const [awayGoalsInput, setAwayGoalsInput] = useState('0');

  useEffect(() => {
    setPhase('regulation');
    setRegulationScore(null);
    setExtraTimeScore(null);
    setHomeGoalsInput('0');
    setAwayGoalsInput('0');
  }, [match.id]);

  const homeGoals = parseGoalInput(homeGoalsInput);
  const awayGoals = parseGoalInput(awayGoalsInput);
  const validationError = getPredictionValidationError({
    homeGoals,
    awayGoals,
    isKnockoutMatch: true,
    knockoutPhase: phase,
  });
  const canSave = homeGoals !== null && awayGoals !== null && validationError === null;

  const handleSubmit = () => {
    if (!canSave || homeGoals === null || awayGoals === null) {
      return;
    }

    if (phase === 'regulation') {
      if (homeGoals === awayGoals) {
        setRegulationScore({ home: homeGoals, away: awayGoals });
        setPhase('extra-time');
        setHomeGoalsInput('0');
        setAwayGoalsInput('0');
        return;
      }

      onSubmit({
        regulation: { home: homeGoals, away: awayGoals },
      });
      return;
    }

    if (phase === 'extra-time' && regulationScore) {
      if (homeGoals === awayGoals) {
        setExtraTimeScore({ home: homeGoals, away: awayGoals });
        setPhase('penalties');
        setHomeGoalsInput('0');
        setAwayGoalsInput('0');
        return;
      }

      onSubmit({
        regulation: regulationScore,
        extraTime: { home: homeGoals, away: awayGoals },
      });
      return;
    }

    if (phase === 'penalties' && regulationScore && extraTimeScore) {
      onSubmit({
        regulation: regulationScore,
        extraTime: extraTimeScore,
        penalties: { home: homeGoals, away: awayGoals },
      });
    }
  };

  const contextLines: string[] = [];

  if (regulationScore) {
    contextLines.push(
      `${t('regulationScore')}: ${regulationScore.home} - ${regulationScore.away}`,
    );
  }

  if (extraTimeScore) {
    contextLines.push(`${t('extraTimeScore')}: ${extraTimeScore.home} - ${extraTimeScore.away}`);
  }

  const phaseDescription =
    phase === 'extra-time'
      ? t('extraTimeDescription')
      : phase === 'penalties'
        ? t('penaltyDescription')
        : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="headline" style={styles.title}>
        {getPhaseTitle(phase, t)}
      </ThemedText>

      {phaseDescription ? (
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.description}>
          {phaseDescription}
        </ThemedText>
      ) : null}

      {contextLines.length > 0 ? (
        <View style={[styles.contextBlock, { backgroundColor: theme.background }]}>
          {contextLines.map((line) => (
            <ThemedText key={line} type="captionBold" themeColor="textSecondary" style={styles.contextLine}>
              {line}
            </ThemedText>
          ))}
        </View>
      ) : null}

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

      {validationError ? (
        <ThemedText type="footnote" style={{ color: theme.danger, textAlign: 'center' }}>
          {validationError}
        </ThemedText>
      ) : null}

      <IosButton
        label={getSubmitLabel(phase, homeGoals, awayGoals, t)}
        onPress={handleSubmit}
        disabled={!canSave}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: Radii.grouped,
    padding: 16,
    gap: 14,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 18,
  },
  contextBlock: {
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  contextLine: {
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
  submitButton: {
    minHeight: Layout.buttonHeight,
  },
});
