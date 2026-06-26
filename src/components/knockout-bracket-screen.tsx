import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ChampionRevealCard } from '@/components/champion-reveal-card';
import { KnockoutResultCard } from '@/components/knockout-result-card';
import { NoTeamState } from '@/components/no-team-state';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { teams } from '@/data/teams';
import { useTranslation } from '@/hooks/use-translation';
import { useTournamentStore } from '@/store/tournament-store';
import { Layout } from '@/theme/tokens';
import { getKnockoutBracketView } from '@/utils/knockout-bracket-view';
import type { TournamentJourneyPhase } from '@/simulation/tournament-journey';

function getBracketStatusMessage(
  phase: TournamentJourneyPhase,
  t: (key: 'championSubtitle' | 'tournamentOverDescription' | 'groupStageCompleteDescription' | 'knockoutBracketStatusInProgress') => string,
): string | null {
  switch (phase) {
    case 'champion':
      return t('championSubtitle');
    case 'eliminated':
      return t('tournamentOverDescription');
    case 'not-qualified':
      return t('groupStageCompleteDescription');
    case 'knockout':
      return t('knockoutBracketStatusInProgress');
    default:
      return null;
  }
}

export function KnockoutBracketScreen() {
  const { t } = useTranslation();
  const selectedTeamId = useTournamentStore((state) => state.selectedTeamId);
  const userPredictions = useTournamentStore((state) => state.userPredictions);
  const tournamentPhase = useTournamentStore((state) => state.tournamentPhase);
  const knockoutRoundResults = useTournamentStore((state) => state.knockoutRoundResults);
  const championId = useTournamentStore((state) => state.championId);

  const bracket = useMemo(
    () =>
      getKnockoutBracketView({
        selectedTeamId,
        teamList: teams,
        userPredictions,
        tournamentPhase,
        knockoutRoundResults,
        championId,
      }),
    [selectedTeamId, userPredictions, tournamentPhase, knockoutRoundResults, championId],
  );

  if (!selectedTeamId) {
    return (
      <ScreenContainer largeTitle={t('tournamentBracket')}>
        <NoTeamState />
      </ScreenContainer>
    );
  }

  if (!bracket) {
    return (
      <ScreenContainer largeTitle={t('tournamentBracket')}>
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.emptyMessage}>
          {t('knockoutBracketGroupIncomplete')}
        </ThemedText>
      </ScreenContainer>
    );
  }

  const statusMessage = getBracketStatusMessage(tournamentPhase, t);

  return (
    <ScreenContainer largeTitle={t('tournamentBracket')}>
      {statusMessage ? (
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.statusMessage}>
          {statusMessage}
        </ThemedText>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {bracket.rounds.map((round) => (
          <View key={round.round} style={styles.roundBlock}>
            <ThemedText type="captionBold" themeColor="textSecondary" style={styles.roundTitle}>
              {round.roundName.toUpperCase()}
            </ThemedText>
            {round.matches.map((match) => (
              <KnockoutResultCard key={match.id} match={match} />
            ))}
          </View>
        ))}

        {bracket.championId ? (
          <View style={styles.championBlock}>
            <ChampionRevealCard teamId={bracket.championId} title={t('champion')} />
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyMessage: {
    lineHeight: 18,
  },
  statusMessage: {
    lineHeight: 18,
    marginBottom: 4,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 8,
  },
  roundBlock: {
    gap: 4,
    marginBottom: 8,
  },
  roundTitle: {
    letterSpacing: 0.4,
    marginLeft: Layout.groupedHorizontal,
    marginBottom: 4,
  },
  championBlock: {
    marginTop: 8,
    paddingHorizontal: Layout.groupedHorizontal,
  },
});
