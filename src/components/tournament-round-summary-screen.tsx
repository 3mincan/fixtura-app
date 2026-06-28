import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ChampionRevealCard } from '@/components/champion-reveal-card';
import { GroupStandingsSummary } from '@/components/group-standings-table';
import { KnockoutResultCard } from '@/components/knockout-result-card';
import { ThemedText } from '@/components/themed-text';
import { IosButton } from '@/components/ui/ios-button';
import { IosScreen } from '@/components/ui/ios-screen';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { Layout, Radii } from '@/theme/tokens';
import type { KnockoutBracketMatchView } from '@/utils/knockout-bracket-view';
import type { Standing } from '@/types/standing';

type TournamentRoundSummaryScreenProps = {
  roundLabel: string;
  rounds: {
    roundName: string;
    matches: KnockoutBracketMatchView[];
  }[];
  userTeamAdvanced: boolean;
  showNextRoundButton: boolean;
  congratsMessage?: string;
  groupStandings?: Record<string, Standing[]>;
  selectedTeamId?: string | null;
  championId?: string | null;
  requireResultsBeforeContinue?: boolean;
  onContinue: () => void;
};

export function TournamentRoundSummaryScreen({
  roundLabel,
  rounds,
  userTeamAdvanced,
  showNextRoundButton,
  congratsMessage,
  groupStandings,
  selectedTeamId = null,
  championId = null,
  requireResultsBeforeContinue = false,
  onContinue,
}: TournamentRoundSummaryScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [heroDismissed, setHeroDismissed] = useState(false);
  const showGroupStandingsOnly = heroDismissed && groupStandings !== undefined;

  return (
    <IosScreen contentStyle={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          !heroDismissed && styles.scrollContentHero,
          showGroupStandingsOnly && styles.scrollContentExpanded,
        ]}
        showsVerticalScrollIndicator={false}>
        {!heroDismissed ? (
          <View style={styles.heroContainer}>
            <View style={[styles.heroCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="captionBold" themeColor="textSecondary" style={styles.heroEyebrow}>
                {(roundLabel || t('knockoutStage')).toUpperCase()}
              </ThemedText>
              <ThemedText type="largeTitle" style={styles.heroTitle}>
                {t('roundComplete')}
              </ThemedText>
              {userTeamAdvanced && congratsMessage ? (
                <ThemedText type="subheadline" style={[styles.congrats, { color: theme.success }]}>
                  {congratsMessage}
                </ThemedText>
              ) : null}
            </View>

            <Pressable
              onPress={() => setHeroDismissed(true)}
              style={({ pressed }) => [styles.expandButton, pressed && styles.expandButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('showGroupStandings')}>
              <SymbolView
                name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                size={22}
                weight="semibold"
                tintColor={theme.accent}
              />
              <ThemedText type="subheadline" style={{ color: theme.accent }}>
                {groupStandings ? t('showGroupStandings') : t('viewResults')}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {showGroupStandingsOnly ? (
          <View style={styles.standingsSection}>
            <GroupStandingsSummary
              groupStandings={groupStandings}
              selectedTeamId={selectedTeamId}
            />
          </View>
        ) : null}

        {heroDismissed && !groupStandings ? (
          <View style={styles.resultsSection}>
            {rounds.map((round) => (
              <View key={round.roundName} style={styles.roundBlock}>
                <ThemedText type="captionBold" themeColor="textSecondary" style={styles.roundTitle}>
                  {round.roundName.toUpperCase()}
                </ThemedText>
                {round.matches.map((match) => (
                  <KnockoutResultCard key={match.id} match={match} />
                ))}
              </View>
            ))}

            {championId ? (
              <View style={styles.championBlock}>
                <ChampionRevealCard teamId={championId} title={t('champion')} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <IosButton
          label={showNextRoundButton ? t('nextRound') : t('continue')}
          onPress={() => {
            if (requireResultsBeforeContinue && !heroDismissed) {
              setHeroDismissed(true);
              return;
            }

            onContinue();
          }}
        />
      </View>
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  scrollContentHero: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollContentExpanded: {
    flexGrow: 1,
    paddingTop: 8,
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Layout.groupedHorizontal,
    gap: 20,
    paddingVertical: 32,
  },
  heroCard: {
    borderRadius: Radii.grouped,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  heroEyebrow: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    textAlign: 'center',
  },
  congrats: {
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  expandButton: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  expandButtonPressed: {
    opacity: 0.55,
  },
  standingsSection: {
    paddingTop: 8,
    paddingHorizontal: Layout.groupedHorizontal,
  },
  resultsSection: {
    paddingHorizontal: Layout.groupedHorizontal,
    gap: 8,
    paddingTop: 8,
  },
  roundBlock: {
    gap: 4,
    marginBottom: 8,
  },
  roundTitle: {
    letterSpacing: 0.4,
    marginLeft: 4,
    marginBottom: 4,
  },
  championBlock: {
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: Layout.groupedHorizontal,
    paddingBottom: 16,
    paddingTop: 8,
  },
});
