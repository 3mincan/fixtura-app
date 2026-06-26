import { View } from 'react-native';

import {
  MatchCardFace,
  MatchCardStatusBadge,
  matchCardUiStyles,
} from '@/components/match-card-ui';
import { MatchCardTeamBackground } from '@/components/team-color-glow';
import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { formatTickerDate, formatTickerTime } from '@/utils/matchday-board';
import {
  getKnockoutScoreDetail,
  parseKnockoutDisplayScore,
  type KnockoutBracketMatchView,
} from '@/utils/knockout-bracket-view';

type KnockoutResultCardProps = {
  match: KnockoutBracketMatchView;
};

export function KnockoutResultCard({ match }: KnockoutResultCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const displayScore = parseKnockoutDisplayScore(match.score);
  const scoreDetail = getKnockoutScoreDetail(match.score);
  const homeWon = match.winnerTeamId === match.homeTeamId;
  const awayWon = match.winnerTeamId === match.awayTeamId;
  const isFinished = Boolean(displayScore);
  const kickoffTime = match.scheduledTime?.split(' ')[0] ?? '';
  const scheduleLabel =
    match.scheduledDate && kickoffTime
      ? t('matchSchedule', {
          date: formatTickerDate(match.scheduledDate),
          time: formatTickerTime(match.scheduledTime),
        })
      : null;

  return (
    <View style={matchCardUiStyles.cardShell}>
      <MatchCardTeamBackground
        homeTeamId={match.homeTeamId}
        awayTeamId={match.awayTeamId}
        cardColor={theme.backgroundElement}
        style={[
          matchCardUiStyles.card,
          { backgroundColor: theme.backgroundElement },
          isFinished
            ? { borderLeftColor: theme.success }
            : matchCardUiStyles.noAccent,
        ]}>
        <View style={matchCardUiStyles.cardContent}>
          <View style={matchCardUiStyles.statusRow}>
            <MatchCardStatusBadge
              label={isFinished ? t('fullTime') : t('upcoming')}
              variant={isFinished ? 'finished' : 'upcoming'}
              theme={theme}
            />
            {scheduleLabel ? (
              <ThemedText type="caption" themeColor="textDim" style={{ flexShrink: 1, textAlign: 'right' }}>
                {scheduleLabel}
              </ThemedText>
            ) : null}
          </View>

          <MatchCardFace
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            homeScore={displayScore?.home ?? null}
            awayScore={displayScore?.away ?? null}
            homeWon={homeWon}
            awayWon={awayWon}
            showVsWhenNoScore
            scoreDetail={scoreDetail}
            theme={theme}
          />
        </View>
      </MatchCardTeamBackground>
    </View>
  );
}
