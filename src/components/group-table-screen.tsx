import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { NoTeamState } from '@/components/no-team-state';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { GroupedSection } from '@/components/ui/grouped-section';
import { teams, teamsById } from '@/data/teams';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/hooks/use-theme';
import { useTournamentStore } from '@/store/tournament-store';
import { formatGoalDifference, groupTableStyles } from '@/components/group-table-styles';
import { getGroupTable, type GroupTableRow } from '@/utils/group-standings';

const TABLE_COLUMNS = [
  { key: 'position', label: 'Pos' },
  { key: 'team', label: 'Team' },
  { key: 'played', label: 'P' },
  { key: 'won', label: 'W' },
  { key: 'drawn', label: 'D' },
  { key: 'lost', label: 'L' },
  { key: 'goalsFor', label: 'GF' },
  { key: 'goalsAgainst', label: 'GA' },
  { key: 'goalDifference', label: 'GD' },
  { key: 'points', label: 'Pts' },
] as const;

function GroupTableRowView({
  row,
  isSelectedTeam,
  isQualified,
  isLast,
}: {
  row: GroupTableRow;
  isSelectedTeam: boolean;
  isQualified: boolean;
  isLast: boolean;
}) {
  const theme = useTheme();
  const team = teamsById[row.teamId];

  return (
    <>
      <View
        style={[
          groupTableStyles.tableRow,
          isSelectedTeam && { backgroundColor: theme.backgroundSelected },
          isQualified && {
            borderLeftWidth: 3,
            borderLeftColor: theme.success,
          },
        ]}>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tablePositionCell]} type="caption">
          {row.position}
        </ThemedText>
        <ThemedText
          style={[groupTableStyles.tableCell, groupTableStyles.tableTeamCell]}
          type="captionBold"
          numberOfLines={1}>
          {team.flagEmoji} {team.shortName}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.played}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.won}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.drawn}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {row.lost}
        </ThemedText>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tableGoalsCell]} type="caption">
          {row.goalsFor}
        </ThemedText>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tableGoalsCell]} type="caption">
          {row.goalsAgainst}
        </ThemedText>
        <ThemedText style={groupTableStyles.tableCell} type="caption">
          {formatGoalDifference(row.goalDifference)}
        </ThemedText>
        <ThemedText style={[groupTableStyles.tableCell, groupTableStyles.tablePointsCell]} type="captionBold">
          {row.points}
        </ThemedText>
      </View>
      {!isLast ? (
        <View style={[groupTableStyles.separator, { backgroundColor: theme.separator }]} />
      ) : null}
    </>
  );
}

export function GroupTableScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const selectedTeamId = useTournamentStore((state) => state.selectedTeamId);
  const userPredictions = useTournamentStore((state) => state.userPredictions);
  const completedMatches = useTournamentStore((state) => state.completedMatches);
  const groupStandings = useTournamentStore((state) => state.groupStandings);
  const startMode = useTournamentStore((state) => state.startMode);
  const useOfficialResults = startMode === 'today';

  const table = useMemo(
    () =>
      getGroupTable({
        selectedTeamId,
        teamList: teams,
        userPredictions,
        completedMatches,
        groupStandings,
        useOfficialResults,
      }),
    [selectedTeamId, userPredictions, completedMatches, groupStandings, useOfficialResults],
  );

  if (!table) {
    return (
      <ScreenContainer largeTitle={t('groupTableTitle')}>
        <NoTeamState />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer largeTitle={t('groupTableGroupTitle', { groupId: table.groupId })}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <GroupedSection title={t('groupStandingsTitle')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={groupTableStyles.table}>
              <View style={[groupTableStyles.tableHeaderRow, { borderBottomColor: theme.separator }]}>
                {TABLE_COLUMNS.map((column) => (
                  <ThemedText
                    key={column.key}
                    type="captionBold"
                    themeColor="textSecondary"
                    style={[
                      groupTableStyles.tableCell,
                      groupTableStyles.tableHeaderCell,
                      column.key === 'team' && groupTableStyles.tableTeamCell,
                      column.key === 'position' && groupTableStyles.tablePositionCell,
                      column.key === 'points' && groupTableStyles.tablePointsCell,
                      (column.key === 'goalsFor' || column.key === 'goalsAgainst') &&
                        groupTableStyles.tableGoalsCell,
                    ]}>
                    {column.label}
                  </ThemedText>
                ))}
              </View>

              {table.rows.map((row, index) => (
                <GroupTableRowView
                  key={row.teamId}
                  row={row}
                  isSelectedTeam={row.teamId === selectedTeamId}
                  isQualified={row.position <= 2}
                  isLast={index === table.rows.length - 1}
                />
              ))}
            </View>
          </ScrollView>
        </GroupedSection>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
});
