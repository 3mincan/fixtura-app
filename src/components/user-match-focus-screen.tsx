import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { MatchCard } from '@/components/match-card';
import { ThemedText } from '@/components/themed-text';
import { IosScreen } from '@/components/ui/ios-screen';
import { MatchdayClockHeader } from '@/components/ui/matchday-clock-header';
import { Layout } from '@/theme/tokens';
import type { Match } from '@/types/match';

type UserMatchFocusScreenProps = {
  match: Match;
  scheduledDateLabel: string;
  scheduledTimeLabel: string;
  stageLabel: string;
  opponentSummary?: string | null;
  isKnockout?: boolean;
  embedded?: boolean;
  onSubmitPrediction: (homeGoals: number, awayGoals: number) => void;
};

export function UserMatchFocusScreen({
  match,
  scheduledDateLabel,
  scheduledTimeLabel,
  stageLabel,
  opponentSummary = null,
  isKnockout = false,
  embedded = false,
  onSubmitPrediction,
}: UserMatchFocusScreenProps) {
  const content = (
    <>
      <MatchdayClockHeader
        dateLabel={scheduledDateLabel}
        timeLabel={scheduledTimeLabel}
        stageLabel={stageLabel}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.body}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}>
          <MatchCard
            match={match}
            status="your-match"
            homeScore={null}
            awayScore={null}
            isUserMatch
            showPrediction={!isKnockout}
            isKnockout={isKnockout}
            onSubmitPrediction={onSubmitPrediction}
          />

          {opponentSummary ? (
            <ThemedText type="footnote" themeColor="textSecondary" style={styles.opponentSummary}>
              {opponentSummary}
            </ThemedText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedContainer}>{content}</View>;
  }

  return <IosScreen contentStyle={styles.container}>{content}</IosScreen>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  embeddedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  keyboardAvoider: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: Layout.groupedHorizontal,
    paddingTop: 8,
    paddingBottom: 160,
  },
  opponentSummary: {
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
